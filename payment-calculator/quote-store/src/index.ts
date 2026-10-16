/**
 * Rockstar Deal Desk quote store.
 *
 * The dealer and customer pages POST the same form fields they send to the HighLevel webhook.
 * Each quote is saved to R2 as <dealer-slug>/<quote_name>.json, where quote_name is
 * MM-DD-YYYY-FirstName-LastName-StockNumber-Make-Model. A later save of the same quote name replaces it,
 * so the file always holds the newest version of that deal. The bucket's lifecycle rule deletes
 * every object 90 days after it was last written (see README.md).
 */

interface R2PutOptions {
	httpMetadata?: { contentType?: string };
	customMetadata?: Record<string, string>;
}

interface R2BucketLike {
	put(key: string, value: string, options?: R2PutOptions): Promise<unknown>;
}

export interface Env {
	QUOTES: R2BucketLike;
	ALLOWED_ORIGINS: string;
}

const MAX_BODY_BYTES = 32 * 1024;
const QUOTE_NAME = /^\d{2}-\d{2}-\d{4}(-[A-Za-z0-9]+)*$/;
const QUOTE_ID = /^Q[A-Z0-9]{4,12}$/;
const SAVED_EVENTS = new Set(['quote_created', 'quote_printed', 'quote_requested', 'lease_requested']);

export const slug = (s: string): string =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'unknown-dealer';

const allowedOrigin = (env: Env, origin: string | null): string | null => {
	if (!origin) return null;
	const list = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
	return list.includes(origin) ? origin : null;
};

const reply = (status: number, body: string, origin: string | null): Response =>
	new Response(body, {
		status,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {})
		}
	});

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = allowedOrigin(env, request.headers.get('origin'));
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			if (!origin) return reply(403, 'origin not allowed', null);
			return new Response(null, {
				status: 204,
				headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-max-age': '86400', vary: 'Origin' }
			});
		}
		if (url.pathname !== '/quotes') return reply(404, 'not found', origin);
		if (request.method !== 'POST') return reply(405, 'method not allowed', origin);
		if (!origin) return reply(403, 'origin not allowed', null);

		const length = Number(request.headers.get('content-length') || '0');
		if (length > MAX_BODY_BYTES) return reply(413, 'too large', origin);
		const text = await request.text();
		if (text.length > MAX_BODY_BYTES) return reply(413, 'too large', origin);

		const fields = Object.fromEntries(new URLSearchParams(text));
		const name = fields.quote_name || '';
		if (!SAVED_EVENTS.has(fields.event || '')) return reply(200, 'not saved', origin);
		if (!QUOTE_NAME.test(name) || !QUOTE_ID.test(fields.quote_id || '')) return reply(400, 'invalid quote', origin);

		const key = slug(fields.dealer || '') + '/' + name + '.json';
		const record = { ...fields, stored_at: new Date().toISOString() };
		await env.QUOTES.put(key, JSON.stringify(record, null, 2), {
			httpMetadata: { contentType: 'application/json' },
			customMetadata: { quote_id: fields.quote_id, event: fields.event }
		});
		return reply(201, key, origin);
	}
};
