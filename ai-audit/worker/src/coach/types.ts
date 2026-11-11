export const DEPARTMENTS = ['sales', 'bdc', 'service'] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = { sales: 'Sales', bdc: 'BDC', service: 'Service' };

/** One dealership (HighLevel sub-account) using Call Coach. Stored in its own DealerCoach Durable Object. */
export interface DealerConfig {
	location_id: string;
	name: string;
	/** The sub-account's Private Integration token. Never returned by any route. */
	token: string;
	timezone: string;
	enabled: boolean;
	send_emails: boolean;
	managers: string[];
	scripts: Partial<Record<Department, string>>;
	/** Dealership phone number that was called (E.164) to the department that answers it. */
	numbers: Record<string, Department>;
	/** HighLevel user id to department, for shared numbers. */
	users: Record<string, Department>;
	default_department: Department;
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
	department: Department;
	user_id: string;
	staff_name: string;
	staff_email: string;
	contact_id: string;
	customer_first: string;
	customer_last: string;
	duration: number;
	earned: number;
	possible: number;
	percent: number;
	appointment_set: boolean;
	analysis: CallAnalysis | null;
	delivery: Delivery;
}

export type Grade = 'green' | 'yellow' | 'red';
