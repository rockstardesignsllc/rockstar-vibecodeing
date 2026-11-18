import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

const PREFIX = 'dealer:';
const CODE_PREFIX = 'code:';
const EXPIRY_PREFIX = 'expires:';
const CODE_ATTEMPTS = 20;
const SWEEP_LIMIT = 60;

/** The single instance every dealership registers with, so the setup page can list them. */
export const DIRECTORY_NAME = 'all';

/** Where a practice code points: one scored call at one dealership. */
export interface CodeEntry {
	location_id: string;
	call_id: string;
	/** Epoch milliseconds after which the code no longer works. */
	expires: number;
}

/** A six-digit code with no leading zero, so it reads the same spoken or typed. */
const randomCode = (): string => String(100_000 + (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 900_000);

const expiryKey = (expires: number, code: string): string => `${EXPIRY_PREFIX}${String(expires).padStart(15, '0')}:${code}`;

/**
 * The list of dealerships set up for Call Coach, and the practice codes of every dealership. Each dealership's
 * settings and calls stay in its own DealerCoach.
 */
export class CoachDirectory extends DurableObject<Env> {
	async add(locationId: string): Promise<void> {
		await this.ctx.storage.put(PREFIX + locationId, true);
	}

	async remove(locationId: string): Promise<void> {
		await this.ctx.storage.delete(PREFIX + locationId);
	}

	async list(): Promise<string[]> {
		const found = await this.ctx.storage.list<boolean>({ prefix: PREFIX });
		return [...found.keys()].map(key => key.slice(PREFIX.length));
	}

	/**
	 * Gives a scored call a practice code no other live call holds. Entries are kept until `keepUntil`, which may be
	 * later than `expires` so a practice call made just before expiry can still be matched when it is scored.
	 */
	async issueCode(locationId: string, callId: string, expires: number, keepUntil: number): Promise<string> {
		await this.sweep();
		for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
			const code = randomCode();
			if (await this.ctx.storage.get<CodeEntry>(CODE_PREFIX + code)) continue;
			const entry: CodeEntry = { location_id: locationId, call_id: callId, expires };
			await this.ctx.storage.put({ [CODE_PREFIX + code]: entry, [expiryKey(keepUntil, code)]: true });
			return code;
		}
		throw new Error('no free practice code');
	}

	async findCode(code: string): Promise<CodeEntry | null> {
		return /^\d{6}$/.test(code) ? ((await this.ctx.storage.get<CodeEntry>(CODE_PREFIX + code)) ?? null) : null;
	}

	/** Drops codes that are past keeping, oldest first, a batch at a time. */
	private async sweep(): Promise<void> {
		const due = await this.ctx.storage.list<boolean>({ prefix: EXPIRY_PREFIX, end: expiryKey(Date.now(), ''), limit: SWEEP_LIMIT });
		if (due.size === 0) return;
		const keys = [...due.keys()];
		await this.ctx.storage.delete([...keys, ...keys.map(key => CODE_PREFIX + key.slice(key.lastIndexOf(':') + 1))]);
	}
}
