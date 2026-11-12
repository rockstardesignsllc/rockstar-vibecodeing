/** The departments an inbound call can belong to. */
export const INBOUND_DEPARTMENTS = ['sales', 'bdc', 'service'] as const;
export type InboundDepartment = (typeof INBOUND_DEPARTMENTS)[number];

/**
 * Every scorecard a call can be scored against. Calls the dealership makes are all scored as "outbound". "general" is
 * the built-in customer service scorecard for inbound calls that no department framework fits.
 */
export const DEPARTMENTS = [...INBOUND_DEPARTMENTS, 'outbound', 'general'] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = { sales: 'Sales', bdc: 'BDC', service: 'Service', outbound: 'Outbound', general: 'General' };

export const isDepartment = (value: unknown): value is Department => DEPARTMENTS.some(d => d === value);
export const isInboundDepartment = (value: unknown): value is InboundDepartment => INBOUND_DEPARTMENTS.some(d => d === value);

export type Direction = 'inbound' | 'outbound';

/** What the customer's call was about, whoever answered it. */
export const TOPICS = ['sales', 'service', 'other'] as const;
export type Topic = (typeof TOPICS)[number];
export const TOPIC_LABELS: Record<Topic, string> = { sales: 'Sales related', service: 'Service related', other: 'Other' };
export const isTopic = (value: unknown): value is Topic => TOPICS.some(t => t === value);

export const MOODS = ['satisfied', 'neutral', 'frustrated'] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABELS: Record<Mood, string> = { satisfied: 'Satisfied', neutral: 'Neutral', frustrated: 'Frustrated' };
export const isMood = (value: unknown): value is Mood => MOODS.some(m => m === value);

/** One dealership (HighLevel sub-account) using Call Coach. Stored in its own DealerCoach Durable Object. */
export interface DealerConfig {
	location_id: string;
	name: string;
	/** The sub-account's Private Integration token. Never returned by any route. */
	token: string;
	timezone: string;
	enabled: boolean;
	send_emails: boolean;
	/** Also score calls the dealership makes (an add-on). Inbound calls are always scored. */
	score_outbound: boolean;
	managers: string[];
	scripts: Partial<Record<Department, string>>;
	/** Dealership phone number that was called (E.164) to the department that answers it. */
	numbers: Record<string, InboundDepartment>;
	/** HighLevel user id to department, for shared numbers. */
	users: Record<string, InboundDepartment>;
	default_department: InboundDepartment;
	min_seconds: number;
	/** Random key in dashboard, summary and recording links. */
	view_key: string;
	/** Only calls after this moment are scored. */
	scoring_started_at: string;
}

export type DealerConfigInput = Partial<Omit<DealerConfig, 'location_id' | 'view_key'>>;

export type PublicDealerConfig = Omit<DealerConfig, 'token'> & { has_token: boolean };

export interface TranscriptSentence {
	mediaChannel?: number;
	speaker?: number;
	transcript?: string;
	startTime?: number;
}

export interface CallMessage {
	id: string;
	locationId?: string;
	direction?: string;
	status?: string;
	contactId?: string;
	conversationId?: string;
	userId?: string;
	dateAdded: string;
	from?: string;
	to?: string;
	meta?: { call?: { duration?: number; status?: string } };
}

export interface ItemResult {
	id: string;
	applicable: boolean;
	points: number;
	evidence: string;
}

export interface TuneUp {
	title: string;
	what_happened: string;
	say_this_next_time: string;
}

export interface Win {
	title: string;
	detail: string;
}

/** What Claude returns for one call. */
export interface CallAnalysis {
	scoreable: boolean;
	skip_reason: string;
	department: Department;
	/** Absent on calls scored before v1.13, as are customer_mood and follow_ups. */
	topic?: Topic;
	customer_mood?: Mood;
	/** What the staff member promised to do after the call. */
	follow_ups?: string[];
	staff_name_heard: string;
	customer_name_heard: string;
	appointment_set: boolean;
	appointment_time: string;
	one_line_summary: string;
	summary: string;
	wins: Win[];
	tune_ups: TuneUp[];
	red_flags: string[];
	items: ItemResult[];
	/** Only on a practice call with Rex. */
	practice?: PracticeHeard;
}

/** The calls a staff member can role-play with Rex on the practice line. */
export const PRACTICE_SCENARIOS = ['inbound_sales', 'inbound_bdc', 'outbound_prospecting', 'service_survey', 'inbound_service'] as const;
export type PracticeScenario = (typeof PRACTICE_SCENARIOS)[number];
export const PRACTICE_LABELS: Record<PracticeScenario, string> = {
	inbound_sales: 'Inbound sales call',
	inbound_bdc: 'Inbound BDC call',
	outbound_prospecting: 'Outbound prospecting call',
	service_survey: 'Service survey call',
	inbound_service: 'Inbound service call'
};
/** The scorecard each practice scenario is scored on. */
export const PRACTICE_DEPARTMENTS: Record<PracticeScenario, Department> = {
	inbound_sales: 'sales',
	inbound_bdc: 'bdc',
	outbound_prospecting: 'outbound',
	service_survey: 'outbound',
	inbound_service: 'service'
};
export const isPracticeScenario = (value: unknown): value is PracticeScenario => PRACTICE_SCENARIOS.some(s => s === value);

/** What Claude heard on a practice call with Rex, beyond the score. */
export interface PracticeHeard {
	scenario: PracticeScenario;
	difficulty: string;
	dealership_heard: string;
	email_heard: string;
}

/** Set on a practice call with Rex. The staff member is the caller, and their managers may be at another dealership. */
export interface PracticeInfo {
	scenario: PracticeScenario;
	difficulty: string;
	/** The dealership the caller works at, as matched or as said on the call. */
	dealership: string;
	/** Who is copied on the scorecard email. */
	managers: string[];
}

export type CallStatus = 'scored' | 'skipped' | 'error';

export interface Delivery {
	note_added?: boolean;
	email_sent?: boolean;
}

/** One processed call, as stored and as served to the dashboard. */
export interface CallRecord {
	id: string;
	at: string;
	local_date: string;
	local_time: string;
	status: CallStatus;
	skip_reason: string;
	/** Absent on calls scored before v1.10, which were all inbound. */
	direction?: Direction;
	department: Department;
	user_id: string;
	staff_name: string;
	staff_email: string;
	contact_id: string;
	/** The HighLevel conversation the call sits in. Absent on calls scored before v1.9. */
	conversation_id?: string;
	customer_phone?: string;
	customer_first: string;
	customer_last: string;
	duration: number;
	earned: number;
	possible: number;
	percent: number;
	appointment_set: boolean;
	analysis: CallAnalysis | null;
	delivery: Delivery;
	/** Only on a practice call with Rex. */
	practice?: PracticeInfo;
}

export type Grade = 'green' | 'yellow' | 'red';
