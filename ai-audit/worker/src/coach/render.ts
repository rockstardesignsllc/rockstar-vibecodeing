import { GRADE_COLORS, GRADE_LABELS, grade, leftOut, rubricFor } from './rubric';
import { DEPARTMENT_LABELS, MOOD_LABELS, PRACTICE_LABELS, TOPIC_LABELS, type CallRecord, type DealerConfig, type Grade, type StaffMember, type Topic } from './types';

type Dealer = Pick<DealerConfig, 'location_id' | 'name' | 'view_key'>;

const FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = '#16181d';
const MUTED = '#5f6672';
const LINE = '#e3e6eb';
const TOPIC_COLORS: Record<Topic, string> = { sales: '#1d4ed8', service: '#7c3aed', other: MUTED };

export const esc = (text: string): string =>
	text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const dealerPath = (base: string, dealer: Dealer): string => `${base}/coach/d/${dealer.location_id}`;
const keyed = (dealer: Dealer, extra = ''): string => `?key=${encodeURIComponent(dealer.view_key)}${extra}`;

export const callUrl = (base: string, dealer: Dealer, id: string): string => `${dealerPath(base, dealer)}/call/${id}${keyed(dealer)}`;
export const recordingUrl = (base: string, dealer: Dealer, id: string): string => `${dealerPath(base, dealer)}/rec/${id}${keyed(dealer)}`;
export const dashboardUrl = (base: string, dealer: Dealer, date?: string): string => `${dealerPath(base, dealer)}${keyed(dealer, date ? `&date=${date}` : '')}`;

export const customerName = (record: CallRecord): string => [record.customer_first, record.customer_last].filter(Boolean).join(' ') || 'Unknown caller';

/** "Last, First" for the alphabetical manager view. */
export const customerSortName = (record: CallRecord): string =>
	record.customer_last ? `${record.customer_last}, ${record.customer_first}`.replace(/, $/, '') : record.customer_first || 'Unknown caller';

const recordGrade = (record: CallRecord): Grade => grade(record.percent, record.analysis?.red_flags.length ?? 0);

const scorecardName = (record: CallRecord): string =>
	record.practice ? `${PRACTICE_LABELS[record.practice.scenario]} practice, ${record.practice.difficulty} difficulty` : `${DEPARTMENT_LABELS[record.department]} scorecard`;
const followUps = (record: CallRecord): string[] => record.analysis?.follow_ups ?? [];
const frustrated = (record: CallRecord): boolean => record.analysis?.customer_mood === 'frustrated';

/**
 * The general scorecard covers calls with no visit to set, so a missing appointment is only shown on the others. The
 * practice record updates (outbound scorecard) have no visit to set either.
 */
const showsAppointment = (record: CallRecord): boolean => record.appointment_set || (record.department !== 'general' && !(record.practice && record.department === 'outbound'));

const isPractice = (record: CallRecord): boolean => Boolean(record.practice);
const realCalls = (records: CallRecord[]): CallRecord[] => records.filter(r => !isPractice(r));
const practiceCalls = (records: CallRecord[]): CallRecord[] => records.filter(isPractice);

/** "Matt Piarski (Sales)" when the staff member is on the dealership's staff list. */
const staffLabel = (name: string, staff: readonly StaffMember[]): string => {
	const listed = staff.find(member => member.name === name);
	return listed ? `${name} (${DEPARTMENT_LABELS[listed.department]})` : name;
};

/** "Jane Smith inbound call 11/10/2026 3:42 PM Bob Jones" */
export const noteTitle = (record: CallRecord): string =>
	record.practice
		? `${customerName(record)} ${usDate(record.local_date)} ${record.local_time} ${record.staff_name}${record.practice.dealership ? `, ${record.practice.dealership}` : ''}`
		: `${customerName(record)} ${record.direction ?? 'inbound'} call ${usDate(record.local_date)} ${record.local_time} ${record.staff_name}`;

export const usDate = (isoDate: string): string => {
	const [y, m, d] = isoDate.split('-');
	return y && m && d ? `${Number(m)}/${Number(d)}/${y}` : isoDate;
};

