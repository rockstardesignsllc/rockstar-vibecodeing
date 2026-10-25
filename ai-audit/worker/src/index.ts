/**
 * Rockstar AI Audit API. The chat embed on the HighLevel audit page talks to these routes:
 *   POST /sessions                     starts an audit and returns Rex's opening message
 *   GET  /sessions/<id>                returns the transcript, so a reloaded page picks up where it left off
 *   POST /sessions/<id>/messages       {"text": "..."} sends the prospect's message and returns Rex's reply
 *   POST /sessions/<id>/redeliver      re-sends a finished audit to HighLevel (x-admin-key header = ADMIN_KEY)
 * Each audit lives in its own AuditSession Durable Object.
 */
import { AuditSession, MAX_MESSAGE_CHARS, type SessionResult } from './session';
import type { Env } from './types';

export { AuditSession };

const SESSION_ID = /^[0-9a-f]{64}$/;
const MAX_BODY_BYTES = MAX_MESSAGE_CHARS * 4 + 256;

const allowedOrigin = (env: Env, origin: string | null): string | null => {
	if (!origin) return null;
	return env.ALLOWED_ORIGINS.split(',')
		.map(o => o.trim())
		.filter(Boolean)
		.includes(origin)
		? origin
		: null;
};

const corsHeaders = (origin: string | null): Record<string, string> => (origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {});

const json = (status: number, body: object, origin: string | null): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders(origin) }
	});

const fromResult = <T extends object>(result: SessionResult<T>, origin: string | null): Response =>
	result.ok ? json(200, result.value, origin) : json(result.status, { error: result.error }, origin);

const clientKey = (request: Request): string => request.headers.get('cf-connecting-ip') ?? 'unknown';

const sameText = (a: string, b: string): boolean => {
	const x = new TextEncoder().encode(a);
	const y = new TextEncoder().encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
	return diff === 0;
};

async function readText(request: Request): Promise<string | null> {
	const body = await request.text();
	if (body.length > MAX_BODY_BYTES) return null;
	try {
		const parsed: unknown = JSON.parse(body);
		if (typeof parsed === 'object' && parsed !== null && 'text' in parsed && typeof parsed.text === 'string') return parsed.text;
	} catch {
		return null;
	}
	return null;
}

const session = (env: Env, id: string): DurableObjectStub<AuditSession> => env.AUDIT_SESSIONS.get(env.AUDIT_SESSIONS.idFromString(id));

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const origin = allowedOrigin(env, request.headers.get('origin'));
		const parts = url.pathname.split('/').filter(Boolean);

		if (request.method === 'OPTIONS') {
			if (!origin) return json(403, { error: 'origin not allowed' }, null);
			return new Response(null, {
				status: 204,
				headers: {
					...corsHeaders(origin),
					'access-control-allow-methods': 'GET, POST',
					'access-control-allow-headers': 'content-type',
					'access-control-max-age': '86400'
				}
			});
		}
		if (request.method === 'GET' && parts.length === 0) return json(200, { ok: true, service: 'rockstar-ai-audit' }, origin);
		if (parts[0] !== 'sessions') return json(404, { error: 'not found' }, origin);

		if (parts.length === 1) {
			if (request.method !== 'POST') return json(405, { error: 'method not allowed' }, origin);
			if (!origin) return json(403, { error: 'origin not allowed' }, null);
			if (!(await env.START_LIMITER.limit({ key: clientKey(request) })).success) {
				return json(429, { error: 'Too many audits started. Please wait a minute and try again.' }, origin);
			}
			const id = env.AUDIT_SESSIONS.newUniqueId().toString();
			return fromResult(await session(env, id).start(id), origin);
		}

		const id = parts[1] ?? '';
		if (!SESSION_ID.test(id)) return json(404, { error: 'audit not found' }, origin);

		if (parts.length === 2 && request.method === 'GET') {
			if (!origin) return json(403, { error: 'origin not allowed' }, null);
			return fromResult(await session(env, id).view(), origin);
		}

		if (parts.length === 3 && parts[2] === 'messages' && request.method === 'POST') {
			if (!origin) return json(403, { error: 'origin not allowed' }, null);
			if (!(await env.MESSAGE_LIMITER.limit({ key: clientKey(request) })).success) {
				return json(429, { error: 'Easy there! Give Rex a few seconds and send that again.' }, origin);
			}
			const text = await readText(request);
			if (text === null) return json(400, { error: 'send {"text": "..."}' }, origin);
			return fromResult(await session(env, id).send(text), origin);
		}

		if (parts.length === 3 && parts[2] === 'redeliver' && request.method === 'POST') {
			const key = request.headers.get('x-admin-key') ?? '';
			if (!env.ADMIN_KEY || !key || !sameText(key, env.ADMIN_KEY)) return json(401, { error: 'admin key required' }, null);
			return fromResult(await session(env, id).redeliver(), null);
		}

		return json(405, { error: 'method not allowed' }, origin);
	}
} satisfies ExportedHandler<Env>;
