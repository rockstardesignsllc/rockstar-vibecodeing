/**
 * Rockstar Deal Desk quote store.
 *
 * The dealer and customer pages POST the same form fields they send to the HighLevel webhook.
 * Each quote is saved to R2 as <dealer-slug>/<quote_name>.json, where quote_name is
 * MM-DD-YYYY-FirstName-LastName-StockNumber-Make-Model. A later save of the same quote name replaces it,
 * so the file always holds the newest version of that deal. The bucket's lifecycle rule deletes
 * every object 90 days after it was last written (see README.md).
 *
 * The saved quotes page reads a dealer's quotes back with an access code sent in the x-access-code header:
 *   GET /quotes?dealer=<dealer name>                lists that dealer's quotes, newest first
 *   GET /quotes/<quote_name>?dealer=<dealer name>   returns one full quote
 * A dealer's access code is derived from QUOTE_ADMIN_SECRET and the dealer slug, so no list of codes is kept.
 * QUOTE_ADMIN_SECRET itself is the admin code: it opens every dealer and unlocks
 *   GET /dealers                                    lists every dealer folder
 *   GET /access-code?dealer=<dealer name>           returns that dealer's access code
 *
 * A dealer who forgot their code asks for it from the dealer page:
 *   POST /access-code/email  (form fields dealer, email, saved_quotes_path)
 * The Worker posts the dealer's code and the typed email to the CODE_EMAIL_WEBHOOK secret, a HighLevel inbound
 * webhook whose workflow emails the code. One request per dealer is sent every CODE_EMAIL_INTERVAL_MS.
 */

interface R2PutOptions {
	httpMetadata?: { contentType?: string };
	customMetadata?: Record<string, string>;
}

interface R2ListOptions {
	prefix?: string;
	delimiter?: string;
	cursor?: string;
	include?: Array<'httpMetadata' | 'customMetadata'>;
}

interface R2ObjectLike {
	key: string;
	uploaded: Date;
	customMetadata?: Record<string, string>;
}

interface R2ObjectBodyLike extends R2ObjectLike {
	text(): Promise<string>;
}

type R2ListResult = { objects: R2ObjectLike[]; delimitedPrefixes: string[] } & ({ truncated: true; cursor: string } | { truncated: false });

interface R2BucketLike {
	put(key: string, value: string, options?: R2PutOptions): Promise<unknown>;
	get(key: string): Promise<R2ObjectBodyLike | null>;
	head(key: string): Promise<R2ObjectLike | null>;
	list(options?: R2ListOptions): Promise<R2ListResult>;
}

export interface Env {
	QUOTES: R2BucketLike;
	ALLOWED_ORIGINS: string;
	QUOTE_ADMIN_SECRET: string;
	CODE_EMAIL_WEBHOOK?: string;
}

type Fields = Record<string, string>;

interface QuoteSummary {
	quote_name: string;
	saved_at: string;
	quote_id: string;
	event: string;
	quote_date: string;
	customer_name: string;
	customer_phone: string;
	vehicle: string;
	stock: string;
	deal_type: string;
	deal_term: string;
	deal_monthly_payment: string;
	salesperson: string;
}

const MAX_BODY_BYTES = 32 * 1024;
const MAX_LIST_PAGES = 10;
const QUOTE_NAME = /^\d{2}-\d{2}-\d{4}(-[A-Za-z0-9]+)*$/;
const QUOTE_ID = /^Q[A-Z0-9]{4,12}$/;
const SAVED_EVENTS = new Set(['quote_created', 'quote_printed', 'quote_requested', 'lease_requested']);
/* the R2 custom metadata kept with each quote so a dealer's list needs no per-quote reads (R2 caps it at 2 KB) */
const SUMMARY_FIELDS = ['quote_id', 'event', 'quote_date', 'customer_name', 'customer_phone', 'vehicle', 'stock', 'deal_type',
	'deal_term', 'deal_monthly_payment', 'salesperson'] as const;
const SUMMARY_FIELD_CHARS = 100;
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_BYTES = 10;
/* service records live under a prefix no dealer slug can start with, so they never show up as a dealer folder */
const SERVICE_PREFIX = '_service/';
const CODE_EMAIL_INTERVAL_MS = 5 * 60 * 1000;
const MAX_FORM_BYTES = 2 * 1024;
const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const SAVED_PATH = /^\/[A-Za-z0-9/_-]{0,100}$/;

export const slug = (s: string): string =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'unknown-dealer';

const allowedOrigin = (env: Env, origin: string | null): string | null => {
	if (!origin) return null;
	const list = env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
	return list.includes(origin) ? origin : null;
};

