import type Anthropic from '@anthropic-ai/sdk';
import { call, HighLevelError } from '../highlevel';
import type { Env } from '../types';
import { DEMO_REPORT_PROMPT } from './prompt';
import type { DealerContact, DemoReport, DemoState } from './types';

/**
 * Existing contact custom fields in the Rockstar Designs sub account (hrsRmtnUmvqCKm3d01tx), from Mat's earlier
 * self-selling demo. The merge field for each one is {{contact.<key>}}.
 */
export const DEMO_FIELDS = {
	ai_summary: { id: 'b01S3y5Iyp8f2FPxBhrJ', key: 'ai_summary' },
	demo_conversation: { id: 'ZASNWG1dIjCkSAGTV9jV', key: 'demo_conversation' },
	demo_business_name: { id: 'JAEdoAYUJ8Nlpt1UlAUh', key: 'demo_business_name' },
	demo_business_industry: { id: 'nMEwTLvNc6jcRVCxoraJ', key: 'demo_business_industry' },
	demo_thoughts: { id: 'RJNgjvch1fKFNKbUJsfv', key: 'demo_thoughts' }
} as const;

type DemoFieldName = keyof typeof DEMO_FIELDS;

export const DEMO_TAG_STARTED = 'ai demo started';
export const DEMO_TAG_COMPLETE = 'ai demo completed';
export const DEMO_TAG_WANTS_CALL = 'ai demo wants call';
export const DEMO_TAG_INCOMPLETE = 'ai demo incomplete';

const SOURCE = 'Rockstar AI BDC Demo';
const MAX_TRANSCRIPT_FIELD_CHARS = 20000;
const MAX_NOTE_CHARS = 60000;

interface UpsertResponse {
	contact?: { id?: string };
}

export async function upsertDealer(env: Env, contact: DealerContact, values: Partial<Record<DemoFieldName, string>> = {}): Promise<string> {
	const customFields = (Object.entries(values) as Array<[DemoFieldName, string | undefined]>)
		.filter((entry): entry is [DemoFieldName, string] => typeof entry[1] === 'string' && entry[1] !== '')
		.map(([name, value]) => ({ id: DEMO_FIELDS[name].id, field_value: value }));
	const result = (await call(env, '/contacts/upsert', {
		locationId: env.HIGHLEVEL_LOCATION_ID,
		firstName: contact.first_name,
		lastName: contact.last_name,
		name: `${contact.first_name} ${contact.last_name}`,
		email: contact.email,
		phone: contact.mobile,
		companyName: contact.dealership_name,
		...(contact.website ? { website: contact.website } : {}),
		source: SOURCE,
		customFields
	})) as UpsertResponse;
	const id = result.contact?.id;
	if (!id) throw new HighLevelError(502, 'HighLevel upsert returned no contact id');
	return id;
}

export function demoTranscript(state: DemoState): string {
	const firstName = state.contact?.first_name || 'Dealer';
	const lines: string[] = [];
	state.transcript.forEach((line, i) => {
		for (const marker of state.markers.filter(m => m.at_line === i)) {
			if (marker.item.kind === 'countdown') lines.push('--- ROLE-PLAY STARTS: Rex plays the dealership AI, the dealer plays a shopper ---');
			if (marker.item.kind === 'demo_over') lines.push('--- ROLE-PLAY OVER ---');
		}
		lines.push(`${line.speaker === 'rex' ? 'Rex' : firstName}: ${line.text}`);
	});
	return lines.join('\n\n');
}

export function demoFieldValues(state: DemoState, report: DemoReport): Partial<Record<DemoFieldName, string>> {
	const transcript = demoTranscript(state);
	return {
		ai_summary: report.ai_summary,
		demo_thoughts: report.demo_thoughts,
		demo_business_name: state.contact?.dealership_name ?? '',
		demo_business_industry: state.outcome?.dealership_type || 'Auto dealership',
		demo_conversation:
			transcript.length > MAX_TRANSCRIPT_FIELD_CHARS
				? transcript.slice(0, MAX_TRANSCRIPT_FIELD_CHARS) + '\n\n[Conversation continues in the contact note.]'
				: transcript
	};
}

export function demoNote(state: DemoState, report: DemoReport, complete: boolean): string {
	const o = state.outcome;
	return [
		complete ? `AI BDC DEMO COMPLETE (${state.completed_at ?? ''})` : `AI BDC DEMO NOT FINISHED (last activity ${state.last_activity_at})`,
		`Dealership: ${state.contact?.dealership_name ?? ''} ${state.contact?.website ? `(${state.contact.website})` : ''}`,
		`Wants real demo with Mat: ${o ? (o.wants_real_demo ? 'Yes' : 'No') : 'Did not answer'}`,
		...(o
			? [`Vehicle: ${o.vehicle_of_interest}`, `Price quoted: ${o.price_quoted}`, `Mock appointment: ${o.mock_appointment}`]
			: state.mock_appointment
				? [`Mock appointment: ${state.mock_appointment}`]
				: []),
		'',
		'AI SUMMARY',
		report.ai_summary,
		'',
		'NEXT STEPS FOR MAT',
		report.next_steps_for_mat,
		'',
		'FULL CONVERSATION',
		demoTranscript(state)
	]
		.join('\n')
		.slice(0, MAX_NOTE_CHARS);
}

export const addDemoNote = (env: Env, contactId: string, body: string): Promise<unknown> => call(env, `/contacts/${contactId}/notes`, { body });

const REPORT_SCHEMA = {
	type: 'object',
	properties: {
		ai_summary: { type: 'string' },
		demo_thoughts: { type: 'string' },
		next_steps_for_mat: { type: 'string' }
	},
	required: ['ai_summary', 'demo_thoughts', 'next_steps_for_mat'],
	additionalProperties: false
} as const;

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export async function writeDemoReport(client: Anthropic, model: string, state: DemoState, complete: boolean): Promise<DemoReport> {
	const request = [
		'<contact>',
		JSON.stringify(state.contact ?? {}, null, 2),
		'</contact>',
		'<demo_outcome>',
		JSON.stringify(state.outcome ?? { note: 'The dealer left before the demo was finished.', mock_appointment: state.mock_appointment ?? 'none' }, null, 2),
		'</demo_outcome>',
		'<transcript>',
		demoTranscript(state),
		'</transcript>',
		complete ? 'Write the recap.' : 'The dealer stopped chatting before the demo finished. Write the recap and say where they dropped off.'
	].join('\n');

	const response = await client.beta.messages.create({
		model,
		max_tokens: 8000,
		betas: ['server-side-fallback-2026-07-01'],
		fallbacks: 'default',
		system: [{ type: 'text', text: DEMO_REPORT_PROMPT, cache_control: { type: 'ephemeral' } }],
		output_config: { effort: 'medium', format: { type: 'json_schema', schema: REPORT_SCHEMA } },
		messages: [{ role: 'user', content: request }]
	});

	if (response.stop_reason === 'refusal') throw new Error('demo recap request was declined');
	if (response.stop_reason === 'max_tokens') throw new Error('demo recap was cut off at max_tokens');
	const block = response.content.find(b => b.type === 'text');
	if (!block || block.type !== 'text') throw new Error('demo recap had no text');
	const raw: unknown = JSON.parse(block.text);
	const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
	const report = { ai_summary: str(r.ai_summary), demo_thoughts: str(r.demo_thoughts), next_steps_for_mat: str(r.next_steps_for_mat) };
	if (!report.ai_summary) throw new Error('demo recap is missing the summary');
	return report;
}
