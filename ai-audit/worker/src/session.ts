import { DurableObject } from 'cloudflare:workers';
import Anthropic from '@anthropic-ai/sdk';
import { addNote, addTags, auditFieldValues, auditNote, completeTags, highLevelReady, startedTags, upsertContact } from './highlevel';
import { OPENING_MESSAGE, REX_SYSTEM_PROMPT, SESSION_OPENED } from './prompt';
import { writeReport } from './report';
import { COMPLETE_AUDIT, READ_WEBSITE, SAVE_CONTACT, TOOLS, asInput, parseAnswers, parseContact } from './tools';
import type { ChatReply, Env, MessageParam, SessionState, SessionView } from './types';
import { readWebsite } from './website';

const STATE_KEY = 'state';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const CHAT_MAX_TOKENS = 8000;
const MAX_TOOL_ROUNDS = 6;
const MAX_PROSPECT_TURNS = 60;
export const MAX_MESSAGE_CHARS = 1500;
const DAY_MS = 24 * 60 * 60 * 1000;
const ABANDONED_AFTER_MS = 30 * DAY_MS;
const KEEP_REPORTED_MS = 90 * DAY_MS;
const LAST_ALARM_RETRY = 5;

const REFUSAL_REPLY = "Sorry, I can't help with that one. Let's get back to your audit!";
const TURN_LIMIT_REPLY =
	"We've covered a lot of ground! The Rockstar team has everything they need from this chat and will be in touch soon.";

type ToolUseBlock = Anthropic.Beta.Messages.BetaToolUseBlock;
type ToolResultBlock = Anthropic.Beta.Messages.BetaToolResultBlockParam;

export type SessionResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = <T>(status: number, error: string): SessionResult<T> => ({ ok: false, status, error });

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Splits a reply on blank lines so each paragraph shows as its own chat bubble. */
const bubbles = (text: string): string[] =>
	text
		.split(/\n\s*\n/)
		.map(part => part.trim())
		.filter(Boolean);

export class AuditSession extends DurableObject<Env> {
	/** One in-memory copy shared by chat turns and the delivery alarm, so neither overwrites the other's changes. */
	private state: SessionState | undefined;
	private busy = false;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => {
			this.state = await ctx.storage.get<SessionState>(STATE_KEY);
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

	private systemPrompt(): string {
		return REX_SYSTEM_PROMPT.replaceAll('{BOOKING_URL}', this.env.BOOKING_URL);
	}

	private bookingUrl(state: SessionState): string {
		const url = new URL(this.env.BOOKING_URL);
		const contact = state.contact;
		if (contact) {
			url.searchParams.set('first_name', contact.first_name);
			url.searchParams.set('last_name', contact.last_name);
			url.searchParams.set('email', contact.email);
			url.searchParams.set('phone', contact.mobile);
		}
		return url.toString();
	}

	private reply(state: SessionState, messages: string[]): ChatReply {
		const done = state.status !== 'chatting';
		return {
			session_id: state.id,
			messages,
			done,
			wants_call: done && state.answers?.wants_strategy_call === true,
			booking_url: done ? this.bookingUrl(state) : null,
			first_name: done ? (state.contact?.first_name ?? null) : null
		};
	}

	async start(id: string): Promise<SessionResult<ChatReply>> {
		if (this.state) return { ok: true, value: this.reply(this.state, []) };
		const now = new Date().toISOString();
		this.state = {
			id,
			created_at: now,
			updated_at: now,
			status: 'chatting',
			messages: [
				{ role: 'user', content: SESSION_OPENED },
				{ role: 'assistant', content: OPENING_MESSAGE }
			],
			transcript: [{ speaker: 'rex', text: OPENING_MESSAGE, at: now }],
			prospect_turns: 0,
			highlevel: {}
		};
		await this.save();
		await this.ctx.storage.setAlarm(Date.now() + ABANDONED_AFTER_MS);
		return { ok: true, value: this.reply(this.state, bubbles(OPENING_MESSAGE)) };
	}

	async view(): Promise<SessionResult<SessionView>> {
		const state = this.state;
		if (!state) return fail(404, 'audit not found');
		return {
			ok: true,
			value: { ...this.reply(state, []), transcript: state.transcript.map(({ speaker, text }) => ({ speaker, text })) }
		};
	}

	async send(input: string): Promise<SessionResult<ChatReply>> {
		const state = this.state;
		if (!state) return fail(404, 'audit not found');
		const text = input.trim();
		if (!text) return fail(400, 'message is empty');
		if (text.length > MAX_MESSAGE_CHARS) return fail(413, 'message is too long');
		if (this.busy) return fail(409, 'Rex is still typing');
		if (state.prospect_turns >= MAX_PROSPECT_TURNS) return { ok: true, value: this.reply(state, [TURN_LIMIT_REPLY]) };

		this.busy = true;
		const messageCount = state.messages.length;
		const transcriptCount = state.transcript.length;
		try {
			state.messages.push({ role: 'user', content: text });
			state.transcript.push({ speaker: 'prospect', text, at: new Date().toISOString() });
			state.prospect_turns += 1;
			const texts = await this.runTurn(state);
			await this.save();
			return { ok: true, value: this.reply(state, texts.flatMap(bubbles)) };
		} catch (error) {
			state.messages.length = messageCount;
			state.transcript.length = transcriptCount;
			state.prospect_turns -= 1;
			console.error('chat turn failed', state.id, errorMessage(error));
			if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
				return fail(503, 'Rex is a little swamped right now. Please send that again in a moment.');
			}
			if (error instanceof Anthropic.APIConnectionError) return fail(503, 'Rex lost his connection. Please send that again.');
			return fail(502, 'Rex hit a snag. Please send that again.');
		} finally {
			this.busy = false;
		}
	}