export function noteBody(record: CallRecord, base: string, dealer: Dealer): string {
	const a = record.analysis;
	if (!a) return noteTitle(record);
	return [
		noteTitle(record),
		'',
		[
			`Call coaching score: ${record.percent}% (${GRADE_LABELS[recordGrade(record)]})`,
			...(a.topic ? [TOPIC_LABELS[a.topic]] : []),
			scorecardName(record),
			...(a.customer_mood ? [`Customer mood: ${MOOD_LABELS[a.customer_mood]}`] : []),
			...(showsAppointment(record) ? [`Appointment set: ${a.appointment_set ? `Yes${a.appointment_time ? `, ${a.appointment_time}` : ''}` : 'No'}`] : [])
		].join(' | '),
		'',
		'SUMMARY',
		a.summary,
		...(followUps(record).length ? ['', 'PROMISED FOLLOW-UPS', ...followUps(record).map(f => `- ${f}`)] : []),
		'',
		'WHAT WENT WELL',
		...a.wins.map(w => `- ${w.title}: ${w.detail}`),
		'',
		'TUNE-UPS',
		...(a.tune_ups.length ? a.tune_ups.map(t => `- ${t.title}: ${t.what_happened} Say this next time: "${t.say_this_next_time}"`) : ['- None. Clean call.']),
		...(a.red_flags.length ? ['', 'RED FLAGS', ...a.red_flags.map(f => `- ${f}`)] : []),
		'',
		`Full summary: ${callUrl(base, dealer, record.id)}`,
		`Call recording: ${recordingUrl(base, dealer, record.id)}`
	].join('\n');
}

const pill = (text: string, color: string): string =>
	`<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color};color:#ffffff;font-size:12px;font-weight:700;white-space:nowrap">${esc(text)}</span>`;

const spaced = (pills: string[]): string => pills.map(p => ` &nbsp;${p}`).join('');

/** The markers shown beside a call wherever calls are listed: topic, appointment, frustrated customer, red flag, follow-ups. */
function badges(record: CallRecord): string[] {
	const topic = record.analysis?.topic;
	const promised = followUps(record).length;
	return [
		...(topic ? [pill(TOPIC_LABELS[topic], TOPIC_COLORS[topic])] : []),
		...(showsAppointment(record) ? [pill(record.appointment_set ? 'Appointment set' : 'No appointment set', record.appointment_set ? GRADE_COLORS.green : GRADE_COLORS.red)] : []),
		...(frustrated(record) ? [pill('Customer frustrated', GRADE_COLORS.red)] : []),
		...((record.analysis?.red_flags.length ?? 0) > 0 ? [pill('Red flag', GRADE_COLORS.red)] : []),
		...(promised ? [pill(`${promised} follow-up${promised === 1 ? '' : 's'} promised`, INK)] : [])
	];
}

const followUpList = (record: CallRecord): string => `<ul style="margin:0;padding-left:20px">${followUps(record).map(f => `<li style="margin:0 0 6px">${esc(f)}</li>`).join('')}</ul>`;

const button = (href: string, label: string): string =>
	`<a href="${esc(href)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${INK};color:#ffffff;font-weight:700;text-decoration:none;font-size:15px">${esc(label)}</a>`;

const section = (title: string, color: string, inner: string): string =>
	`<h2 style="margin:28px 0 10px;font-size:17px;color:${color}">${esc(title)}</h2>${inner}`;

/** The wins-first coaching block shared by the staff email and the full summary page. */
function coachingBlock(record: CallRecord): string {
	const a = record.analysis;
	if (!a) return '';
	const wins = a.wins
		.map(w => `<li style="margin:0 0 10px"><strong>${esc(w.title)}.</strong> ${esc(w.detail)}</li>`)
		.join('');
	const tuneUps = a.tune_ups.length
		? a.tune_ups
				.map(
					t =>
						`<div style="margin:0 0 14px;padding:14px 16px;border:1px solid ${LINE};border-radius:10px"><strong>${esc(t.title)}</strong><div style="margin:6px 0 10px;color:${MUTED}">${esc(t.what_happened)}</div><div style="padding:10px 12px;border-left:4px solid ${GRADE_COLORS.yellow};background:#fff8e6;border-radius:4px"><span style="font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:.04em">Say this next time</span><br>&ldquo;${esc(t.say_this_next_time)}&rdquo;</div></div>`
				)
				.join('')
		: `<p style="margin:0">Nothing to tune up. That was a clean call.</p>`;
	const flags = a.red_flags.length
		? section('Red flags', GRADE_COLORS.red, `<ul style="margin:0;padding-left:20px">${a.red_flags.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`)
		: '';
	const promised = followUps(record).length ? section('Promised follow-ups', INK, followUpList(record)) : '';
	return `${flags}${promised}${section('What you did well', GRADE_COLORS.green, `<ul style="margin:0;padding-left:20px">${wins}</ul>`)}${section('Where to tune it up', '#a66f00', tuneUps)}`;
}

