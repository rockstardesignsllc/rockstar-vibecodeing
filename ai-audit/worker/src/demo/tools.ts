import type Anthropic from '@anthropic-ai/sdk';
import { asInput, normalizePhone, type ToolInput } from '../tools';
import { normalizeUrl } from '../website';
import type { DealerContact, DemoOutcome } from './types';

type Tool = Anthropic.Beta.Messages.BetaTool;

const text = (description: string) => ({ type: 'string', description }) as const;

const objectSchema = (properties: Record<string, object>): Tool['input_schema'] => ({
	type: 'object',
	properties,
	required: Object.keys(properties),
	additionalProperties: false
});

export const READ_DEALER_WEBSITE: Tool = {
	name: 'read_dealer_website',
	description:
		"Quickly reads the dealership's homepage and About page (no inventory) and returns the title, description, headings and a text excerpt of each. Call it as soon as the dealer gives their website.",
	input_schema: objectSchema({ url: text('The website address the dealer gave') }),
	strict: true
};

export const SAVE_DEMO_CONTACT: Tool = {
	name: 'save_contact',
	description:
		"Saves the dealer's details to the Rockstar CRM. Call it once you have all six details. If it returns an error, ask for the detail it names and call it again.",
	input_schema: objectSchema({
		first_name: text('First name'),
		last_name: text('Last name'),
		dealership_name: text('Dealership name'),
		website: text('Dealership website exactly as given'),
		mobile: text('Mobile number exactly as given'),
		email: text('Email address exactly as given')
	}),
	strict: true
};

export const START_DEMO: Tool = {
	name: 'start_demo',
	description:
		"Starts the role-play: the dealer's screen shows a 3, 2, 1 countdown, and from then on you are their dealership's AI agent. Call it after save_contact succeeds and you have told them the vehicle details will be made up.",
	input_schema: objectSchema({}),
	strict: true
};

export const END_DEMO: Tool = {
	name: 'end_demo',
	description:
		"Ends the role-play right after you confirm the mock appointment in character. The dealer's screen shows a Demo Over banner, and you go back to being Rex from Rockstar.",
	input_schema: objectSchema({
		appointment: text('The mock appointment, for example "Saturday at 11:15 AM"'),
		vehicle: text('The vehicle the appointment is for, for example "2025 Ford F-150 XLT"')
	}),
	strict: true
};

export const COMPLETE_DEMO: Tool = {
	name: 'complete_demo',
	description:
		'Finishes the demo and sends it to Mat. Call it once, right after the dealer answers whether they want a real demo with Mat.',
	input_schema: objectSchema({
		dealership_type: text('Franchise (with brands), independent used, powersports, or other, from the website and chat'),
		vehicle_of_interest: text('The vehicle the dealer picked in the role-play'),
		questions_asked: text('The questions the dealer asked during the role-play, in a short list separated by semicolons'),
		price_quoted: text('The price or payment Rex quoted, or "none"'),
		mock_appointment: text('The mock appointment Rex set'),
		reaction: text("The dealer's reaction to the demo, in their words where possible"),
		wants_real_demo: { type: 'boolean', description: 'True if they said yes to a real demo with Mat' },
		website_findings: text('What Rex learned from their homepage and About page, or "Site could not be read"')
	}),
	strict: true
};

export const DEMO_TOOLS: Tool[] = [READ_DEALER_WEBSITE, SAVE_DEMO_CONTACT, START_DEMO, END_DEMO, COMPLETE_DEMO];

const field = (input: ToolInput, key: string, max = 2000): string => {
	const value = input[key];
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

export type DealerContactResult = { ok: true; contact: DealerContact } | { ok: false; problems: string[] };

export function parseDealerContact(raw: unknown): DealerContactResult {
	const input = asInput(raw);
	const problems: string[] = [];
	const firstName = field(input, 'first_name', 60);
	const lastName = field(input, 'last_name', 60);
	const dealership = field(input, 'dealership_name', 120);
	const websiteInput = field(input, 'website', 300);
	const email = field(input, 'email', 254).toLowerCase();
	const mobile = normalizePhone(field(input, 'mobile', 40));
	const website = websiteInput ? normalizeUrl(websiteInput) : null;

	if (!firstName) problems.push('first name is missing');
	if (!lastName) problems.push('last name is missing');
	if (!dealership) problems.push('dealership name is missing');
	if (websiteInput && !website) problems.push('the website address does not look valid');
	if (!mobile) problems.push('the mobile number needs 10 digits, or a + and country code');
	if (!EMAIL.test(email)) problems.push('the email address does not look valid');
	if (problems.length || !mobile) return { ok: false, problems };

	return {
		ok: true,
		contact: {
			first_name: firstName,
			last_name: lastName,
			dealership_name: dealership,
			website: website ? website.origin + (website.pathname === '/' ? '' : website.pathname) : '',
			mobile,
			email
		}
	};
}

export function parseOutcome(raw: unknown): DemoOutcome {
	const input = asInput(raw);
	return {
		dealership_type: field(input, 'dealership_type', 200),
		vehicle_of_interest: field(input, 'vehicle_of_interest', 200),
		questions_asked: field(input, 'questions_asked'),
		price_quoted: field(input, 'price_quoted', 300),
		mock_appointment: field(input, 'mock_appointment', 300),
		reaction: field(input, 'reaction'),
		wants_real_demo: input.wants_real_demo === true,
		website_findings: field(input, 'website_findings', 3000)
	};
}