	/** Runs one prospect turn: calls Claude, runs any tools Rex asks for, and returns Rex's text in order. */
	private async runTurn(state: SessionState): Promise<string[]> {
		const client = this.client();
		const system = this.systemPrompt();
		const texts: string[] = [];

		for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
			const response = await client.beta.messages.create({
				model: this.env.MODEL,
				max_tokens: CHAT_MAX_TOKENS,
				betas: [FALLBACK_BETA],
				fallbacks: 'default',
				cache_control: { type: 'ephemeral' },
				system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
				tools: TOOLS,
				output_config: { effort: 'medium' },
				messages: state.messages
			});

			if (response.stop_reason === 'refusal') {
				this.appendRex(state, REFUSAL_REPLY);
				texts.push(REFUSAL_REPLY);
				return texts;
			}

			state.messages.push({ role: 'assistant', content: response.content });
			const said = response.content
				.filter(block => block.type === 'text')
				.map(block => block.text.trim())
				.filter(Boolean)
				.join('\n\n');
			if (said) {
				state.transcript.push({ speaker: 'rex', text: said, at: new Date().toISOString() });
				texts.push(said);
			}

			const toolUses = response.content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
			if (response.stop_reason !== 'tool_use' || toolUses.length === 0) return texts;

			const results: ToolResultBlock[] = [];
			for (const use of toolUses) results.push(await this.runTool(state, use));
			const toolTurn: MessageParam = { role: 'user', content: results };
			state.messages.push(toolTurn);
		}
		return texts;
	}

	private appendRex(state: SessionState, text: string): void {
		state.messages.push({ role: 'assistant', content: text });
		state.transcript.push({ speaker: 'rex', text, at: new Date().toISOString() });
	}

	private async runTool(state: SessionState, use: ToolUseBlock): Promise<ToolResultBlock> {
		const result = (content: string, isError = false): ToolResultBlock => ({
			type: 'tool_result',
			tool_use_id: use.id,
			content,
			...(isError ? { is_error: true } : {})
		});

		if (use.name === READ_WEBSITE.name) {
			const url = asInput(use.input).url;
			const site = await readWebsite(typeof url === 'string' ? url : '');
			return result(`<website>\n${JSON.stringify(site, null, 2)}\n</website>`, !site.ok);
		}

		if (use.name === SAVE_CONTACT.name) {
			const parsed = parseContact(use.input);
			if (!parsed.ok) return result(`Not saved: ${parsed.problems.join('; ')}.`, true);
			state.contact = parsed.contact;
			await this.save();
			await this.saveStartedContact(state);
			return result('Saved.');
		}

		if (use.name === COMPLETE_AUDIT.name) {
			if (!state.contact) return result('Not saved: call save_contact with the prospect details first.', true);
			if (state.status !== 'chatting') return result('The audit was already completed. Do not call complete_audit again.', true);
			state.answers = parseAnswers(use.input);
			state.status = 'complete';
			state.completed_at = new Date().toISOString();
			await this.save();
			await this.ctx.storage.setAlarm(Date.now() + 1000);
			return result('Audit saved and sent to the Rockstar team. Now send your closing message.');
		}

		return result(`Unknown tool ${use.name}.`, true);
	}

	/** Puts the prospect in HighLevel as soon as their details are in, so an audit abandoned halfway is still a lead. */
	private async saveStartedContact(state: SessionState): Promise<void> {
		if (!state.contact || !highLevelReady(this.env)) return;
		try {
			state.highlevel.contact_id = await upsertContact(this.env, state.contact);
			if (!state.highlevel.started_tagged) {
				await addTags(this.env, state.highlevel.contact_id, startedTags());
				state.highlevel.started_tagged = true;
			}
			await this.save();
		} catch (error) {
			console.error('saving started contact failed', state.id, errorMessage(error));
		}
	}

	/** Sends a completed or failed audit to HighLevel again, for example after fixing HIGHLEVEL_TOKEN. */
	async redeliver(): Promise<SessionResult<{ status: string }>> {
		const state = this.state;
		if (!state) return fail(404, 'audit not found');
		if (state.status === 'chatting') return fail(409, 'audit is not finished yet');
		if (state.status === 'reported') return { ok: true, value: { status: 'already delivered' } };
		state.status = 'complete';
		await this.save();
		await this.ctx.storage.setAlarm(Date.now() + 1000);
		return { ok: true, value: { status: 'delivery started' } };
	}

	async alarm(info?: AlarmInvocationInfo): Promise<void> {
		const state = this.state;
		if (!state) return;
		if (state.status === 'complete') return this.deliver(state, info?.retryCount ?? 0);
		await this.ctx.storage.deleteAll();
		this.state = undefined;
	}

	/** Writes the report and sends everything to HighLevel. Each step is recorded, so a retried alarm picks up where it stopped. */
	private async deliver(state: SessionState, retryCount: number): Promise<void> {
		try {
			if (!state.report) {
				state.report = await writeReport(this.client(), this.env.MODEL, this.env.BOOKING_URL, state);
				await this.save();
			}
			const contact = state.contact;
			if (!contact) throw new Error('audit has no contact');
			if (!highLevelReady(this.env)) throw new Error('HIGHLEVEL_TOKEN is not set');

			const progress = state.highlevel;
			if (!progress.fields_saved || !progress.contact_id) {
				progress.contact_id = await upsertContact(this.env, contact, auditFieldValues(state, state.report));
				progress.fields_saved = true;
				await this.save();
			}
			if (!progress.note_added) {
				await addNote(this.env, progress.contact_id, auditNote(state, state.report));
				progress.note_added = true;
				await this.save();
			}
			if (!progress.complete_tagged) {
				await addTags(this.env, progress.contact_id, completeTags(state));
				progress.complete_tagged = true;
			}
			state.status = 'reported';
			state.last_error = undefined;
			await this.save();
			await this.ctx.storage.setAlarm(Date.now() + KEEP_REPORTED_MS);
		} catch (error) {
			state.last_error = errorMessage(error);
			console.error('audit delivery failed', state.id, `attempt ${retryCount + 1}`, state.last_error);
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