function scoreHeader(record: CallRecord): string {
	const g = recordGrade(record);
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0 4px"><tr><td style="padding:14px 20px;border-radius:12px;background:${GRADE_COLORS[g]};color:#ffffff;font-size:30px;font-weight:800">${record.percent}%</td><td style="padding-left:14px;font-size:14px;color:${MUTED}"><strong style="color:${INK};font-size:15px">${GRADE_LABELS[g]}</strong><br>${esc(scorecardName(record))}, ${Math.round(record.duration / 60)} min${record.analysis?.customer_mood ? `<br>Customer mood: ${esc(MOOD_LABELS[record.analysis.customer_mood])}` : ''}<br><span style="line-height:2.1">${badges(record).join(' ')}</span></td></tr></table>`;
}

const shell = (title: string, inner: string): string =>
	`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head><body style="margin:0;background:#f4f5f7;${FONT};color:${INK};line-height:1.5"><div style="max-width:720px;margin:0 auto;padding:24px 16px"><div style="background:#ffffff;border-radius:14px;padding:26px 24px;border:1px solid ${LINE}">${inner}</div><p style="text-align:center;color:${MUTED};font-size:12px;margin:16px 0 0">Rockstar Call Coach</p></div></body></html>`;

export interface Email {
	subject: string;
	html: string;
}

/** "(727) 644-1825" for a US number, otherwise the number as HighLevel has it. */
export const phoneText = (phone: string): string => {
	const us = /^\+?1?(\d{3})(\d{3})(\d{4})$/.exec(phone.replace(/[^\d+]/g, ''));
	return us ? `(${us[1]}) ${us[2]}-${us[3]}` : phone;
};

/** The call inside HighLevel: its conversation, where the recording and transcript live, or else the contact. */
export const highLevelUrl = (app: string, dealer: Dealer, record: CallRecord): string => {
	const location = `${app}/v2/location/${dealer.location_id}`;
	if (record.conversation_id) return `${location}/conversations/conversations/${record.conversation_id}`;
	return record.contact_id ? `${location}/contacts/detail/${record.contact_id}` : '';
};

/** The short "your call was scored" email. The coaching itself is on the page it links to. */
export function coachingEmail(record: CallRecord, base: string, dealer: Dealer, completedAt: string): Email {
	const first = record.staff_email ? record.staff_name.split(' ')[0] : '';
	const who = [customerName(record), phoneText(record.customer_phone ?? '')].filter(Boolean).join(' ');
	const inner = `<p style="margin:0;font-size:13px;color:${MUTED}">${esc(dealer.name)} call coaching</p><h1 style="margin:4px 0 0;font-size:22px">${first ? `${esc(first)}, your` : 'The'} call with ${esc(customerName(record))} has been scored</h1><p style="margin:4px 0 0;color:${MUTED};font-size:14px">${esc(record.staff_name)}, ${esc(usDate(record.local_date))} at ${esc(record.local_time)}</p>${scoreHeader(record)}<p style="margin:14px 0 0">${esc(record.analysis?.one_line_summary ?? '')}</p>${followUps(record).length ? `<p style="margin:16px 0 6px;font-weight:700">Promised follow-ups</p>${followUpList(record)}` : ''}<p style="margin:24px 0 0">View the call coaching score and summary here:</p><p style="margin:12px 0 0">${button(callUrl(base, dealer, record.id), 'Open the call coaching summary')}</p>`;
	const subject = record.practice
		? `Practice Call Scoring for ${record.staff_name} (${PRACTICE_LABELS[record.practice.scenario]}) complete at ${completedAt}`
		: `Call Scoring for ${who} complete at ${completedAt}`;
	return { subject, html: shell('Call coaching', inner) };
}

