import { AUDIT_FIELDS, TAG_COMPLETE, TAG_STARTED, TAG_WANTS_CALL, type AuditFieldName } from './fields';
import { transcriptText } from './report';
import type { AuditReport, Env, ProspectContact, SessionState } from './types';

const API = 'https://services.leadconnectorhq.com';
const API_VERSION = '2021-07-28';
const SOURCE = 'Rockstar AI Audit';
const MAX_TRANSCRIPT_FIELD_CHARS = 20000;
const MAX_NOTE_CHARS = 60000;

interface CustomFieldValue {
	id: string;
	field_value: string;
}

interface UpsertResponse {
	contact?: { id?: string };
}

export class HighLevelError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'HighLevelError';
	}
}

export const highLevelReady = (env: Env): boolean => Boolean(env.HIGHLEVEL_TOKEN && env.HIGHLEVEL_LOCATION_ID);

async function call(env: Env, path: string, body: object): Promise<unknown> {
	const response = await fetch(API + path, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.HIGHLEVEL_TOKEN ?? ''}`,
			version: API_VERSION,
			'content-type': 'application/json',
			accept: 'application/json'
		},
		body: JSON.stringify(body)
	});
	const text = await response.text();
	if (!response.ok) throw new HighLevelError(response.status, `HighLevel ${path} answered ${response.status}: ${text.slice(0, 300)}`);
	return text ? JSON.parse(text) : {};
}

const fieldValues = (values: Partial<Record<AuditFieldName, string>>): CustomFieldValue[] =>
	(Object.entries(values) as Array<[AuditFieldName, string | undefined]>)
		.filter((entry): entry is [AuditFieldName, string] => typeof entry[1] === 'string' && entry[1] !== '')
		.map(([name, value]) => ({ id: AUDIT_FIELDS[name].id, field_value: value }));

/** Creates or updates the prospect's contact and returns its id. HighLevel matches on email, then phone. */
export async function upsertContact(env: Env, contact: ProspectContact, values: Partial<Record<AuditFieldName, string>> = {}): Promise<string> {
	const result = (await call(env, '/contacts/upsert', {
		locationId: env.HIGHLEVEL_LOCATION_ID,
		firstName: contact.first_name,
		lastName: contact.last_name,
		name: `${contact.first_name} ${contact.last_name}`,
		email: contact.email,
		phone: contact.mobile,
		companyName: contact.business_name,
		...(contact.website ? { website: contact.website } : {}),
		source: SOURCE,
		customFields: fieldValues(values)
	})) as UpsertResponse;
	const id = result.contact?.id;
	if (!id) throw new HighLevelError(502, 'HighLevel upsert returned no contact id');
	return id;
}

export const addTags = (env: Env, contactId: string, tags: string[]): Promise<unknown> => call(env, `/contacts/${contactId}/tags`, { tags });

export const addNote = (env: Env, contactId: string, body: string): Promise<unknown> =>
	call(env, `/contacts/${contactId}/notes`, { body: body.slice(0, MAX_NOTE_CHARS) });

export const startedTags = (): string[] => [TAG_STARTED];

export const completeTags = (state: SessionState): string[] => (state.answers?.wants_strategy_call ? [TAG_COMPLETE, TAG_WANTS_CALL] : [TAG_COMPLETE]);

const toolLines = (report: AuditReport): string => report.recommended_tools.map((t, i) => `${i + 1}. ${t.tool}: ${t.why}`).join('\n');

export function auditFieldValues(state: SessionState, report: AuditReport): Partial<Record<AuditFieldName, string>> {
	const a = state.answers;
	if (!a) return {};
	const transcript = transcriptText(state);
	return {
		business_type: a.business_type,
		product_line: a.product_line,
		lead_sources: a.lead_sources,
		after_hours_leads: a.after_hours_leads,
		lead_response_time: a.lead_response_time,
		monthly_leads: a.monthly_leads,
		monthly_closes: a.monthly_closes,
		average_customer_value: a.average_customer_value,
		follow_up_process: a.follow_up_process,
		reviews: a.reviews,
		biggest_time_drain: a.biggest_time_drain,
		current_tools_and_crm: a.current_tools_and_crm,
		first_thing_to_hand_off: a.first_thing_to_hand_off,
		what_has_held_them_back: a.what_has_held_them_back,
		go_live_timeline: a.go_live_timeline,
		wants_strategy_call: a.wants_strategy_call ? 'Yes' : 'No',
		website_findings: a.website_findings,
		summary: report.summary,
		estimated_monthly_revenue_leak: `${report.estimated_monthly_revenue_leak} (${report.revenue_leak_math})`,
		opportunity_score: String(report.opportunity_score),
		recommended_path: report.recommended_path,
		recommended_tools: toolLines(report),
		next_steps_for_mat: report.next_steps_for_mat,
		prospect_email_subject: report.prospect_email_subject,
		prospect_email_body: report.prospect_email_body,
		transcript:
			transcript.length > MAX_TRANSCRIPT_FIELD_CHARS
				? transcript.slice(0, MAX_TRANSCRIPT_FIELD_CHARS) + '\n\n[Transcript continues in the contact note.]'
				: transcript,
		completed_date: (state.completed_at ?? new Date().toISOString()).slice(0, 10)
	};
}

export function auditNote(state: SessionState, report: AuditReport): string {
	return [
		`AI AUDIT COMPLETE (${state.completed_at ?? ''})`,
		`Opportunity score: ${report.opportunity_score}/10`,
		`Wants strategy call: ${state.answers?.wants_strategy_call ? 'Yes' : 'No'}`,
		`Recommended path: ${report.recommended_path}`,
		`Estimated monthly revenue leak: ${report.estimated_monthly_revenue_leak} (${report.revenue_leak_math})`,
		'',
		'SUMMARY',
		report.summary,
		'',
		'RECOMMENDED TOOLS',
		toolLines(report),
		'',
		'NEXT STEPS FOR MAT',
		report.next_steps_for_mat,
		'',
		'FULL TRANSCRIPT',
		transcriptText(state)
	].join('\n');
}
