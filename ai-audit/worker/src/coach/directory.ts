import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

const PREFIX = 'dealer:';

/** The single instance every dealership registers with, so the setup page can list them. */
export const DIRECTORY_NAME = 'all';

/** The list of dealerships set up for Call Coach. Each dealership's settings stay in its own DealerCoach. */
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
}