export function callPage(record: CallRecord, base: string, dealer: Dealer, app: string): string {
	const a = record.analysis;
	const byId = new Map((a?.items ?? []).map(item => [item.id, item]));
	const scored = { department: record.department, appointment_set: record.appointment_set };
	const rows = rubricFor(record.department)
		.map(item => {
			const result = byId.get(item.id);
			if (leftOut(item, result, scored)) return '';
			const points = Math.min(item.max, Math.max(0, Math.round(result?.points ?? 0)));
			const color = points === item.max ? GRADE_COLORS.green : points === 0 ? GRADE_COLORS.red : GRADE_COLORS.yellow;
			return `<tr><td style="padding:9px 8px 9px 0;border-top:1px solid ${LINE};vertical-align:top"><strong>${esc(item.label)}</strong><div style="color:${MUTED};font-size:13px">${esc(result?.evidence ?? '')}</div></td><td style="padding:9px 0;border-top:1px solid ${LINE};text-align:right;vertical-align:top;white-space:nowrap;font-weight:700;color:${color}">${points} / ${item.max}</td></tr>`;
		})
		.join('');
	const inHighLevel = highLevelUrl(app, dealer, record);
	const inner = `<p style="margin:0;font-size:13px;color:${MUTED}">${esc(dealer.name)} call coaching</p><h1 style="margin:4px 0 0;font-size:22px">${esc(noteTitle(record))}</h1>${scoreHeader(record)}<p style="margin:14px 0 0">${esc(a?.summary ?? '')}</p><audio controls preload="none" src="${esc(recordingUrl(base, dealer, record.id))}" style="width:100%;margin:18px 0 0"></audio>${inHighLevel ? `<p style="margin:16px 0 0">${button(inHighLevel, 'Open this call in Rockstar')}</p>` : ''}${coachingBlock(record)}${section('Scorecard', INK, `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px">${rows}<tr><td style="padding:10px 0;border-top:2px solid ${INK};font-weight:800">Total</td><td style="padding:10px 0;border-top:2px solid ${INK};text-align:right;font-weight:800">${record.earned} / ${record.possible}</td></tr></table>`)}<p style="margin:24px 0 0"><a href="${esc(dashboardUrl(base, dealer))}" style="color:${INK}">Back to all staff</a> &nbsp;|&nbsp; <a href="${esc(dashboardUrl(base, dealer, record.local_date))}" style="color:${INK}">All calls for ${esc(usDate(record.local_date))}</a></p>`;
	return shell(noteTitle(record), inner);
}

interface StaffGroup {
	name: string;
	average: number;
	calls: CallRecord[];
}

const byCustomer = (x: CallRecord, y: CallRecord): number => customerSortName(x).localeCompare(customerSortName(y));
const newestFirst = (x: CallRecord, y: CallRecord): number => y.at.localeCompare(x.at);

function byStaff(records: CallRecord[], order: (x: CallRecord, y: CallRecord) => number = byCustomer): StaffGroup[] {
	const groups = new Map<string, CallRecord[]>();
	for (const record of records) groups.set(record.staff_name, [...(groups.get(record.staff_name) ?? []), record]);
	return [...groups.entries()]
		.map(([name, calls]) => ({
			name,
			average: Math.round(calls.reduce((sum, c) => sum + c.percent, 0) / calls.length),
			calls: [...calls].sort(order)
		}))
		.sort((x, y) => x.name.localeCompare(y.name));
}

