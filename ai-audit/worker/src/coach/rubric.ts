import type { CallAnalysis, Department, Grade, ItemResult } from './types';

export interface RubricItem {
	id: string;
	label: string;
	max: number;
	/** What earns the points. Read by Claude. */
	guide: string;
	departments: readonly Department[];
	/** Counted only when an appointment was set on the call. */
	needs_appointment?: boolean;
}

const SALES: readonly Department[] = ['sales', 'bdc'];
const SERVICE: readonly Department[] = ['service'];
const INBOUND: readonly Department[] = ['sales', 'bdc', 'service'];
const OUTBOUND: readonly Department[] = ['outbound'];
const ALL: readonly Department[] = ['sales', 'bdc', 'service', 'outbound'];

export const RUBRIC: readonly RubricItem[] = [
	{ id: 'appointment_set', label: 'Appointment set', max: 3, guide: '3 if a specific day and time to come in was agreed. Otherwise 0. On an outbound call only, mark it not applicable when the call had no visit to set (for example a paperwork, payment or delivery update).', departments: ALL },
	{
		id: 'outbound_intro',
		label: 'Said who they are and why they are calling',
		max: 1,
		guide: '1 if the staff member gave their name, the dealership and the reason for the call in the first moments.',
		departments: OUTBOUND
	},
	{
		id: 'outbound_purpose',
		label: 'Moved the call toward its goal',
		max: 2,
		guide: '2 if the staff member kept the call on its purpose and made a clear ask (a visit, a decision, the information needed). 1 if the purpose was clear but no ask was made. 0 if the call wandered or ended with nothing asked.',
		departments: OUTBOUND
	},
	{
		id: 'followed_framework',
		label: "Followed the dealership's call framework",
		max: 2,
		guide: '2 if the call follows the framework steps closely and in order, 1 if partly, 0 if it ignores the framework.',
		departments: ALL
	},
	{ id: 'greeting', label: 'Greeted the caller the way the framework says', max: 1, guide: '1 if the greeting matches the framework greeting in substance.', departments: INBOUND },
	{ id: 'asked_name', label: "Asked for the customer's name", max: 1, guide: '1 if the staff member asked for the name (first and last when the framework asks for both).', departments: INBOUND },
	{ id: 'used_name', label: "Used the customer's name during the call", max: 1, guide: '1 if the staff member addressed the customer by name at least once after learning it.', departments: ALL },
	{ id: 'asked_phone', label: 'Asked for the best phone number', max: 1, guide: '1 if the staff member asked for or confirmed a phone number.', departments: INBOUND },
	{
		id: 'vehicle_and_alternatives',
		label: 'Confirmed the vehicle and asked about alternatives',
		max: 1,
		guide: '1 if the staff member confirmed which vehicle the customer wants and asked whether they are open to similar vehicles.',
		departments: SALES
	},
	{ id: 'asked_trade', label: 'Asked what they are driving now (trade)', max: 1, guide: '1 if the staff member asked about the current vehicle or a trade.', departments: SALES },
	{
		id: 'handled_questions',
		label: 'Answered questions, then went back to the appointment',
		max: 2,
		guide: '2 if every customer question or objection (price, availability, payments) was answered briefly and followed by an appointment ask or an either-or question. 1 if done some of the time. 0 if the staff member got stuck negotiating or just answered and stopped. Give 2 if the customer raised no questions.',
		departments: [...SALES, ...OUTBOUND]
	},
	{ id: 'offered_appointment', label: 'Asked for the appointment', max: 1, guide: '1 if the staff member invited the customer to come in to see or test drive the vehicle.', departments: SALES },
	{
		id: 'two_times',
		label: 'Offered a choice of two times',
		max: 1,
		guide: '1 if the staff member offered an either-or choice of times (for example "now or later today", "2:15 or 4:45").',
		departments: ALL
	},
	{
		id: 'service_vehicle',
		label: 'Got the vehicle details',
		max: 1,
		guide: '1 if the staff member got the year, make and model, and mileage when relevant.',
		departments: SERVICE
	},
	{
		id: 'service_concern',
		label: "Captured the concern in the customer's words",
		max: 2,
		guide: '2 if the staff member asked what is going on with the vehicle and repeated it back, 1 if only asked, 0 if neither.',
		departments: SERVICE
	},
	{
		id: 'service_transport',
		label: 'Asked about waiting, drop off or a ride',
		max: 1,
		guide: '1 if the staff member asked whether the customer will wait, drop off, or needs a shuttle or loaner.',
		departments: SERVICE
	},
	{
		id: 'service_expectations',
		label: 'Set time expectations',
		max: 1,
		guide: '1 if the staff member told the customer roughly how long the visit will take or when they will get an update.',
		departments: SERVICE
	},
	{
		id: 'directions',
		label: 'Asked "do you know where we\'re located?" and gave landmarks',
		max: 1,
		guide: '1 if the staff member asked whether the customer knows the location and gave directions with landmarks.',
		departments: ALL,
		needs_appointment: true
	},
	{
		id: 'confirmed_time',
		label: 'Confirmed the appointment day and time',
		max: 1,
		guide: '1 if the staff member repeated the appointment day and time back to the customer.',
		departments: ALL,
		needs_appointment: true
	},
	{
		id: 'gave_contact_info',
		label: 'Gave their own name and contact info',
		max: 1,
		guide: '1 if the staff member gave their own name and a way to reach them (spelling their name, a phone number, or texting a contact card) so the customer can call if plans change.',
		departments: ALL,
		needs_appointment: true
	},
	{
		id: 'early_late_call',
		label: 'Asked for a call if running early or late',
		max: 1,
		guide: '1 if the staff member asked the customer to call if they will be earlier or later than the appointment time.',
		departments: ALL,
		needs_appointment: true
	},
	{ id: 'other_questions', label: 'Asked if they had any other questions', max: 1, guide: '1 if the staff member asked whether the customer had any other questions before ending.', departments: ALL },
	{
		id: 'tone',
		label: 'Tone and energy',
		max: 2,
		guide: '2 if friendly, confident and in control with no long dead air. 1 if fine but flat or hesitant. 0 if rude, rushed or dismissive.',
		departments: ALL
	},
	{
		id: 'next_step',
		label: 'Ended with a clear next step',
		max: 1,
		guide: '1 if the call ended with a specific next step both sides understood (an appointment, a scheduled call back, a text with info).',
		departments: ALL
	}
];

