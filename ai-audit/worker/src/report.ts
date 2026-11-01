import type Anthropic from '@anthropic-ai/sdk';
import { REPORT_SYSTEM_PROMPT } from './prompt';
import type { AuditReport, RecommendedTool, SessionState, TranscriptLine } from './types';

const REPORT_SCHEMA = {
	type: 'object',
	properties: {
		summary: { type: 'string', description: "Three to five sentences for Mat: who they are, the core problem, the size of the prize, and how warm they are." },
		estimated_monthly_revenue_leak: { type: 'string', description: 'The conservative monthly figure, for example "$8,400 per month"' },
		revenue_leak_math: { type: 'string', description: 'One or two lines showing how the figure was worked out, with any assumptions labeled' },
		opportunity_score: { type: 'integer', description: 'Whole number from 1 (weak) to 10 (hot)' },
		recommended_path: { type: 'string', description: 'Product line plus the lead tools, for example "RockstarAI for Business: Reception + Lead Response"' },
		recommended_tools: {
			type: 'array',
			items: {
				type: 'object',
				properties: { tool: { type: 'string' }, why: { type: 'string' } },
				required: ['tool', 'why'],
				additionalProperties: false
			}
		},
		next_steps_for_mat: { type: 'string' },
		prospect_email_subject: { type: 'string' },
		prospect_email_body: { type: 'string' }
	},
	required: [
		'summary',
		'estimated_monthly_revenue_leak',
		'revenue_leak_math',
		'opportunity_score',
		'recommended_path',
		'recommended_tools',
		'next_steps_for_mat',
		'prospect_email_subject',
		'prospect_email_body'
	],
	additionalProperties: false
} as const;

export const speakerName = (line: TranscriptLine, firstName: string): string => (line.speaker === 'rex' ? 'Rex' : firstName || 'Prospect');

export function transcriptText(state: SessionState): string {
	const firstName = state.contact?.first_name ?? '';
	return state.transcript.map(line => `${speakerName(line, firstName)}: ${line.text}`).join('\n\n');
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

function parseReport(raw: unknown): AuditReport {
	if (!isRecord(raw)) throw new Error('report is not an object');
	const tools: RecommendedTool[] = Array.isArray(raw.recommended_tools)
		? raw.recommended_tools.filter(isRecord).map(t => ({ tool: str(t.tool), why: str(t.why) })).filter(t => t.tool)
		: [];
	const score = typeof raw.opportunity_score === 'number' ? Math.round(raw.opportunity_score) : 0;
	const report: AuditReport = {
		summary: str(raw.summary),
		estimated_monthly_revenue_leak: str(raw.estimated_monthly_revenue_leak),
		revenue_leak_math: str(raw.revenue_leak_math),
		opportunity_score: Math.min(10, Math.max(1, score)),
		recommended_path: str(raw.recommended_path),
		recommended_tools: tools,
		next_steps_for_mat: str(raw.next_steps_for_mat),
		prospect_email_subject: str(raw.prospect_email_subject),
		prospect_email_body: str(raw.prospect_email_body)
	};
	if (!report.summary || !report.recommended_path || !report.prospect_email_body) throw new Error('report is missing required sections');
	return report;
}

export async function writeReport(client: Anthropic, model: string, bookingUrl: string, state: SessionState): Promise<AuditReport> {
	const request = [
		'<contact>',
		JSON.stringify(state.contact ?? {}, null, 2),
		'</contact>',
		'<audit_answers>',
		JSON.stringify(state.answers ?? {}, null, 2),
		'</audit_answers>',
		'<transcript>',
		transcriptText(state),
		'</transcript>',
		'Write the report.'
	].join('\n');

	const response = await client.beta.messages.create({
		model,
		max_tokens: 16000,
		betas: ['server-side-fallback-2026-07-01'],
		fallbacks: 'default',
		system: [{ type: 'text', text: REPORT_SYSTEM_PROMPT.replaceAll('{BOOKING_URL}', bookingUrl), cache_control: { type: 'ephemeral' } }],
		output_config: { effort: 'high', format: { type: 'json_schema', schema: REPORT_SCHEMA } },
		messages: [{ role: 'user', content: request }]
	});

	if (response.stop_reason === 'refusal') throw new Error('report request was declined');
	if (response.stop_reason === 'max_tokens') throw new Error('report was cut off at max_tokens');
	const json = response.content.find(block => block.type === 'text');
	if (!json || json.type !== 'text') throw new Error('report response had no text');
	const parsed: unknown = JSON.parse(json.text);
	return parseReport(parsed);
}
