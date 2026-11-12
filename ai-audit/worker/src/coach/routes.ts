/**
 * Call Coach routes.
 *   GET  /coach/setup                          the setup page (pages/call-coach-setup.html)
 *   GET  /coach/admin/dealers/<location>       settings and counts              (x-admin-key)
 *   PUT  /coach/admin/dealers/<location>       create or update a dealership    (x-admin-key)
 *   POST /coach/admin/dealers/<location>/run   score now; {"message_id","deliver"} scores one call (x-admin-key)
 *   POST /coach/admin/pdf                      PDF framework in, plain text out (x-admin-key)
 *   GET  /coach/d/<location>?key=&date=        the manager dashboard for one day
 *   GET  /coach/d/<location>/call/<id>?key=    one call's full summary
 *   GET  /coach/d/<location>/rec/<id>?key=     that call's recording (a practice call's comes from the practice line's sub-account)
 * Each dealership lives in its own DealerCoach Durable Object, named by its HighLevel location id.
 */
import Anthropic from '@anthropic-ai/sdk';
import SETUP_PAGE from '../../../pages/call-coach-setup.html';
import { sameText } from '../admin';
import type { Env } from '../types';
import type { CoachResult, DealerCoach, DealerStatus } from './dealer';
import { DIRECTORY_NAME } from './directory';
import { recording } from './ghl';
import { callPage, dashboardPage, dashboardUrl, staffPage } from './render';
import { pdfToText } from './score';
import { DEPARTMENTS, isInboundDepartment, isStaffDepartment, type DealerConfigInput, type Department, type InboundDepartment, type StaffMember } from './types';

const LOCATION_ID = /^[A-Za-z0-9]{10,40}$/;
const MESSAGE_ID = /^[A-Za-z0-9]{10,40}$/;
const MAX_CONFIG_BYTES = 400_000;
const MAX_PDF_BYTES = 8_000_000;

const json = (status: number, body: object): Response =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const RANGE = /^bytes=(\d*)-(\d*)$/;

/**
 * Serves a file with byte-range support. Safari and iOS only play audio from a server that answers range requests,
 * and HighLevel's recording route does not, so the whole recording is read and the asked-for slice returned.
 */
