import Anthropic from '@anthropic-ai/sdk';
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';
import { DIRECTORY_NAME, type CoachDirectory } from './directory';
import * as ghl from './ghl';
import { coachingEmail, digestEmail, noteBody, usDate } from './render';
import { totals } from './rubric';
import { scoreCall, transcriptText } from './score';
import { isInboundDepartment, type CallMessage, type CallRecord, type DealerConfig, type DealerConfigInput, type Department, type InboundDepartment, type PublicDealerConfig } from './types';

const CONFIG_KEY = 'config';
const DIGEST_KEY = 'last_digest';
const LAST_CHECK_KEY = 'last_check';
const LISTED_KEY = 'listed';
const ATTEMPTS_PREFIX = 'attempts:';
const POLL_EVERY_MS = 5 * 60 * 1000;
/** Calls are scored once they are this old, so HighLevel has finished the transcript. */
const SCORE_AFTER_MS = 10 * 60 * 1000;
const GIVE_UP_ON_TRANSCRIPT_MS = 3 * 60 * 60 * 1000;
const MAX_CALLS_PER_RUN = 8;
const MAX_ATTEMPTS = 3;
const DIGEST_HOUR = 7;
const DEFAULT_MIN_SECONDS = 60;
const WAIT_FOR_TURN_MS = 45 * 1000;
const WAIT_STEP_MS = 500;

export type CoachResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): CoachResult<never> => ({ ok: false, status, error });

export interface DealerStatus {
	config: PublicDealerConfig;
	/** How many calls HighLevel returned on the last automatic check, and when. */
	last_check: { at: string; calls_seen: number; newest: string; error: string } | null;
	scored: number;
	skipped: number;
	errors: number;
	next_run: string | null;
}

export interface RunReport {
	looked_at: number;
	/** Date range of the calls HighLevel returned. */
	newest: string;
	oldest: string;
	processed: Array<Pick<CallRecord, 'id' | 'status' | 'skip_reason' | 'percent' | 'staff_name'>>;
}

const summary = (record: CallRecord): RunReport['processed'][number] => ({
	id: record.id,
	status: record.status,
	skip_reason: record.skip_reason,
	percent: record.percent,
	staff_name: record.staff_name
});

const departmentMap = (value: Record<string, InboundDepartment> | undefined): Record<string, InboundDepartment> =>
	Object.fromEntries(Object.entries(value ?? {}).filter((entry): entry is [string, InboundDepartment] => isInboundDepartment(entry[1])));

