import { phoneKey } from './ghl';
import type { StaffMember } from './types';

/** A first name for comparing: lower case letters with doubled letters collapsed, so "Matt" and "Mat" are the same. */
const firstKey = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
const lastKey = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

const parts = (name: string): { first: string; last: string } => {
	const [first = '', ...rest] = name.trim().split(/\s+/);
	return { first: firstKey(first), last: lastKey(rest.join('')) };
};

/** Two last names agree when either is missing or one starts the other, so "K" fits "Koenig". */
const lastsAgree = (x: string, y: string): boolean => !x || !y || x.startsWith(y) || y.startsWith(x);

export interface StaffQuery {
	name?: string;
	email?: string;
	phone?: string;
}

/**
 * The one staff member on the dealership's list that a call belongs to: by email, else by phone, else by name. A name
 * matches on the first name, narrowed by the last name or initial when both sides have one. Nobody is returned when
 * the name fits no one or more than one person.
 */
export function rosterMatch(staff: readonly StaffMember[], query: StaffQuery): StaffMember | undefined {
	const email = query.email?.trim().toLowerCase();
	const byEmail = email ? staff.filter(member => member.email === email) : [];
	if (byEmail.length === 1) return byEmail[0];
	const phone = query.phone ? phoneKey(query.phone) : '';
	const byPhone = phone ? staff.filter(member => phoneKey(member.phone) === phone) : [];
	if (byPhone.length === 1) return byPhone[0];
	const heard = parts(query.name ?? '');
	if (!heard.first) return undefined;
	const byName = staff.filter(member => {
		const listed = parts(member.name);
		return listed.first === heard.first && lastsAgree(listed.last, heard.last);
	});
	return byName.length === 1 ? byName[0] : undefined;
}
