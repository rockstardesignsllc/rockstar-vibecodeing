/**
 * The hidden "try Rex" pages (aifordealers.com/call-coach-demo and aiforpowersports.com/call-coach-demo).
 *   POST /coach-demo/leads   {name, dealership, phone?, email?, site, website (honeypot), elapsed_ms}
 * Creates the contact in Rockstar Designs, emails Mat and answers with the Rex practice line. The number is only sent
 * here, never printed on the page, so the line can't be dialed without filling in the form.
 */
import * as ghl from './coach/ghl';
import { practiceLines } from './coach/practice';
import { addNote, addTags, call, HighLevelError } from './highlevel';
import type { Env } from './types';

export const COACH_DEMO_TAG = 'call coach demo started';
const NOTIFY_TO = 'mat@rockstarinfo.com';
const SOURCE = 'Rex Call Coach Demo';
const MAX_BODY_BYTES = 4096;
/** A person needs at least this long to read the page and fill in the form. Faster submits are treated as bots. */
const MIN_FILL_MS = 2500;

const SITES = {
	aifordealers: { domain: 'aifordealers.com', label: 'Automotive', tag: 'call coach demo auto' },
	aiforpowersports: { domain: 'aiforpowersports.com', label: 'Powersports', tag: 'call coach demo powersports' }
} as const;

type Site = keyof typeof SITES;

export interface CoachDemoLead {
	name: string;
	dealership: string;
	phone: string;
	email: string;
	site: Site;
}