const outbound = (call: CallMessage): boolean => call.direction === 'outbound';

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** One dealership's Call Coach: its settings, every scored call, the poll that finds new calls, and the 7 AM digest. */
export class DealerCoach extends DurableObject<Env> {
	private busy = false;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.createTables();
	}

	private createTables(): void {
		this.ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS calls (id TEXT PRIMARY KEY, local_date TEXT NOT NULL, status TEXT NOT NULL, record TEXT NOT NULL)');
		this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS calls_by_date ON calls (local_date, status)');
	}

	private directory(): DurableObjectStub<CoachDirectory> {
		return this.env.COACH_DIRECTORY.get(this.env.COACH_DIRECTORY.idFromName(DIRECTORY_NAME));
	}

	/** Puts this dealership on the setup page's list. Done once, and again by the poll for dealerships saved before the list existed. */
	private async list(config: DealerConfig): Promise<void> {
		if (await this.ctx.storage.get<boolean>(LISTED_KEY)) return;
		await this.directory().add(config.location_id);
		await this.ctx.storage.put(LISTED_KEY, true);
	}

	/** Removes the dealership for good: its settings, token and every scored call. Notes already in HighLevel stay. */
	async remove(locationId: string): Promise<CoachResult<{ removed: true }>> {
		await this.ctx.storage.deleteAlarm();
		await this.ctx.storage.deleteAll();
		this.createTables();
		await this.directory().remove(locationId);
		return { ok: true, value: { removed: true } };
	}

	private client(): Anthropic {
		return new Anthropic({
			apiKey: this.env.ANTHROPIC_API_KEY,
			maxRetries: 2,
			...(this.env.ANTHROPIC_BASE_URL ? { baseURL: this.env.ANTHROPIC_BASE_URL } : {})
		});
	}

	private config(): Promise<DealerConfig | undefined> {
		return this.ctx.storage.get<DealerConfig>(CONFIG_KEY);
	}

	private publicConfig(config: DealerConfig): PublicDealerConfig {
		const { token, ...rest } = config;
		return { ...rest, has_token: Boolean(token) };
	}

	private localParts(config: DealerConfig, at: Date): { date: string; time: string; hour: number } {
		const date = new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
		const time = new Intl.DateTimeFormat('en-US', { timeZone: config.timezone, hour: 'numeric', minute: '2-digit' }).format(at);
		const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: config.timezone, hour: 'numeric', hourCycle: 'h23' }).format(at));
		return { date, time, hour };
	}

	private stored(id: string): CallRecord | undefined {
		const row = this.ctx.storage.sql.exec<{ record: string }>('SELECT record FROM calls WHERE id = ?', id).toArray()[0];
		return row ? (JSON.parse(row.record) as CallRecord) : undefined;
	}

	private store(record: CallRecord): void {
		this.ctx.storage.sql.exec('INSERT OR REPLACE INTO calls (id, local_date, status, record) VALUES (?, ?, ?, ?)', record.id, record.local_date, record.status, JSON.stringify(record));
	}

	private scoredOn(date: string): CallRecord[] {
		return this.ctx.storage.sql
			.exec<{ record: string }>("SELECT record FROM calls WHERE local_date = ? AND status = 'scored'", date)
			.toArray()
			.map(row => JSON.parse(row.record) as CallRecord);
	}

	/** Creates or updates the dealership's settings. The token is checked against HighLevel before it is saved. */
	async configure(locationId: string, input: DealerConfigInput): Promise<CoachResult<DealerStatus>> {
		const current = await this.config();
		const token = input.token?.trim() || current?.token || '';
		if (!token) return fail(400, 'A HighLevel Private Integration token is required.');
		let found: { name: string; timezone: string };
		try {
			found = await ghl.location({ token, location_id: locationId });
			if (await ghl.readsAnotherLocation({ token, location_id: locationId })) {
				return fail(400, 'That token reads calls from a different sub-account. Create the Private Integration token inside this dealership\'s own sub-account and paste that one.');
			}
		} catch (error) {
			return fail(400, `HighLevel did not accept that token for this sub-account: ${errorText(error)}`);
		}
		const config: DealerConfig = {
			location_id: locationId,
			name: input.name?.trim() || current?.name || found.name || 'Dealership',
			token,
			timezone: input.timezone?.trim() || current?.timezone || found.timezone || 'America/Chicago',
			enabled: input.enabled ?? current?.enabled ?? true,
			send_emails: input.send_emails ?? current?.send_emails ?? true,
			score_outbound: input.score_outbound ?? current?.score_outbound ?? false,
			managers: (input.managers ?? current?.managers ?? []).map(m => m.trim().toLowerCase()).filter(m => m.includes('@')),
			scripts: Object.fromEntries(Object.entries({ ...current?.scripts, ...input.scripts }).filter(([, script]) => script.trim())),
			numbers: departmentMap(input.numbers ?? current?.numbers),
			users: departmentMap(input.users ?? current?.users),
			default_department: isInboundDepartment(input.default_department) ? input.default_department : (current?.default_department ?? 'sales'),
			min_seconds: Math.max(0, Math.round(input.min_seconds ?? current?.min_seconds ?? DEFAULT_MIN_SECONDS)),
			view_key: current?.view_key ?? crypto.randomUUID().replaceAll('-', ''),
			scoring_started_at: input.scoring_started_at ?? current?.scoring_started_at ?? new Date().toISOString()
		};
		try {
			new Intl.DateTimeFormat('en-US', { timeZone: config.timezone });
		} catch {
			return fail(400, `"${config.timezone}" is not a time zone. Use one like America/Chicago.`);
		}
		await this.ctx.storage.put(CONFIG_KEY, config);
		await this.list(config);
		if (config.enabled) await this.ctx.storage.setAlarm(Date.now() + 1000);
		else await this.ctx.storage.deleteAlarm();
		return this.status();
	}

	async status(): Promise<CoachResult<DealerStatus>> {
		const config = await this.config();
		if (!config) return fail(404, 'This dealership is not set up yet.');
		const count = (status: string): number => this.ctx.storage.sql.exec<{ n: number }>('SELECT COUNT(*) AS n FROM calls WHERE status = ?', status).one().n;
		const alarm = await this.ctx.storage.getAlarm();
		return {
			ok: true,
			value: { config: this.publicConfig(config), last_check: (await this.ctx.storage.get<DealerStatus['last_check']>(LAST_CHECK_KEY)) ?? null, scored: count('scored'), skipped: count('skipped'), errors: count('error'), next_run: alarm ? new Date(alarm).toISOString() : null }
		};
	}

	/** The token and sub-account for a valid view key, so the Worker can stream a recording. */
	async access(key: string): Promise<Pick<DealerConfig, 'token' | 'location_id' | 'name' | 'view_key'> | null> {
		const config = await this.config();
		if (!config || !key || key !== config.view_key) return null;
		return { token: config.token, location_id: config.location_id, name: config.name, view_key: config.view_key };
	}

	async day(key: string, date: string | null): Promise<CoachResult<{ date: string; today: string; records: CallRecord[] }>> {
		const config = await this.config();
		if (!config || key !== config.view_key) return fail(404, 'not found');
		const now = Date.now();
		const today = this.localParts(config, new Date(now)).date;
		const yesterday = this.localParts(config, new Date(now - 24 * 60 * 60 * 1000)).date;
		const chosen = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : this.scoredOn(today).length > 0 ? today : yesterday;
		return { ok: true, value: { date: chosen, today, records: this.scoredOn(chosen) } };
	}

	async call(key: string, id: string): Promise<CoachResult<CallRecord>> {
		const config = await this.config();
		if (!config || key !== config.view_key) return fail(404, 'not found');
		const record = this.stored(id);
		return record && record.status === 'scored' ? { ok: true, value: record } : fail(404, 'not found');
	}

	/**
	 * Scores new calls now. With a message id it scores that one call, even an old one, which is how a dealership is
	 * tested before go-live. `deliver: false` scores without writing the note or sending email.
	 */
	async run(options: { message_id?: string; deliver?: boolean } = {}): Promise<CoachResult<RunReport>> {
		const config = await this.config();
		if (!config) return fail(404, 'This dealership is not set up yet.');
		if (!(await this.turn())) return fail(409, 'The automatic check is still running. Try again in a minute.');
		this.busy = true;
		try {
			return { ok: true, value: await this.poll(config, options) };
		} catch (error) {
			return fail(502, errorText(error));
		} finally {
			this.busy = false;
		}
	}

	/** Waits for a run in progress (usually the automatic check) to finish. False when it is still going after the wait. */
	private async turn(): Promise<boolean> {
		const deadline = Date.now() + WAIT_FOR_TURN_MS;
		while (this.busy && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, WAIT_STEP_MS));
		return !this.busy;
	}

	async alarm(): Promise<void> {
		const config = await this.config();
		if (!config?.enabled) return;
		await this.list(config).catch(error => console.error(`call coach ${config.location_id} listing: ${errorText(error)}`));
		if (!this.busy) {
			this.busy = true;
			try {
				const report = await this.poll(config, {});
				await this.ctx.storage.put(LAST_CHECK_KEY, { at: new Date().toISOString(), calls_seen: report.looked_at, newest: report.newest, error: '' });
				await this.digest(config);
			} catch (error) {
				await this.ctx.storage.put(LAST_CHECK_KEY, { at: new Date().toISOString(), calls_seen: 0, newest: '', error: errorText(error).slice(0, 300) });
				console.error(`call coach ${config.location_id}: ${errorText(error)}`);
			} finally {
				this.busy = false;
			}
		}
		await this.ctx.storage.setAlarm(Date.now() + POLL_EVERY_MS);
	}

	private async poll(config: DealerConfig, options: { message_id?: string; deliver?: boolean }): Promise<RunReport> {
		if (options.message_id) {
			const search = await ghl.findCall(config, options.message_id);
			const record = search.call ? await this.process(config, search.call, options.deliver !== false, true) : undefined;
			return { looked_at: search.looked_at, newest: search.newest, oldest: search.oldest, processed: record ? [summary(record)] : [] };
		}
		const calls = await ghl.recentCalls(config);
		const now = Date.now();
		const due = calls.filter(call => {
			const at = Date.parse(call.dateAdded);
			return (
				(call.direction === 'inbound' || (call.direction === 'outbound' && config.score_outbound)) &&
				call.status === 'completed' &&
				(call.meta?.call?.duration ?? 0) >= config.min_seconds &&
				at >= Date.parse(config.scoring_started_at) &&
				now - at >= SCORE_AFTER_MS &&
				!this.stored(call.id)
			);
		});
		const report: RunReport = { looked_at: calls.length, newest: calls[0]?.dateAdded ?? '', oldest: calls[calls.length - 1]?.dateAdded ?? '', processed: [] };
		await this.finishDeliveries(config, calls);
		for (const call of due.reverse().slice(0, MAX_CALLS_PER_RUN)) {
			const record = await this.process(config, call, options.deliver !== false, false);
			if (record) report.processed.push(summary(record));
		}
		return report;
	}

	private blank(config: DealerConfig, call: CallMessage, department: Department): CallRecord {
		const local = this.localParts(config, new Date(call.dateAdded));
		return {
			id: call.id,
			at: call.dateAdded,
			local_date: local.date,
			local_time: local.time,
			status: 'skipped',
			skip_reason: '',
			direction: outbound(call) ? 'outbound' : 'inbound',
			department,
			user_id: call.userId ?? '',
			staff_name: 'Unassigned',
			staff_email: '',
			contact_id: call.contactId ?? '',
			conversation_id: call.conversationId ?? '',
			customer_phone: (outbound(call) ? call.to : call.from) ?? '',
			customer_first: '',
			customer_last: '',
			duration: call.meta?.call?.duration ?? 0,
			earned: 0,
			possible: 0,
			percent: 0,
			appointment_set: false,
			analysis: null,
			delivery: {}
		};
	}

	/** Scores one call and delivers the results. Returns nothing when the transcript is not ready yet. */
	private async process(config: DealerConfig, call: CallMessage, deliver: boolean, forced: boolean): Promise<CallRecord | undefined> {
		const known: Department | undefined = outbound(call) ? 'outbound' : ((call.to ? config.numbers[call.to] : undefined) ?? (call.userId ? config.users[call.userId] : undefined));
		const record = this.blank(config, call, known ?? config.default_department);
		record.delivery = this.stored(call.id)?.delivery ?? {};
		const attemptsKey = ATTEMPTS_PREFIX + call.id;
		try {
			const transcript = transcriptText(await ghl.transcription(config, call.id));
			if (!transcript) {
				if (!forced && Date.now() - Date.parse(call.dateAdded) < GIVE_UP_ON_TRANSCRIPT_MS) return undefined;
				record.skip_reason = 'HighLevel has no transcript for this call';
				this.store(record);
				return record;
			}
			const analysis = await scoreCall(this.client(), this.env.MODEL, {
				dealer: config,
				department: record.department,
				departmentKnown: Boolean(known),
				transcript,
				durationSeconds: record.duration
			});
			record.analysis = analysis;
			record.department = analysis.department;
			if (!analysis.scoreable) {
				record.skip_reason = analysis.skip_reason || 'not a scoreable call';
				this.store(record);
				return record;
			}
			const customer = call.contactId ? await ghl.contact(config, call.contactId).catch(() => undefined) : undefined;
			const staff = await this.staff(config, call, analysis.staff_name_heard, customer?.assigned_to ?? '');
			const heard = analysis.customer_name_heard.split(' ');
			record.user_id = staff?.id ?? '';
			record.staff_name = [staff?.first, staff?.last].filter(Boolean).join(' ') || analysis.staff_name_heard || 'Unassigned';
			record.staff_email = staff?.email ?? '';
			record.customer_first = customer?.first || heard[0] || '';
			record.customer_last = customer?.last || heard.slice(1).join(' ') || (customer?.first || heard[0] ? '' : (call.from ?? ''));
			const total = totals(analysis);
			record.earned = total.earned;
			record.possible = total.possible;
			record.percent = total.percent;
			record.appointment_set = analysis.appointment_set;
			record.status = 'scored';
			this.store(record);
			if (deliver) await this.deliver(config, record);
			await this.ctx.storage.delete(attemptsKey);
			return record;
		} catch (error) {
			const attempts = ((await this.ctx.storage.get<number>(attemptsKey)) ?? 0) + 1;
			console.error(`call coach ${config.location_id} call ${call.id} attempt ${attempts}: ${errorText(error)}`);
			if (record.status === 'scored') {
				await this.ctx.storage.put(attemptsKey, attempts);
				return record;
			}
			if (attempts < MAX_ATTEMPTS && !forced) {
				await this.ctx.storage.put(attemptsKey, attempts);
				return undefined;
			}
			await this.ctx.storage.delete(attemptsKey);
			record.status = 'error';
			record.skip_reason = errorText(error).slice(0, 300);
			this.store(record);
			return record;
		}
	}

	/**
	 * Who took the call: the user HighLevel assigned the call to; else, for calls it leaves unassigned (phone tree
	 * calls), the user whose name matches the one the staff member gave on the call; else the user the contact is assigned to.
	 */
	private async staff(config: DealerConfig, call: CallMessage, nameHeard: string, contactOwner: string): Promise<ghl.Person | undefined> {
		try {
			if (call.userId) return await ghl.user(config, call.userId);
			const named = ghl.userNamed(await ghl.users(config), nameHeard);
			return named ?? (contactOwner ? await ghl.user(config, contactOwner) : undefined);
		} catch {
			return undefined;
		}
	}

	/** Retries a note or email that failed after the call was scored, up to the attempt limit. */
	private async finishDeliveries(config: DealerConfig, calls: CallMessage[]): Promise<void> {
		for (const call of calls) {
			const record = this.stored(call.id);
			if (!record || record.status !== 'scored') continue;
			const noteDue = !record.delivery.note_added && Boolean(record.contact_id);
			const emailDue = !record.delivery.email_sent && config.send_emails && Boolean(record.staff_email || config.managers[0]);
			if (!noteDue && !emailDue) continue;
			const attemptsKey = ATTEMPTS_PREFIX + call.id;
			const attempts = (await this.ctx.storage.get<number>(attemptsKey)) ?? 0;
			if (attempts >= MAX_ATTEMPTS) continue;
			try {
				await this.deliver(config, record);
				await this.ctx.storage.delete(attemptsKey);
			} catch (error) {
				await this.ctx.storage.put(attemptsKey, attempts + 1);
				console.error(`call coach ${config.location_id} delivery ${call.id}: ${errorText(error)}`);
			}
		}
	}

	/** Each step is recorded as it succeeds, so a retry never repeats a note or an email. */
	private async deliver(config: DealerConfig, record: CallRecord): Promise<void> {
		const base = this.env.COACH_BASE_URL;
		if (!record.delivery.note_added && record.contact_id) {
			await ghl.addNote(config, record.contact_id, noteBody(record, base, config));
			record.delivery.note_added = true;
			this.store(record);
		}
		if (!record.delivery.email_sent && config.send_emails) {
			const to = record.staff_email || config.managers[0];
			if (to) {
				const [first, ...rest] = record.staff_email ? record.staff_name.split(' ') : [];
				const contactId = await ghl.contactForEmail(config, to, first ?? '', rest.join(' '));
				const now = this.localParts(config, new Date());
				const email = coachingEmail(record, base, config, `${usDate(now.date)} ${now.time}`);
				await ghl.sendEmail(config, contactId, email.subject, email.html, config.managers.filter(m => m !== to.toLowerCase()));
				record.delivery.email_sent = true;
				this.store(record);
			}
		}
	}

	/** Once a day, at or after 7 AM dealership time, managers get yesterday's summaries. */
	private async digest(config: DealerConfig): Promise<void> {
		const now = new Date();
		const local = this.localParts(config, now);
		if (local.hour < DIGEST_HOUR || (await this.ctx.storage.get<string>(DIGEST_KEY)) === local.date) return;
		const yesterday = this.localParts(config, new Date(now.getTime() - 24 * 60 * 60 * 1000)).date;
		const records = this.scoredOn(yesterday);
		const [to, ...cc] = config.managers;
		if (to && config.send_emails && records.length > 0) {
			const email = digestEmail(yesterday, records, this.env.COACH_BASE_URL, config);
			await ghl.sendEmail(config, await ghl.contactForEmail(config, to, '', ''), email.subject, email.html, cc);
		}
		await this.ctx.storage.put(DIGEST_KEY, local.date);
	}
}
