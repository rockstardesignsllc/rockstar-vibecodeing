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

/**
 * The newest call messages in the sub-account, newest first. HighLevel serves this route under both API versions and
 * has answered with an empty list under one of them, so an empty answer is asked again under the other.
 */
export async function recentCalls(dealer: Dealer, limit = 100): Promise<CallMessage[]> {
	const query = new URLSearchParams({ locationId: dealer.location_id, channel: 'Call', limit: String(limit), sortBy: 'createdAt', sortOrder: 'desc' });
	for (const version of [VERSION, CONVERSATIONS_VERSION]) {
		const result = await request(dealer, 'GET', `/conversations/messages/export?${query}`, version);
		const calls = isRecord(result) && Array.isArray(result.messages) ? result.messages.filter(isCall) : [];
		if (calls.length > 0) return calls;
	}
	return [];
}

/** One call message by id, or nothing when it does not exist or is not a call. */
export async function callMessage(dealer: Dealer, messageId: string): Promise<CallMessage | undefined> {
	try {
		const result = await request(dealer, 'GET', `/conversations/messages/${messageId}`, CONVERSATIONS_VERSION);
		const message = isRecord(result) && isRecord(result.message) ? result.message : result;
		return isCall(message) && isRecord(message) && message.messageType === 'TYPE_CALL' ? message : undefined;
	} catch (error) {
		if (error instanceof HighLevelError && (error.status === 404 || error.status === 400)) return undefined;
		throw error;
	}
}

/** The call's transcript, or an empty list while HighLevel has not produced one. */
export async function transcription(dealer: Dealer, messageId: string): Promise<TranscriptSentence[]> {
	try {
		const result = await request(dealer, 'GET', `/conversations/messages/${messageId}/locations/${dealer.location_id}/transcription`, CONVERSATIONS_VERSION);
		return Array.isArray(result) ? result.filter(isRecord) : [];
	} catch (error) {
		if (error instanceof HighLevelError && (error.status === 404 || error.status === 400)) return [];
		throw error;
	}
}

/** The call recording, streamed straight from HighLevel. */
export const recording = (dealer: Dealer, messageId: string): Promise<Response> =>
	fetch(`${API}/conversations/messages/${messageId}/locations/${dealer.location_id}/recording`, { headers: headers(dealer, CONVERSATIONS_VERSION) });

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
