import type Anthropic from '@anthropic-ai/sdk';
import type { AuditSession } from './session';

export interface Env {
	AUDIT_SESSIONS: DurableObjectNamespace<AuditSession>;
	START_LIMITER: RateLimit;
	MESSAGE_LIMITER: RateLimit;
	ALLOWED_ORIGINS: string;
	BOOKING_URL: string;
	HIGHLEVEL_LOCATION_ID: string;
	MODEL: string;
	ANTHROPIC_API_KEY: string;
	/** Optional, for example a Cloudflare AI Gateway URL for request logs and cost tracking. */
	ANTHROPIC_BASE_URL?: string;
	HIGHLEVEL_TOKEN?: string;
	ADMIN_KEY?: string;
}

export type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;

export type Speaker = 'rex' | 'prospect';

export interface TranscriptLine {
	speaker: Speaker;
	text: string;
	at: string;
}

export interface ProspectContact {
	first_name: string;
	last_name: string;
	business_name: string;
	website: string;
	mobile: string;
	email: string;
}

export const PRODUCT_LINES = ['RockstarAI for Dealers', 'RockstarAI for Powersports', 'RockstarAI for Business'] as const;
export type ProductLine = (typeof PRODUCT_LINES)[number];

export interface AuditAnswers {
	business_type: string;
	product_line: ProductLine;
	lead_sources: string;
	after_hours_leads: string;
	lead_response_time: string;
	monthly_leads: string;
	monthly_closes: string;
	average_customer_value: string;
	follow_up_process: string;
	reviews: string;
	biggest_time_drain: string;
	current_tools_and_crm: string;
	first_thing_to_hand_off: string;
	what_has_held_them_back: string;
	go_live_timeline: string;
	website_findings: string;
	wants_strategy_call: boolean;
}

export interface RecommendedTool {
	tool: string;
	why: string;
}

export interface AuditReport {
	summary: string;
	estimated_monthly_revenue_leak: string;
	revenue_leak_math: string;
	opportunity_score: number;
	recommended_path: string;
	recommended_tools: RecommendedTool[];
	next_steps_for_mat: string;
	prospect_email_subject: string;
	prospect_email_body: string;
}

export type SessionStatus = 'chatting' | 'complete' | 'reported' | 'failed';

/** Which HighLevel writes have already succeeded, so a retried alarm never repeats one. */
export interface HighLevelProgress {
	contact_id?: string;
	started_tagged?: boolean;
	fields_saved?: boolean;
	note_added?: boolean;
	complete_tagged?: boolean;
}

export interface SessionState {
	id: string;
	created_at: string;
	updated_at: string;
	status: SessionStatus;
	messages: MessageParam[];
	transcript: TranscriptLine[];
	prospect_turns: number;
	contact?: ProspectContact;
	answers?: AuditAnswers;
	completed_at?: string;
	report?: AuditReport;
	highlevel: HighLevelProgress;
	last_error?: string;
}

export interface ChatReply {
	session_id: string;
	messages: string[];
	done: boolean;
	wants_call: boolean;
	booking_url: string | null;
}

export interface SessionView extends ChatReply {
	transcript: Array<Pick<TranscriptLine, 'speaker' | 'text'>>;
}