/** Staff by average score, then customers "Last, First" with the appointment marker and a one-line summary. */
function summaryBlock(records: CallRecord[], base: string, dealer: Dealer, staff: readonly StaffMember[] = []): string {
	if (records.length === 0) return `<p style="margin:18px 0 0;color:${MUTED}">No scored calls for this day.</p>`;
	return byStaff(records)
		.map(group => {
			const g = grade(group.average);
			const calls = group.calls
				.map(
					c =>
						`<div style="padding:12px 0;border-top:1px solid ${LINE}"><strong>${esc(customerSortName(c))}</strong>${spaced(badges(c))}<div style="margin-top:4px;color:${MUTED};font-size:14px">${esc(c.analysis?.one_line_summary ?? '')} <a href="${esc(callUrl(base, dealer, c.id))}" style="color:${INK};font-weight:600;white-space:nowrap">Full summary and recording (${c.percent}%)</a></div></div>`
				)
				.join('');
			return `<div style="margin:22px 0 0"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%"><tr><td style="font-size:18px;font-weight:800">${esc(staffLabel(group.name, staff))}</td><td style="text-align:right">${pill(`${group.average}% average, ${GRADE_LABELS[g]}`, GRADE_COLORS[g])}</td></tr></table>${calls}</div>`;
		})
		.join('');
}

/** What a manager should act on first: frustrated customers and promises made, each linked to its call. */
function attentionBlock(records: CallRecord[], base: string, dealer: Dealer): string {
	const rows = records
		.filter(r => frustrated(r) || followUps(r).length > 0)
		.sort((x, y) => Number(frustrated(y)) - Number(frustrated(x)) || byCustomer(x, y))
		.map(
			r =>
				`<div style="padding:10px 0;border-top:1px solid ${LINE}"><strong>${esc(customerName(r))}</strong> <span style="color:${MUTED};font-size:13px">with ${esc(r.staff_name)}</span>${frustrated(r) ? ` &nbsp;${pill('Customer frustrated', GRADE_COLORS.red)}` : ''} &nbsp;<a href="${esc(callUrl(base, dealer, r.id))}" style="color:${INK};font-weight:600;font-size:14px;white-space:nowrap">Open call</a>${followUps(r).length ? `<div style="margin-top:6px;font-size:14px">${followUpList(r)}</div>` : ''}</div>`
		)
		.join('');
	return rows ? `<div style="margin:22px 0 0;padding:4px 16px 8px;border:1px solid ${LINE};border-left:5px solid ${GRADE_COLORS.red};border-radius:10px"><h2 style="margin:12px 0 8px;font-size:17px">Needs attention: frustrated customers and promised follow-ups</h2>${rows}</div>` : '';
}

const dayHeading = (dealer: Dealer, date: string, records: CallRecord[]): string => {
	const set = records.filter(r => r.appointment_set).length;
	return `<p style="margin:0;font-size:13px;color:${MUTED}">${esc(dealer.name)}</p><h1 style="margin:4px 0 0;font-size:22px">Call coaching summaries for ${esc(usDate(date))}</h1><p style="margin:6px 0 0;color:${MUTED};font-size:14px">${records.length} scored call${records.length === 1 ? '' : 's'}, ${set} appointment${set === 1 ? '' : 's'} set</p>`;
};

export function digestEmail(date: string, records: CallRecord[], base: string, dealer: Dealer): Email {
	const inner = `${dayHeading(dealer, date, records)}<p style="margin:18px 0 0">${button(dashboardUrl(base, dealer, date), "Yesterday's call coaching summaries")}</p>${attentionBlock(records, base, dealer)}${summaryBlock(records, base, dealer)}`;
	return { subject: `Yesterday's call coaching summaries: ${dealer.name}, ${usDate(date)}`, html: shell('Call coaching summaries', inner) };
}

const viewLink = (href: string, label: string): string => `<a href="${esc(href)}" style="color:${INK};font-weight:600">${esc(label)}</a>`;