type Parsed = { ok: true; lead: CoachDemoLead; bot: boolean } | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const field = (body: Record<string, unknown>, key: string, max: number): string => {
	const value = body[key];
	return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A US number as +1XXXXXXXXXX, an international one as + and its digits, or empty when it isn't a phone number. */
function normalPhone(raw: string): string | null {
	if (!raw) return '';
	const digits = raw.replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	if (raw.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
	return null;
}

export function parseLead(text: string): Parsed {
	let body: unknown;
	try {
		body = JSON.parse(text);
	} catch {
		return { ok: false, error: 'Please fill in the form and try again.' };
	}
	if (!isRecord(body)) return { ok: false, error: 'Please fill in the form and try again.' };
	const name = field(body, 'name', 80);
	const dealership = field(body, 'dealership', 120);
	const email = field(body, 'email', 120).toLowerCase();
	const phone = normalPhone(field(body, 'phone', 40));
	const siteValue = field(body, 'site', 40);
	const site: Site = siteValue === 'aiforpowersports' ? 'aiforpowersports' : 'aifordealers';
	if (name.length < 2) return { ok: false, error: 'Please enter your name.' };
	if (dealership.length < 2) return { ok: false, error: 'Please enter your dealership name.' };
	if (email && !EMAIL.test(email)) return { ok: false, error: 'That email address does not look right.' };
	if (phone === null) return { ok: false, error: 'That phone number does not look right.' };
	const elapsed = typeof body.elapsed_ms === 'number' ? body.elapsed_ms : 0;
	const bot = field(body, 'website', 200) !== '' || elapsed < MIN_FILL_MS;
	return { ok: true, lead: { name, dealership, phone, email, site }, bot };
}

/** The first Rex practice line, as +1XXXXXXXXXX and as 269-575-0069. */
export function practiceNumber(env: Env): { tel: string; display: string } | null {
	const tel = practiceLines(env.COACH_PRACTICE_LINES)[0];
	if (!tel) return null;
	const digits = tel.replace(/\D/g, '').slice(-10);
	return { tel, display: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` };
}

const escape = (text: string): string => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const splitName = (name: string): { first: string; last: string } => {
	const [first = '', ...rest] = name.split(' ');
	return { first, last: rest.join(' ') };
};

interface ContactResponse {
	contact?: { id?: string };
}

async function saveContact(env: Env, lead: CoachDemoLead): Promise<string> {
	const { first, last } = splitName(lead.name);
	const body = {
		locationId: env.HIGHLEVEL_LOCATION_ID,
		firstName: first,
		...(last ? { lastName: last } : {}),
		name: lead.name,
		companyName: lead.dealership,
		...(lead.email ? { email: lead.email } : {}),
		...(lead.phone ? { phone: lead.phone } : {}),
		source: SOURCE
	};
	const result = (await call(env, lead.email || lead.phone ? '/contacts/upsert' : '/contacts/', body)) as ContactResponse;
	const id = result.contact?.id;
	if (!id) throw new HighLevelError(502, 'HighLevel returned no contact id for the demo lead');
	return id;
}

const contactLink = (env: Env, contactId: string): string => `${env.COACH_APP_URL}/v2/location/${env.HIGHLEVEL_LOCATION_ID}/contacts/detail/${contactId}`;

export function leadNote(lead: CoachDemoLead, at: string): string {
	const site = SITES[lead.site];
	return [
		`CALL COACH DEMO STARTED (${at})`,
		`Page: ${site.domain}/call-coach-demo (${site.label})`,
		`Name: ${lead.name}`,
		`Dealership: ${lead.dealership}`,
		`Phone: ${lead.phone || 'not given'}`,
		`Email: ${lead.email || 'not given'}`,
		'',
		'They were shown the Rex practice line. If they call from the phone above, their practice call is scored on this contact.'
	].join('\n');
}

export function leadEmail(env: Env, lead: CoachDemoLead, contactId: string | null, at: string): { subject: string; html: string } {
	const site = SITES[lead.site];
	const row = (label: string, value: string): string =>
		`<tr><td style="padding:6px 12px 6px 0;color:#5f6672;white-space:nowrap">${label}</td><td style="padding:6px 0;color:#111;font-weight:600">${escape(value)}</td></tr>`;
	const link = contactId
		? `<p style="margin:20px 0 0"><a href="${contactLink(env, contactId)}" style="display:inline-block;background:#e10600;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">Open the contact in HighLevel</a></p>`
		: '<p style="margin:20px 0 0;color:#b00020">The contact could not be saved in HighLevel. The details above are all we have.</p>';
	return {
		subject: `Rex demo started: ${lead.name}, ${lead.dealership}`,
		html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#e10600;font-weight:700">Rex Call Coach demo</p>
<h1 style="margin:0 0 12px;font-size:22px">${escape(lead.name)} just unlocked the Rex practice line</h1>
<p style="margin:0 0 16px;color:#333">They filled in the form on ${site.domain}/call-coach-demo and were shown the number. Expect a practice call shortly.</p>
<table style="border-collapse:collapse;font-size:15px">${row('Dealership', lead.dealership)}${row('Phone', lead.phone || 'not given')}${row('Email', lead.email || 'not given')}${row('Site', `${site.label} (${site.domain})`)}${row('When', at)}</table>
${link}
</div>`
	};
}

/** Sends Mat the email from Rockstar Designs' Call Coach setup when it has one, else with the Worker's own token. */
async function notifyMat(env: Env, subject: string, html: string): Promise<void> {
	const coach = env.DEALER_COACH.get(env.DEALER_COACH.idFromName(env.HIGHLEVEL_LOCATION_ID));
	try {
		if (await coach.notify(NOTIFY_TO, subject, html)) return;
	} catch (error) {
		console.error('coach-demo: email through the Call Coach setup failed, trying the Worker token', error);
	}
	const own = { token: env.HIGHLEVEL_TOKEN ?? '', location_id: env.HIGHLEVEL_LOCATION_ID };
	await ghl.sendEmail(own, await ghl.contactForEmail(own, NOTIFY_TO, 'Mat', 'Koenig'), subject, html, []);
}

/** Saves the lead and tells Mat. Runs after the visitor already has the number, so a HighLevel hiccup never blocks them. */
export async function deliverLead(env: Env, lead: CoachDemoLead): Promise<void> {
	const at = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
	let contactId: string | null = null;
	try {
		contactId = await saveContact(env, lead);
		await addTags(env, contactId, [COACH_DEMO_TAG, SITES[lead.site].tag]);
		await addNote(env, contactId, leadNote(lead, at));
	} catch (error) {
		console.error('coach-demo: saving the lead failed', error);
	}
	try {
		const email = leadEmail(env, lead, contactId, at);
		await notifyMat(env, email.subject, email.html);
	} catch (error) {
		console.error('coach-demo: emailing Mat failed', error);
	}
}

export async function readLead(request: Request): Promise<Parsed> {
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) return { ok: false, error: 'Please fill in the form and try again.' };
	return parseLead(text);
}