function ranged(file: ArrayBuffer, type: string, range: string | null): Response {
	const size = file.byteLength;
	const headers = { 'content-type': type, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=3600', 'content-disposition': 'inline' };
	const match = range ? RANGE.exec(range.trim()) : null;
	if (!match || (!match[1] && !match[2])) return new Response(file, { headers: { ...headers, 'content-length': String(size) } });
	const suffix = !match[1];
	const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
	const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
	if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${size}` } });
	return new Response(file.slice(start, end + 1), {
		status: 206,
		headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) }
	});
}

const html = (status: number, body: string): Response =>
	new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });

const notFound = (): Response => html(404, '<p>Not found.</p>');

const fromResult = <T extends object>(result: CoachResult<T>): Response => (result.ok ? json(200, result.value) : json(result.status, { error: result.error }));

const dealer = (env: Env, locationId: string): DurableObjectStub<DealerCoach> => env.DEALER_COACH.get(env.DEALER_COACH.idFromName(locationId));

const isAdmin = (request: Request, env: Env): boolean => {
	const key = request.headers.get('x-admin-key') ?? '';
	return Boolean(env.ADMIN_KEY && key && sameText(key, env.ADMIN_KEY));
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
	const body = await request.text();
	if (body.length > MAX_CONFIG_BYTES) return null;
	if (!body) return {};
	try {
		const parsed: unknown = JSON.parse(body);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const flag = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const departments = (value: unknown): Record<string, InboundDepartment> | undefined =>
	isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, InboundDepartment] => isInboundDepartment(entry[1]))) : undefined;

/** The staff list from a request body: entries with a name and a department. */
const staffMembers = (value: unknown): StaffMember[] | undefined =>
	Array.isArray(value)
		? value.filter(isRecord).flatMap(member => {
				const name = text(member.name)?.trim();
				return name && isStaffDepartment(member.department) ? [{ name, department: member.department, phone: text(member.phone) ?? '', email: text(member.email) ?? '' }] : [];
			})
		: undefined;

/** Keeps only well-formed settings from a request body. Anything missing or malformed is left as it was. */
function settings(body: Record<string, unknown>): DealerConfigInput {
	const scripts = isRecord(body.scripts)
		? Object.fromEntries(DEPARTMENTS.map(d => [d, text((body.scripts as Record<string, unknown>)[d])?.trim()]).filter((entry): entry is [Department, string] => typeof entry[1] === 'string'))
		: undefined;
	const input: DealerConfigInput = {};
	const set = <K extends keyof DealerConfigInput>(key: K, value: DealerConfigInput[K] | undefined): void => {
		if (value !== undefined) input[key] = value;
	};
	set('token', text(body.token));
	set('name', text(body.name));
	set('timezone', text(body.timezone));
	set('enabled', flag(body.enabled));
	set('send_emails', flag(body.send_emails));
	set('score_outbound', flag(body.score_outbound));
	set('managers', Array.isArray(body.managers) ? body.managers.filter((m): m is string => typeof m === 'string') : undefined);
	set('staff', staffMembers(body.staff));
	set('scripts', scripts);
	set('numbers', departments(body.numbers));
	set('users', departments(body.users));
	set('default_department', isInboundDepartment(body.default_department) ? body.default_department : undefined);
	set('min_seconds', typeof body.min_seconds === 'number' && Number.isFinite(body.min_seconds) ? body.min_seconds : undefined);
	set('scoring_started_at', text(body.scoring_started_at) && !Number.isNaN(Date.parse(text(body.scoring_started_at) ?? '')) ? text(body.scoring_started_at) : undefined);
	return input;
}

const toBase64 = (bytes: Uint8Array): string => {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
};

interface DealerRow {
	location_id: string;
	name: string;
	enabled: boolean;
	score_outbound: boolean;
	scored: number;
	last_check: DealerStatus['last_check'];
	dashboard: string;
}

/** Every dealership set up for Call Coach, by name, with its dashboard link. */
async function dealerList(env: Env): Promise<DealerRow[]> {
	const ids = await env.COACH_DIRECTORY.get(env.COACH_DIRECTORY.idFromName(DIRECTORY_NAME)).list();
	const statuses = await Promise.all(ids.map(id => dealer(env, id).status()));
	return statuses
		.flatMap(status => (status.ok ? [status.value] : []))
		.map(({ config, scored, last_check }) => ({
			location_id: config.location_id,
			name: config.name,
			enabled: config.enabled,
			score_outbound: config.score_outbound === true,
			scored,
			last_check,
			dashboard: dashboardUrl(env.COACH_BASE_URL, config)
		}))
		.sort((x, y) => x.name.localeCompare(y.name));
}

async function handleAdmin(request: Request, env: Env, parts: string[]): Promise<Response> {
	if (!isAdmin(request, env)) return json(401, { error: 'admin key required' });
	if (parts.length === 1 && parts[0] === 'pdf' && request.method === 'POST') {
		const bytes = new Uint8Array(await request.arrayBuffer());
		if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) return json(400, { error: 'Send one PDF up to 8 MB.' });
		const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2, ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}) });
		try {
			return json(200, { text: await pdfToText(client, env.MODEL, toBase64(bytes)) });
		} catch (error) {
			return json(502, { error: error instanceof Error ? error.message : 'could not read the PDF' });
		}
	}
	if (parts.length === 1 && parts[0] === 'dealers' && request.method === 'GET') return json(200, { dealers: await dealerList(env) });
	const locationId = parts[1] ?? '';
	if (parts[0] !== 'dealers' || !LOCATION_ID.test(locationId)) return json(404, { error: 'not found' });
	const stub = dealer(env, locationId);
	if (parts.length === 2 && request.method === 'GET') return fromResult(await stub.status());
	if (parts.length === 2 && request.method === 'DELETE') return fromResult(await stub.remove(locationId));
	if (parts.length === 2 && request.method === 'PUT') {
		const body = await readJson(request);
		if (!body) return json(400, { error: 'send the settings as JSON' });
		return fromResult(await stub.configure(locationId, settings(body)));
	}
	if (parts.length === 3 && parts[2] === 'run' && request.method === 'POST') {
		const body = await readJson(request);
		if (!body) return json(400, { error: 'send JSON' });
		const messageId = typeof body.message_id === 'string' && MESSAGE_ID.test(body.message_id) ? body.message_id : undefined;
		return fromResult(await stub.run({ ...(messageId ? { message_id: messageId } : {}), deliver: body.deliver !== false }));
	}
	return json(405, { error: 'method not allowed' });
}

async function handleDealerView(request: Request, env: Env, parts: string[], url: URL): Promise<Response> {
	const locationId = parts[0] ?? '';
	const key = url.searchParams.get('key') ?? '';
	if (request.method !== 'GET' || !LOCATION_ID.test(locationId) || !key) return notFound();
	const stub = dealer(env, locationId);
	const access = await stub.access(key);
	if (!access) return notFound();
	const base = env.COACH_BASE_URL;
	if (parts.length === 1) {
		const date = url.searchParams.get('date');
		if (!date) {
			const recent = await stub.recent(key);
			return recent.ok ? html(200, staffPage(recent.value.days, recent.value.today, recent.value.records, base, access, recent.value.staff)) : notFound();
		}
		const day = await stub.day(key, date);
		return day.ok ? html(200, dashboardPage(day.value.date, day.value.today, day.value.records, base, access, day.value.staff)) : notFound();
	}
	const id = parts[2] ?? '';
	if (parts.length !== 3 || !MESSAGE_ID.test(id)) return notFound();
	const call = await stub.call(key, id);
	if (!call.ok) return notFound();
	if (parts[1] === 'call') return html(200, callPage(call.value, base, access, env.COACH_APP_URL));
	if (parts[1] === 'rec') {
		const host = call.value.practice?.host;
		const holder = host ? await dealer(env, host).practiceAccess(id, locationId) : access;
		if (!holder) return notFound();
		const audio = await recording(holder, id);
		if (!audio.ok) return json(502, { error: `HighLevel did not return the recording (${audio.status}).` });
		return ranged(await audio.arrayBuffer(), audio.headers.get('content-type') ?? 'audio/x-wav', request.headers.get('range'));
	}
	return notFound();
}

export async function handleCoach(request: Request, env: Env, parts: string[], url: URL): Promise<Response> {
	if (parts[0] === 'setup' || parts[0] === 'admin') {
		// Setup and admin answer only on the Call Coach address, where Cloudflare Access guards them.
		if (url.host !== new URL(env.COACH_BASE_URL).host) {
			return parts[0] === 'setup' ? Response.redirect(`${env.COACH_BASE_URL}/coach/setup`, 302) : json(403, { error: `use ${env.COACH_BASE_URL}` });
		}
		if (parts.length === 1 && parts[0] === 'setup' && request.method === 'GET') return html(200, SETUP_PAGE);
		if (parts[0] === 'admin') return handleAdmin(request, env, parts.slice(1));
	}
	if (parts[0] === 'd') return handleDealerView(request, env, parts.slice(1), url);
	return json(404, { error: 'not found' });
}