const corsHeaders = (origin: string | null): Record<string, string> =>
	origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {};

const reply = (status: number, body: string, origin: string | null): Response =>
	new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...corsHeaders(origin) } });

const json = (body: unknown, origin: string | null): Response =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders(origin) }
	});

const normalizeCode = (code: string): string => code.toUpperCase().replace(/[^0-9A-Z]/g, '');

/** Crockford base32 of the first CODE_BYTES bytes of HMAC-SHA256(secret, dealer slug), grouped as XXXX-XXXX-XXXX-XXXX. */
export async function accessCode(secret: string, dealerSlug: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(dealerSlug))).slice(0, CODE_BYTES);
	let bits = 0;
	let value = 0;
	let out = '';
	for (const byte of mac) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += CODE_ALPHABET[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	return out.match(/.{1,4}/g)?.join('-') ?? out;
}

const sameText = (a: string, b: string): boolean => {
	const x = new TextEncoder().encode(a);
	const y = new TextEncoder().encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
};

const isAdmin = (env: Env, code: string): boolean => code !== '' && sameText(code, normalizeCode(env.QUOTE_ADMIN_SECRET));

async function canRead(env: Env, request: Request, dealerSlug: string): Promise<boolean> {
	const code = normalizeCode(request.headers.get('x-access-code') || '');
	if (!code || !env.QUOTE_ADMIN_SECRET) return false;
	return isAdmin(env, code) || sameText(code, normalizeCode(await accessCode(env.QUOTE_ADMIN_SECRET, dealerSlug)));
}

const summaryMetadata = (fields: Fields): Record<string, string> =>
	Object.fromEntries(SUMMARY_FIELDS.map(f => [f, (fields[f] || '').slice(0, SUMMARY_FIELD_CHARS)]));

const toSummary = (object: R2ObjectLike, prefix: string): QuoteSummary => {
	const meta = object.customMetadata || {};
	const pick = (f: (typeof SUMMARY_FIELDS)[number]): string => meta[f] || '';
	return {
		quote_name: object.key.slice(prefix.length).replace(/\.json$/, ''),
		saved_at: object.uploaded.toISOString(),
		quote_id: pick('quote_id'), event: pick('event'), quote_date: pick('quote_date'),
		customer_name: pick('customer_name'), customer_phone: pick('customer_phone'), vehicle: pick('vehicle'), stock: pick('stock'),
		deal_type: pick('deal_type'), deal_term: pick('deal_term'), deal_monthly_payment: pick('deal_monthly_payment'),
		salesperson: pick('salesperson')
	};
};

async function listAll(env: Env, options: R2ListOptions): Promise<{ objects: R2ObjectLike[]; prefixes: string[] }> {
	const objects: R2ObjectLike[] = [];
	const prefixes: string[] = [];
	let cursor: string | undefined;
	for (let page = 0; page < MAX_LIST_PAGES; page++) {
		const result = await env.QUOTES.list({ ...options, cursor });
		objects.push(...result.objects);
		prefixes.push(...result.delimitedPrefixes);
		if (!result.truncated) break;
		cursor = result.cursor;
	}
	return { objects, prefixes };
}

async function saveQuote(request: Request, env: Env, origin: string | null): Promise<Response> {
	if (!origin) return reply(403, 'origin not allowed', null);
	const length = Number(request.headers.get('content-length') || '0');
	if (length > MAX_BODY_BYTES) return reply(413, 'too large', origin);
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) return reply(413, 'too large', origin);

	const fields: Fields = Object.fromEntries(new URLSearchParams(text));
	const name = fields.quote_name || '';
	if (!SAVED_EVENTS.has(fields.event || '')) return reply(200, 'not saved', origin);
	if (!QUOTE_NAME.test(name) || !QUOTE_ID.test(fields.quote_id || '')) return reply(400, 'invalid quote', origin);

	const key = slug(fields.dealer || '') + '/' + name + '.json';
	const record = { ...fields, stored_at: new Date().toISOString() };
	await env.QUOTES.put(key, JSON.stringify(record, null, 2), {
		httpMetadata: { contentType: 'application/json' },
		customMetadata: summaryMetadata(fields)
	});
	return reply(201, key, origin);
}