export const rubricFor = (department: Department): RubricItem[] => RUBRIC.filter(item => item.departments.includes(department));

type Scored = Pick<CallAnalysis, 'department' | 'appointment_set'>;

/**
 * True when an item is left out of a call's score: appointment follow-through when no appointment was set, and any
 * item marked not applicable. "Appointment set" always counts on an inbound call.
 */
export function leftOut(item: RubricItem, result: ItemResult | undefined, call: Scored): boolean {
	if (item.needs_appointment && !call.appointment_set) return true;
	if (!result || result.applicable) return false;
	return item.id !== 'appointment_set' || call.department === 'outbound';
}

export interface Totals {
	earned: number;
	possible: number;
	percent: number;
}

/** Totals over the items that apply to this call. Appointment follow-through items only count when one was set. */
export function totals(analysis: CallAnalysis): Totals {
	const byId = new Map<string, ItemResult>(analysis.items.map(item => [item.id, item]));
	let earned = 0;
	let possible = 0;
	for (const item of rubricFor(analysis.department)) {
		const result = byId.get(item.id);
		if (leftOut(item, result, analysis)) continue;
		possible += item.max;
		earned += Math.min(item.max, Math.max(0, Math.round(result?.points ?? 0)));
	}
	const percent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
	return { earned, possible, percent };
}

export const GREEN_AT = 80;
export const YELLOW_AT = 60;

/** A red flag caps the call at yellow. */
export function grade(percent: number, redFlags = 0): Grade {
	if (percent >= GREEN_AT) return redFlags > 0 ? 'yellow' : 'green';
	return percent >= YELLOW_AT ? 'yellow' : 'red';
}

export const GRADE_COLORS: Record<Grade, string> = { green: '#1a9c4b', yellow: '#d99a00', red: '#d93025' };
export const GRADE_LABELS: Record<Grade, string> = { green: 'Good', yellow: 'Average', red: 'Needs improvement' };