/** One collapsed row per staff member with their average, opening to their calls, newest first. */
function staffDetails(records: CallRecord[], base: string, dealer: Dealer, staff: readonly StaffMember[]): string {
	return byStaff(records, newestFirst)
		.map(group => {
			const g = grade(group.average);
			const appointments = group.calls.filter(c => c.appointment_set).length;
			const practice = group.calls.every(isPractice);
			const calls = group.calls
				.map(
					c =>
						`<div style="padding:12px 0;border-top:1px solid ${LINE}"><span style="color:${MUTED};font-size:13px">${esc(usDate(c.local_date))} ${esc(c.local_time)}</span><br><strong>${esc(customerName(c))}</strong> ${spaced([pill(`${c.percent}%`, GRADE_COLORS[recordGrade(c)]), ...badges(c)])}<div style="margin-top:4px;color:${MUTED};font-size:14px">${esc(c.analysis?.one_line_summary ?? '')} <a href="${esc(callUrl(base, dealer, c.id))}" style="color:${INK};font-weight:600;white-space:nowrap">Full summary and recording</a></div></div>`
				)
				.join('');
			const count = `${group.calls.length} ${practice ? 'practice ' : ''}call${group.calls.length === 1 ? '' : 's'}${practice ? '' : `, ${appointments} appointment${appointments === 1 ? '' : 's'} set`}`;
			return `<details style="margin:14px 0 0;border:1px solid ${LINE};border-radius:10px;padding:0 16px"><summary style="cursor:pointer;padding:14px 0;font-size:17px;font-weight:800">${esc(staffLabel(group.name, staff))} &nbsp;${pill(`${group.average}% average, ${GRADE_LABELS[g]}`, GRADE_COLORS[g])} <span style="font-size:13px;font-weight:400;color:${MUTED}">&nbsp;${count}</span></summary>${calls}</details>`;
		})
		.join('');
}

const practiceHeading = (count: number, period: string): string =>
	`<h2 style="margin:34px 0 0;padding-top:22px;border-top:2px solid ${INK};font-size:20px">Practice Calls</h2><p style="margin:6px 0 0;color:${MUTED};font-size:14px">Role-play calls your team made to Rex, the call coach. ${period}: ${count} practice call${count === 1 ? '' : 's'}.</p>`;

/** The dashboard's home view: each staff member with their average, opening to all of their calls in the period, then their practice calls. */
export function staffPage(days: number, today: string, records: CallRecord[], base: string, dealer: Dealer, staff: readonly StaffMember[] = []): string {
	const real = realCalls(records);
	const practice = practiceCalls(records);
	const set = real.filter(r => r.appointment_set).length;
	const heading = `<p style="margin:0;font-size:13px;color:${MUTED}">${esc(dealer.name)}</p><h1 style="margin:4px 0 0;font-size:22px">Call coaching by staff member</h1><p style="margin:6px 0 0;color:${MUTED};font-size:14px">Last ${days} days: ${real.length} scored call${real.length === 1 ? '' : 's'}, ${set} appointment${set === 1 ? '' : 's'} set. Click a name to see their calls. ${viewLink(dashboardUrl(base, dealer, today), 'See one day at a time')}</p>`;
	const none = (what: string): string => `<p style="margin:18px 0 0;color:${MUTED}">No ${what} in the last ${days} days.</p>`;
	return shell(
		`Call coaching: ${dealer.name}`,
		`${heading}${staffDetails(real, base, dealer, staff) || none('scored calls')}${practiceHeading(practice.length, `Last ${days} days`)}${staffDetails(practice, base, dealer, staff) || none('practice calls')}`
	);
}

export function dashboardPage(date: string, today: string, all: CallRecord[], base: string, dealer: Dealer, staff: readonly StaffMember[] = []): string {
	const records = realCalls(all);
	const practice = practiceCalls(all);
	const picker = `<form method="get" action="${esc(dealerPath(base, dealer))}" style="margin:16px 0 0"><input type="hidden" name="key" value="${esc(dealer.view_key)}"><label style="font-size:14px;color:${MUTED}">Day <input type="date" name="date" value="${esc(date)}" max="${esc(today)}" onchange="this.form.submit()" style="font:inherit;padding:6px 8px;border:1px solid ${LINE};border-radius:8px"></label> <noscript><button type="submit">Show</button></noscript></form>`;
	return shell(`Call coaching: ${dealer.name}`, `${dayHeading(dealer, date, records)}${picker}<p style="margin:12px 0 0;font-size:14px">${viewLink(dashboardUrl(base, dealer), 'See the last 30 days by staff member')}</p>${attentionBlock(records, base, dealer)}${summaryBlock(records, base, dealer, staff)}${practice.length ? `${practiceHeading(practice.length, usDate(date))}${summaryBlock(practice, base, dealer, staff)}` : ''}`);
}
