import { DurableObject } from 'cloudflare:workers';
import Anthropic from '@anthropic-ai/sdk';
import { addTags, highLevelReady } from '../highlevel';
import { asInput } from '../tools';
import type { Env, MessageParam } from '../types';
import { readDealerSite } from '../website';
import {
	addDemoNote,
	DEMO_TAG_COMPLETE,
	DEMO_TAG_INCOMPLETE,
	DEMO_TAG_STARTED,
	DEMO_TAG_WANTS_CALL,
	demoFieldValues,
	demoNote,
	upsertDealer,
	writeDemoReport
} from './highlevel';
import { DEMO_OPENING_MESSAGE, DEMO_SESSION_OPENED, DEMO_SYSTEM_PROMPT } from './prompt';
import { COMPLETE_DEMO, DEMO_TOOLS, END_DEMO, parseDealerContact, parseOutcome, READ_DEALER_WEBSITE, SAVE_DEMO_CONTACT, START_DEMO } from './tools';
import type { DemoItem, DemoReply, DemoState, DemoView } from './types';

const STATE_KEY = 'state';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const CHAT_MAX_TOKENS = 4000;
const MAX_TOOL_ROUNDS = 6;
const MAX_TURNS = 50;
export const DEMO_MAX_MESSAGE_CHARS = 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
/** A demo with contact details and no activity for this long is sent to HighLevel as unfinished, so Mat still hears about it. */
const IDLE_MS = 30 * MINUTE_MS;
const ABANDONED_AFTER_MS = 30 * DAY_MS;
const KEEP_REPORTED_MS = 90 * DAY_MS;
const LAST_ALARM_RETRY = 5;

const REFUSAL_REPLY = "Sorry, I can't help with that one. Let's get back to the demo!";
const TURN_LIMIT_REPLY = "This has been a blast! Mat from Rockstar has everything from our chat and will reach out soon.";

type ToolUseBlock = Anthropic.Beta.Messages.BetaToolUseBlock;
type ToolResultBlock = Anthropic.Beta.Messages.BetaToolResultBlockParam;

export type DemoResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = <T>(status: number, error: string): DemoResult<T> => ({ ok: false, status, error });
const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const bubbles = (text: string): DemoItem[] =>
	text
		.split(/\n\s*\n/)
		.map(part => part.trim())
		.filter(Boolean)
		.map(part => ({ kind: 'text', text: part }));

