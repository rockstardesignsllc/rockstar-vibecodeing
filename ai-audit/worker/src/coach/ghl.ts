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

const PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 12;

interface CallPage {
	calls: CallMessage[];
	cursor: string;
}

async function callPage(dealer: Dealer, cursor = ''): Promise<CallPage> {
	const query = new URLSearchParams({ locationId: dealer.location_id, channel: 'Call', limit: String(PAGE_SIZE), sortBy: 'createdAt', sortOrder: 'desc' });
	if (cursor) query.set('cursor', cursor);
	const result = await request(dealer, 'GET', `/conversations/messages/export?${query}`, VERSION);
	const page = isRecord(result) ? result : {};
	return { calls: Array.isArray(page.messages) ? page.messages.filter(isCall) : [], cursor: str(page.nextCursor) };
}

/** The newest call messages in the sub-account, newest first whatever order HighLevel answers in. */
export async function recentCalls(dealer: Dealer): Promise<CallMessage[]> {
	const { calls } = await callPage(dealer);
	return calls.sort((x, y) => Date.parse(y.dateAdded) - Date.parse(x.dateAdded));
}

export interface CallSearch {
	call?: CallMessage;
	looked_at: number;
	newest: string;
	oldest: string;
}

/**
 * Finds one call by its message id by paging through the sub-account's calls. HighLevel refuses the single-message
 * read to Private Integration tokens, so the export list is the only way to reach a call without its contact.
 */
export async function findCall(dealer: Dealer, messageId: string): Promise<CallSearch> {
	const search: CallSearch = { looked_at: 0, newest: '', oldest: '' };
	let cursor = '';
	for (let page = 0; page < MAX_SEARCH_PAGES; page++) {
		const result = await callPage(dealer, cursor);
		for (const call of result.calls) {
			search.looked_at++;
			if (!search.newest || call.dateAdded > search.newest) search.newest = call.dateAdded;
			if (!search.oldest || call.dateAdded < search.oldest) search.oldest = call.dateAdded;
			if (call.id === messageId) return { ...search, call };
		}
		if (!result.cursor || result.calls.length === 0) break;
		cursor = result.cursor;
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
	const path = `/conversations/messages/${messageId}/locations/${dealer.location_id}/transcription`;
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
