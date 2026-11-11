import { HighLevelError } from '../highlevel';
import type { CallMessage, DealerConfig, TranscriptSentence } from './types';

const API = 'https://services.leadconnectorhq.com';
const VERSION = '2021-07-28';
const CONVERSATIONS_VERSION = '2021-04-15';
const MAX_NOTE_CHARS = 60000;

type Dealer = Pick<DealerConfig, 'token' | 'location_id'>;

const headers = (dealer: Dealer, version: string): Record<string, string> => ({
	authorization: `Bearer ${dealer.token}`,
	version,
	accept: 'application/json'
});

async function request(dealer: Dealer, method: 'GET' | 'POST', path: string, version: string, body?: object): Promise<unknown> {
	const response = await fetch(API + path, {
		method,
		headers: { ...headers(dealer, version), ...(body ? { 'content-type': 'application/json' } : {}) },
		...(body ? { body: JSON.stringify(body) } : {})
	});
	const text = await response.text();
	if (!response.ok) throw new HighLevelError(response.status, `HighLevel ${method} ${path.split('?')[0]} answered ${response.status}: ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : {};
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const isCall = (m: unknown): m is CallMessage => isRecord(m) && typeof m.id === 'string' && typeof m.dateAdded === 'string';

const PAGE_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 1;
const MAX_RECENT_PAGES = 4;
/** How far back, in days, each pass of a call search reaches. A search stops at the first pass that finds the call. */
const SEARCH_REACH_DAYS = [2, 7, 30, 90];
const MAX_SEARCH_PAGES = 20;

interface CallPage {
	calls: CallMessage[];
	cursor: string;
}

interface CallWindow {
	start: number;
	end: number;
}

/**
 * One page of the sub-account's calls. HighLevel does not reliably answer newest first, so callers that need recent
 * calls pass a date window instead of trusting the order.
 */
async function callPage(dealer: Dealer, window?: CallWindow, cursor = ''): Promise<CallPage> {
	const query = new URLSearchParams({ locationId: dealer.location_id, channel: 'Call', limit: String(PAGE_SIZE), sortBy: 'createdAt', sortOrder: 'desc' });
	if (window) {
		query.set('startDate', new Date(window.start).toISOString());
		query.set('endDate', new Date(window.end).toISOString());
	}
	if (cursor) query.set('cursor', cursor);
	const result = await request(dealer, 'GET', `/conversations/messages/export?${query}`, VERSION);
	const page = isRecord(result) ? result : {};
	return { calls: Array.isArray(page.messages) ? page.messages.filter(isCall) : [], cursor: str(page.nextCursor) };
}

/** Every call in a date window, up to a page budget. Returns the calls and how many pages were read. */
async function callsIn(dealer: Dealer, window: CallWindow, maxPages: number): Promise<{ calls: CallMessage[]; pages: number }> {
	const calls: CallMessage[] = [];
	let cursor = '';
	let pages = 0;
	while (pages < maxPages) {
		const result = await callPage(dealer, window, cursor);
		pages++;
		calls.push(...result.calls);
		if (!result.cursor || result.calls.length === 0) break;
		cursor = result.cursor;
	}
	return { calls, pages };
}

/** The last day of call messages in the sub-account, newest first. */
export async function recentCalls(dealer: Dealer): Promise<CallMessage[]> {
	const now = Date.now();
	const { calls } = await callsIn(dealer, { start: now - RECENT_DAYS * DAY_MS, end: now }, MAX_RECENT_PAGES);
	return calls.sort((x, y) => Date.parse(y.dateAdded) - Date.parse(x.dateAdded));
}

/**
 * True when the token's call list belongs to another sub-account. HighLevel answers the call list for the sub-account
 * the token was created in, whatever location id is asked for, so a token from the wrong sub-account reads the wrong calls.
 */
export async function readsAnotherLocation(dealer: Dealer): Promise<boolean> {
	const { calls } = await callPage(dealer);
	return calls.some(call => call.locationId !== undefined && call.locationId !== dealer.location_id);
}

export interface CallSearch {
	call?: CallMessage;
	looked_at: number;
	newest: string;
	oldest: string;
}

const isAnsweredInbound = (call: CallMessage): boolean => call.direction === 'inbound' && call.status === 'completed';

/** The call a conversation id most likely means: its longest answered inbound call, else its longest call. */
const bestOf = (calls: CallMessage[]): CallMessage | undefined => {
	const pool = calls.some(isAnsweredInbound) ? calls.filter(isAnsweredInbound) : calls;
	return [...pool].sort((x, y) => (y.meta?.call?.duration ?? 0) - (x.meta?.call?.duration ?? 0))[0];
};

/**
 * Finds one call by its message id, or the best call of a conversation by the conversation id, by reading the
 * sub-account's calls from the newest days backward. HighLevel refuses the single-message read to Private Integration
 * tokens, so the export list is the only way to reach a call without its contact.
 */
export async function findCall(dealer: Dealer, id: string): Promise<CallSearch> {
	const search: CallSearch = { looked_at: 0, newest: '', oldest: '' };
	const now = Date.now();
	let pagesLeft = MAX_SEARCH_PAGES;
	let end = now;
	for (const days of SEARCH_REACH_DAYS) {
		if (pagesLeft <= 0) break;
		const start = now - days * DAY_MS;
		const { calls, pages } = await callsIn(dealer, { start, end }, pagesLeft);
		pagesLeft -= pages;
		end = start;
		for (const call of calls) {
			search.looked_at++;
			if (!search.newest || call.dateAdded > search.newest) search.newest = call.dateAdded;
			if (!search.oldest || call.dateAdded < search.oldest) search.oldest = call.dateAdded;
		}
		const call = calls.find(c => c.id === id) ?? bestOf(calls.filter(c => c.conversationId === id));
		if (call) return { ...search, call };
	}
	return search;
}

const sentences = (result: unknown): TranscriptSentence[] => {
	if (Array.isArray(result)) return result.filter(isRecord);
	if (!isRecord(result)) return [];
	const nested = [result.transcription, result.transcript, result.data].find(Array.isArray);
	return Array.isArray(nested) ? nested.filter(isRecord) : [];
};

/**
 * The call's transcript, or an empty list when HighLevel has none (404). The route is asked under both API versions,
 * and any other refusal is thrown so a token or scope problem is reported instead of read as "no transcript".
 */
export async function transcription(dealer: Dealer, messageId: string): Promise<TranscriptSentence[]> {
	const path = `/conversations/locations/${dealer.location_id}/messages/${messageId}/transcription`;
	let refusal: HighLevelError | undefined;
	for (const version of [VERSION, CONVERSATIONS_VERSION]) {
		try {
			const found = sentences(await request(dealer, 'GET', path, version));
			if (found.length > 0) return found;
		} catch (error) {
			if (!(error instanceof HighLevelError)) throw error;
			if (error.status !== 404) refusal ??= error;
		}
	}
	if (refusal) throw refusal;
	return [];
}

/** The call recording, streamed straight from HighLevel. */
export const recording = (dealer: Dealer, messageId: string): Promise<Response> =>
	fetch(`${API}/conversations/messages/${messageId}/locations/${dealer.location_id}/recording`, { headers: headers(dealer, VERSION) });

export interface Person {
	id: string;
	first: string;
	last: string;
	email: string;
}

const person = (id: string, raw: unknown): Person => {
	const r = isRecord(raw) ? raw : {};
	const full = str(r.name);
	return {
		id,
		first: str(r.firstName) || full.split(' ')[0] || '',
		last: str(r.lastName) || full.split(' ').slice(1).join(' '),
		email: str(r.email)
	};
};

export async function contact(dealer: Dealer, contactId: string): Promise<Person> {
	const result = await request(dealer, 'GET', `/contacts/${contactId}`, VERSION);
	return person(contactId, isRecord(result) ? result.contact : undefined);
}

export async function user(dealer: Dealer, userId: string): Promise<Person> {
	return person(userId, await request(dealer, 'GET', `/users/${userId}`, VERSION));
}

/** Every user of the sub-account. */
export async function users(dealer: Dealer): Promise<Person[]> {
	const result = await request(dealer, 'GET', `/users/?${new URLSearchParams({ locationId: dealer.location_id })}`, VERSION);
	const found = isRecord(result) && Array.isArray(result.users) ? result.users : [];
	return found.filter(isRecord).map(u => person(str(u.id), u));
}

/**
 * The one user whose name matches the name a staff member gave on the call. A first name must match exactly, and a
 * last name narrows it when one was heard. Nobody is returned when the name fits no user or more than one.
 */
export function userNamed(people: Person[], heard: string): Person | undefined {
	const [first, ...rest] = heard.trim().toLowerCase().split(/\s+/);
	if (!first) return undefined;
	const last = rest.join(' ');
	const sameFirst = people.filter(p => p.first.toLowerCase() === first);
	const matches = last && sameFirst.some(p => p.last.toLowerCase() === last) ? sameFirst.filter(p => p.last.toLowerCase() === last) : sameFirst;
	return matches.length === 1 ? matches[0] : undefined;
}

export const addNote = (dealer: Dealer, contactId: string, body: string): Promise<unknown> =>
	request(dealer, 'POST', `/contacts/${contactId}/notes`, VERSION, { body: body.slice(0, MAX_NOTE_CHARS) });

/** HighLevel can only email a contact, so each email recipient gets a contact record. Returns its id. */
export async function contactForEmail(dealer: Dealer, email: string, first: string, last: string): Promise<string> {
	const query = new URLSearchParams({ locationId: dealer.location_id, email });
	const found = await request(dealer, 'GET', `/contacts/search/duplicate?${query}`, VERSION);
	if (isRecord(found) && isRecord(found.contact) && typeof found.contact.id === 'string') return found.contact.id;
	const created = await request(dealer, 'POST', '/contacts/', VERSION, {
		locationId: dealer.location_id,
		email,
		...(first ? { firstName: first } : {}),
		...(last ? { lastName: last } : {}),
		source: 'Rockstar Call Coach'
	});
	if (isRecord(created) && isRecord(created.contact) && typeof created.contact.id === 'string') return created.contact.id;
	throw new HighLevelError(502, 'HighLevel returned no contact id for an email recipient');
}

export const sendEmail = (dealer: Dealer, contactId: string, subject: string, html: string, cc: string[]): Promise<unknown> =>
	request(dealer, 'POST', '/conversations/messages', CONVERSATIONS_VERSION, {
		type: 'Email',
		contactId,
		subject,
		html,
		...(cc.length ? { emailCc: cc } : {})
	});

/** Confirms the token works for this sub-account and returns the sub-account's name and timezone. */
export async function location(dealer: Dealer): Promise<{ name: string; timezone: string }> {
	const result = await request(dealer, 'GET', `/locations/${dealer.location_id}`, VERSION);
	const loc = isRecord(result) && isRecord(result.location) ? result.location : {};
	return { name: str(loc.name), timezone: str(loc.timezone) };
}