export class DemoSession extends DurableObject<Env> {
	private state: DemoState | undefined;
	private busy = false;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.state = await ctx.storage.get<DemoState>(STATE_KEY);
		});
	}

	private client(): Anthropic {
		return new Anthropic({
			apiKey: this.env.ANTHROPIC_API_KEY,
			maxRetries: 2,
			...(this.env.ANTHROPIC_BASE_URL ? { baseURL: this.env.ANTHROPIC_BASE_URL } : {})
		});
	}

	private async save(): Promise<void> {
		if (!this.state) return;
		this.state.updated_at = new Date().toISOString();
		await this.ctx.storage.put(STATE_KEY, this.state);
	}

	private bookingUrl(state: DemoState): string {
		const url = new URL(this.env.BOOKING_URL);
		const c = state.contact;
		if (c) {
			url.searchParams.set('first_name', c.first_name);
			url.searchParams.set('last_name', c.last_name);
			url.searchParams.set('email', c.email);
			url.searchParams.set('phone', c.mobile);
		}
		return url.toString();
	}

	private reply(state: DemoState, items: DemoItem[]): DemoReply {
		const done = state.status !== 'chatting';
		return {
			session_id: state.id,
			items,
			mode: state.mode,
			dealership_name: state.contact?.dealership_name ?? null,
			done,
			wants_real_demo: done && state.outcome?.wants_real_demo === true,
			booking_url: done ? this.bookingUrl(state) : null,
			first_name: state.contact?.first_name ?? null
		};
	}

	async start(id: string): Promise<DemoResult<DemoReply>> {
		if (this.state) return { ok: true, value: this.reply(this.state, []) };
		const now = new Date().toISOString();
		this.state = {
			id,
			created_at: now,
			updated_at: now,
			last_activity_at: now,
			status: 'chatting',
			mode: 'intake',
			messages: [
				{ role: 'user', content: DEMO_SESSION_OPENED },
				{ role: 'assistant', content: DEMO_OPENING_MESSAGE }
			],
			transcript: [{ speaker: 'rex', text: DEMO_OPENING_MESSAGE, at: now }],
			markers: [],
			prospect_turns: 0,
			highlevel: {}
		};
		await this.save();
		await this.ctx.storage.setAlarm(Date.now() + ABANDONED_AFTER_MS);
		return { ok: true, value: this.reply(this.state, bubbles(DEMO_OPENING_MESSAGE)) };
	}

	async view(): Promise<DemoResult<DemoView>> {
		const state = this.state;
		if (!state) return fail(404, 'demo not found');
		const markersAt = (i: number): DemoItem[] => state.markers.filter(m => m.at_line === i).map(m => m.item);
		return {
			ok: true,
			value: {
				...this.reply(state, markersAt(state.transcript.length)),
				transcript: state.transcript.map(({ speaker, text }, i) => ({ speaker, text, markers_before: markersAt(i) }))
			}
		};
	}

	async send(input: string): Promise<DemoResult<DemoReply>> {
		const state = this.state;
		if (!state) return fail(404, 'demo not found');
		const text = input.trim();
		if (!text) return fail(400, 'message is empty');
		if (text.length > DEMO_MAX_MESSAGE_CHARS) return fail(413, 'message is too long');
		if (this.busy) return fail(409, 'Rex is still typing');
		if (state.prospect_turns >= MAX_TURNS) return { ok: true, value: this.reply(state, [{ kind: 'text', text: TURN_LIMIT_REPLY }]) };

		this.busy = true;
		const before = {
			messages: state.messages.length,
			transcript: state.transcript.length,
			markers: state.markers.length,
			mode: state.mode,
			mock: state.mock_appointment
		};
		try {
			state.messages.push({ role: 'user', content: text });
			state.transcript.push({ speaker: 'prospect', text, at: new Date().toISOString() });
			state.prospect_turns += 1;
			const items = await this.runTurn(state);
			state.last_activity_at = new Date().toISOString();
			await this.save();
			if (state.status === 'chatting' && state.contact && !state.highlevel.partial_reported) {
				await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
			}
			return { ok: true, value: this.reply(state, items) };
		} catch (error) {
			state.messages.length = before.messages;
			state.transcript.length = before.transcript;
			state.markers.length = before.markers;
			state.mode = before.mode;
			state.mock_appointment = before.mock;
			state.prospect_turns -= 1;
			console.error('demo turn failed', state.id, errorMessage(error));
			if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
				return fail(503, 'Rex is a little swamped right now. Please send that again in a moment.');
			}
			if (error instanceof Anthropic.APIConnectionError) return fail(503, 'Rex lost his connection. Please send that again.');
			return fail(502, 'Rex hit a snag. Please send that again.');
		} finally {
			this.busy = false;
		}
	}

	private async runTurn(state: DemoState): Promise<DemoItem[]> {
		const client = this.client();
		const system = DEMO_SYSTEM_PROMPT.replaceAll('{BOOKING_URL}', this.env.BOOKING_URL);
		const items: DemoItem[] = [];

		for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
			const response = await client.beta.messages.create({
				model: this.env.MODEL,
				max_tokens: CHAT_MAX_TOKENS,
				betas: [FALLBACK_BETA],
				fallbacks: 'default',
				cache_control: { type: 'ephemeral' },
				system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
				tools: DEMO_TOOLS,
				output_config: { effort: 'low' },
				messages: state.messages
			});

			if (response.stop_reason === 'refusal') {
				state.messages.push({ role: 'assistant', content: REFUSAL_REPLY });
				state.transcript.push({ speaker: 'rex', text: REFUSAL_REPLY, at: new Date().toISOString() });
				items.push({ kind: 'text', text: REFUSAL_REPLY });
				return items;
			}

			state.messages.push({ role: 'assistant', content: response.content });
			const said = response.content
				.filter(block => block.type === 'text')
				.map(block => block.text.trim())
				.filter(Boolean)
				.join('\n\n');
			if (said) {
				state.transcript.push({ speaker: 'rex', text: said, at: new Date().toISOString() });
				items.push(...bubbles(said));
			}

			const toolUses = response.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
			if (response.stop_reason !== 'tool_use' || toolUses.length === 0) return items;

			const results: ToolResultBlock[] = [];
			for (const use of toolUses) results.push(await this.runTool(state, use, items));
			const toolTurn: MessageParam = { role: 'user', content: results };
			state.messages.push(toolTurn);
		}
		return items;
	}

	private marker(state: DemoState, item: DemoItem, items: DemoItem[]): void {
		state.markers.push({ at_line: state.transcript.length, item });
		items.push(item);
	}

	private async runTool(state: DemoState, use: ToolUseBlock, items: DemoItem[]): Promise<ToolResultBlock> {
		const result = (content: string, isError = false): ToolResultBlock => ({
			type: 'tool_result',
			tool_use_id: use.id,
			content,
			...(isError ? { is_error: true } : {})
		});

		switch (use.name) {
			case READ_DEALER_WEBSITE.name: {
				const url = asInput(use.input).url;
				const site = await readDealerSite(typeof url === 'string' ? url : '');
				state.website_read = true;
				return result(`<website>\n${JSON.stringify(site, null, 2)}\n</website>`, !site.ok);
			}
			case SAVE_DEMO_CONTACT.name: {
				const parsed = parseDealerContact(use.input);
				if (!parsed.ok) return result(`Not saved: ${parsed.problems.join('; ')}.`, true);
				state.contact = parsed.contact;
				await this.save();
				await this.saveStartedContact(state);
				return result('Saved.');
			}
			case START_DEMO.name: {
				if (!state.contact) return result('Not started: call save_contact with all six details first.', true);
				if (state.mode !== 'intake') return result('The demo already started.', true);
				state.mode = 'demo';
				this.marker(state, { kind: 'countdown', dealership: state.contact.dealership_name }, items);
				return result(
					`The dealer just watched a 3, 2, 1 countdown. You are now the AI agent for ${state.contact.dealership_name}. Send only your opener.`
				);
			}
			case END_DEMO.name: {
				if (state.mode !== 'demo') return result('The role-play is not running.', true);
				const input = asInput(use.input);
				const appointment = typeof input.appointment === 'string' ? input.appointment.trim().slice(0, 200) : '';
				const vehicle = typeof input.vehicle === 'string' ? input.vehicle.trim().slice(0, 200) : '';
				state.mock_appointment = [appointment, vehicle].filter(Boolean).join(', ');
				state.mode = 'debrief';
				this.marker(state, { kind: 'demo_over' }, items);
				return result('The role-play is over and the dealer sees a Demo Over banner. You are Rex from Rockstar again. Send your debrief message.');
			}
			case COMPLETE_DEMO.name: {
				if (!state.contact) return result('Not saved: call save_contact first.', true);
				if (state.status !== 'chatting') return result('The demo was already completed. Do not call complete_demo again.', true);
				state.outcome = parseOutcome(use.input);
				state.mode = 'debrief';
				state.status = 'complete';
				state.completed_at = new Date().toISOString();
				await this.save();
				await this.ctx.storage.setAlarm(Date.now() + 1000);
				return result('Demo saved and sent to Mat. Now send your closing message.');
			}
			default:
				return result(`Unknown tool ${use.name}.`, true);
		}
	}

	/** Puts the dealer in HighLevel as soon as their details are in, so a demo abandoned halfway is still a lead. */
	private async saveStartedContact(state: DemoState): Promise<void> {
		if (!state.contact || !highLevelReady(this.env)) return;
		try {
			state.highlevel.contact_id = await upsertDealer(this.env, state.contact, { demo_business_name: state.contact.dealership_name });
			if (!state.highlevel.started_tagged) {
				await addTags(this.env, state.highlevel.contact_id, [DEMO_TAG_STARTED]);
				state.highlevel.started_tagged = true;
			}
			await this.save();
		} catch (error) {
			console.error('saving started demo contact failed', state.id, errorMessage(error));
		}
	}

	async redeliver(): Promise<DemoResult<{ status: string }>> {
		const state = this.state;
		if (!state) return fail(404, 'demo not found');
		if (state.status === 'chatting') return fail(409, 'demo is not finished yet');
		if (state.status === 'reported') return { ok: true, value: { status: 'already delivered' } };
		state.status = 'complete';
		await this.save();
		await this.ctx.storage.setAlarm(Date.now() + 1000);
		return { ok: true, value: { status: 'delivery started' } };
	}

	async alarm(info?: AlarmInvocationInfo): Promise<void> {
		const state = this.state;
		if (!state) return;
		const retryCount = info?.retryCount ?? 0;
		if (state.status === 'complete') return this.deliver(state, retryCount);
		if (state.status === 'chatting') {
			const idle = Date.now() - Date.parse(state.last_activity_at);
			if (state.contact && !state.highlevel.partial_reported && idle >= IDLE_MS) return this.deliverPartial(state, retryCount);
			if (idle < ABANDONED_AFTER_MS) {
				await this.ctx.storage.setAlarm(Date.parse(state.last_activity_at) + ABANDONED_AFTER_MS);
				return;
			}
		}
		await this.ctx.storage.deleteAll();
		this.state = undefined;
	}

	/** Sends a demo the dealer walked away from, so Mat still gets the lead and the conversation. */
	private async deliverPartial(state: DemoState, retryCount: number): Promise<void> {
		try {
			if (!state.contact) return;
			if (!highLevelReady(this.env)) throw new Error('HIGHLEVEL_TOKEN is not set');
			const report = await writeDemoReport(this.client(), this.env.MODEL, state, false);
			const id = await upsertDealer(this.env, state.contact, demoFieldValues(state, report));
			state.highlevel.contact_id = id;
			await addDemoNote(this.env, id, demoNote(state, report, false));
			await addTags(this.env, id, [DEMO_TAG_INCOMPLETE]);
			state.highlevel.partial_reported = true;
			await this.save();
		} catch (error) {
			console.error('partial demo delivery failed', state.id, `attempt ${retryCount + 1}`, errorMessage(error));
			if (retryCount < 2) throw error;
			state.highlevel.partial_reported = true;
			await this.save();
		}
		await this.ctx.storage.setAlarm(Date.parse(state.last_activity_at) + ABANDONED_AFTER_MS);
	}

	/** Writes the recap and sends everything to HighLevel. Each step is recorded, so a retried alarm picks up where it stopped. */
	private async deliver(state: DemoState, retryCount: number): Promise<void> {
		try {
			if (!state.report) {
				state.report = await writeDemoReport(this.client(), this.env.MODEL, state, true);
				await this.save();
			}
			const contact = state.contact;
			if (!contact) throw new Error('demo has no contact');
			if (!highLevelReady(this.env)) throw new Error('HIGHLEVEL_TOKEN is not set');

			const progress = state.highlevel;
			if (!progress.fields_saved || !progress.contact_id) {
				progress.contact_id = await upsertDealer(this.env, contact, demoFieldValues(state, state.report));
				progress.fields_saved = true;
				await this.save();
			}
			if (!progress.note_added) {
				await addDemoNote(this.env, progress.contact_id, demoNote(state, state.report, true));
				progress.note_added = true;
				await this.save();
			}
			if (!progress.complete_tagged) {
				const tags = state.outcome?.wants_real_demo ? [DEMO_TAG_COMPLETE, DEMO_TAG_WANTS_CALL] : [DEMO_TAG_COMPLETE];
				await addTags(this.env, progress.contact_id, tags);
				progress.complete_tagged = true;
			}
			state.status = 'reported';
			state.last_error = undefined;
			await this.save();
			await this.ctx.storage.setAlarm(Date.now() + KEEP_REPORTED_MS);
		} catch (error) {
			state.last_error = errorMessage(error);
			console.error('demo delivery failed', state.id, `attempt ${retryCount + 1}`, state.last_error);
			if (retryCount < LAST_ALARM_RETRY) {
				await this.save();
				throw error;
			}
			state.status = 'failed';
			await this.save();
			await this.ctx.storage.setAlarm(Date.now() + KEEP_REPORTED_MS);
		}
	}
}
