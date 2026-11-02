import type { MessageParam, TranscriptLine } from '../types';

/** Where the chat is: collecting details, Rex playing the dealership's AI, or the debrief after the demo. */
export type DemoMode = 'intake' | 'demo' | 'debrief';

export interface DealerContact {
	first_name: string;
	last_name: string;
	dealership_name: string;
	website: string;
	mobile: string;
	email: string;
}

export interface DemoOutcome {
	dealership_type: string;
	vehicle_of_interest: string;
	questions_asked: string;
	price_quoted: string;
	mock_appointment: string;
	reaction: string;
	wants_real_demo: boolean;
	website_findings: string;
}

export interface DemoReport {
	ai_summary: string;
	demo_thoughts: string;
	next_steps_for_mat: string;
}

export type DemoStatus = 'chatting' | 'complete' | 'reported' | 'failed';

export interface DemoHighLevelProgress {
	contact_id?: string;
	started_tagged?: boolean;
	partial_reported?: boolean;
	fields_saved?: boolean;
	note_added?: boolean;
	complete_tagged?: boolean;
}

/** One item in a chat reply. The page shows text as bubbles and turns the markers into the countdown and the demo-over banner. */
export type DemoItem = { kind: 'text'; text: string } | { kind: 'countdown'; dealership: string } | { kind: 'demo_over' };

export interface DemoState {
	id: string;
	created_at: string;
	updated_at: string;
	last_activity_at: string;
	status: DemoStatus;
	mode: DemoMode;
	messages: MessageParam[];
	transcript: TranscriptLine[];
	/** The countdown and demo-over markers, by transcript position, so a reloaded page shows them in the right place. */
	markers: Array<{ at_line: number; item: DemoItem }>;
	prospect_turns: number;
	contact?: DealerContact;
	website_read?: boolean;
	mock_appointment?: string;
	outcome?: DemoOutcome;
	completed_at?: string;
	report?: DemoReport;
	highlevel: DemoHighLevelProgress;
	last_error?: string;
}

export interface DemoReply {
	session_id: string;
	items: DemoItem[];
	mode: DemoMode;
	dealership_name: string | null;
	done: boolean;
	wants_real_demo: boolean;
	/** The founder demo booking link, prefilled with the dealer's details. Set once the demo is done. */
	booking_url: string | null;
	first_name: string | null;
}

export interface DemoView extends DemoReply {
	transcript: Array<{ speaker: TranscriptLine['speaker']; text: string; markers_before: DemoItem[] }>;
}