async function readQuotes(request: Request, env: Env, origin: string | null, url: URL): Promise<Response> {
	const dealer = slug(url.searchParams.get('dealer') || '');
	if (!(await canRead(env, request, dealer))) return reply(401, 'access code not valid for this dealer', origin);
	const prefix = dealer + '/';
	const name = decodeURIComponent(url.pathname.slice('/quotes/'.length));

	if (url.pathname === '/quotes') {
		const { objects } = await listAll(env, { prefix, include: ['customMetadata'] });
		const quotes = objects.map(o => toSummary(o, prefix)).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
		return json({ dealer, quotes }, origin);
	}
	if (!QUOTE_NAME.test(name)) return reply(404, 'not found', origin);
	const object = await env.QUOTES.get(prefix + name + '.json');
	if (!object) return reply(404, 'not found', origin);
	const record: Fields = JSON.parse(await object.text());
	return json(record, origin);
}

async function adminRoute(request: Request, env: Env, origin: string | null, url: URL): Promise<Response> {
	if (!env.QUOTE_ADMIN_SECRET || !isAdmin(env, normalizeCode(request.headers.get('x-access-code') || ''))) {
		return reply(401, 'admin code required', origin);
	}
	if (url.pathname === '/dealers') {
		const { prefixes } = await listAll(env, { delimiter: '/' });
		return json({ dealers: prefixes.filter(p => p !== SERVICE_PREFIX).map(p => p.replace(/\/$/, '')).sort() }, origin);
	}
	const dealer = slug(url.searchParams.get('dealer') || '');
	return json({ dealer, access_code: await accessCode(env.QUOTE_ADMIN_SECRET, dealer) }, origin);
}

async function emailCode(request: Request, env: Env, origin: string | null): Promise<Response> {
	if (!origin) return reply(403, 'origin not allowed', null);
	const webhook = (env.CODE_EMAIL_WEBHOOK || '').trim();
	if (!env.QUOTE_ADMIN_SECRET || !/^https:\/\//i.test(webhook)) return reply(503, 'code emails are not set up', origin);
	const text = await request.text();
	if (text.length > MAX_FORM_BYTES) return reply(413, 'too large', origin);

	const form = new URLSearchParams(text);
	const dealerName = (form.get('dealer') || '').trim().slice(0, 100);
	const email = (form.get('email') || '').trim().slice(0, 254);
	const savedPath = form.get('saved_quotes_path') || '/saved-quotes';
	if (!dealerName) return reply(400, 'dealer required', origin);
	if (!EMAIL.test(email)) return reply(400, 'invalid email', origin);
	if (!SAVED_PATH.test(savedPath)) return reply(400, 'invalid saved quotes path', origin);

	const dealer = slug(dealerName);
	const marker = SERVICE_PREFIX + 'code-emails/' + dealer;
	const last = await env.QUOTES.head(marker);
	if (last && Date.now() - last.uploaded.getTime() < CODE_EMAIL_INTERVAL_MS) return reply(429, 'code was emailed recently', origin);

	const requestedAt = new Date().toISOString();
	const body = new URLSearchParams({
		event: 'access_code_requested',
		dealer: dealerName,
		dealer_slug: dealer,
		email,
		access_code: await accessCode(env.QUOTE_ADMIN_SECRET, dealer),
		saved_quotes_url: origin + savedPath,
		requested_at: requestedAt
	});
	const sent = await fetch(webhook, { method: 'POST', body });
	if (!sent.ok) return reply(502, 'email service did not accept the request', origin);
	await env.QUOTES.put(marker, JSON.stringify({ email, requested_at: requestedAt }), { httpMetadata: { contentType: 'application/json' } });
	return reply(202, 'sent', origin);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = allowedOrigin(env, request.headers.get('origin'));
		const url = new URL(request.url);
		const isQuotes = url.pathname === '/quotes' || url.pathname.startsWith('/quotes/');
		const isAdminPath = url.pathname === '/dealers' || url.pathname === '/access-code';
		const isCodeEmail = url.pathname === '/access-code/email';

		if (request.method === 'OPTIONS') {
			if (!origin) return reply(403, 'origin not allowed', null);
			return new Response(null, {
				status: 204,
				headers: {
					...corsHeaders(origin),
					'access-control-allow-methods': 'GET, POST',
					'access-control-allow-headers': 'x-access-code',
					'access-control-max-age': '86400'
				}
			});
		}
		if (request.method === 'POST' && url.pathname === '/quotes') return saveQuote(request, env, origin);
		if (request.method === 'POST' && url.pathname === '/access-code/email') return emailCode(request, env, origin);
		if (request.method === 'GET' && isQuotes) return readQuotes(request, env, origin, url);
		if (request.method === 'GET' && isAdminPath) return adminRoute(request, env, origin, url);
		if (isQuotes || isAdminPath || isCodeEmail) return reply(405, 'method not allowed', origin);
		return reply(404, 'not found', origin);
	}
};
