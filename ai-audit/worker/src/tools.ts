import type Anthropic from '@anthropic-ai/sdk';
import { PRODUCT_LINES, type AuditAnswers, type ProductLine, type ProspectContact } from './types';
import { normalizeUrl } from './website';

type Tool = Anthropic.Beta.Messages.BetaTool;

const text = (description: string) => ({ type: 'string', description }) as const;

const CONTACT_PROPERTIES = {
	first_name: text('First name'),
	last_name: text('Last name'),
	business_name: text('Business name'),
	website: text('Business website exactly as given, or an empty string if they have none'),
	mobile: text('Mobile number exactly as given'),
	email: text('Email address exactly as given')
};

const ANSWER_PROPERTIES = {
	business_type: text('What kind of business this is, in a few words, e.g. "Used car dealership" or "Residential HVAC"'),
	product_line: { type: 'string', enum: [...PRODUCT_LINES], description: 'The RockstarAI product line that fits this business' },
	lead_sources: text('Where new customers come from'),
	after_hours_leads: text('What happens to calls and leads after hours and on weekends'),
	lead_response_time: text('How fast they respond to a new lead'),
	monthly_leads: text('Leads or inquiries per month, as they said it'),
	monthly_closes: text('Customers, deals or jobs won per month, as they said it'),
	average_customer_value: text('Average sale, job or customer value, as they said it'),
	follow_up_process: text('Their follow-up with people who do not buy right away'),
	reviews: text('How they get reviews and roughly how many Google reviews they have'),
	biggest_time_drain: text("The repetitive task that eats most of the team's time"),
	current_tools_and_crm: text('Software, CRM and phone system in use'),
	first_thing_to_hand_off: text('The one thing they would hand to AI tomorrow'),
	what_has_held_them_back: text('What has held them back: budget, time, trust, tech or other'),
	go_live_timeline: text('How soon they want something live'),
	website_findings: text('What you noticed on their website that matters for the audit, or "No website" if none'),
	wants_strategy_call: { type: 'boolean', description: 'True if they said yes to the 20 minute Strategy Call' }
};

const objectSchema = (properties: Record<string, object>): Tool['input_schema'] => ({
	type: 'object',
	properties,
	required: Object.keys(properties),
	additionalProperties: false
});

export const READ_WEBSITE: Tool = {
	name: 'read_website',
	description:
		"Reads the prospect's website homepage and returns its title, description, headings, a text excerpt, and signals such as chat widgets, online booking and forms. Call it as soon as the prospect gives their website.",
	input_schema: objectSchema({ url: text('The website address the prospect gave') }),
	strict: true
};

export const SAVE_CONTACT: Tool = {
	name: 'save_contact',
	description:
		'Saves the prospect contact details to the Rockstar CRM. Call it once you have all six details. If it returns an error, ask the prospect for the detail it names and call it again.',
	input_schema: objectSchema(CONTACT_PROPERTIES),
	strict: true
};

export const COMPLETE_AUDIT: Tool = {
	name: 'complete_audit',
	description:
		'Finishes the audit and sends it to the Rockstar team. Call it once, right after the prospect answers whether they want a 20 minute Strategy Call. Use "skipped" for any question they skipped.',
	input_schema: objectSchema(ANSWER_PROPERTIES),
	strict: true
};

export const TOOLS: Tool[] = [READ_WEBSITE, SAVE_CONTACT, COMPLETE_AUDIT];

export type ToolInput = Record<string, unknown>;

const isRecord = (value: unknown): value is ToolInput => typeof value === 'object' && value !== null && !Array.isArray(value);

export const asInput = (value: unknown): ToolInput => (isRecord(value) ? value : {});

const field = (input: ToolInput, key: string, max = 2000): string => {
	const value = input[key];
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

/** E.164 for US and Canada numbers given as 10 digits or 1 plus 10 digits; other numbers keep their country code. */
export function normalizePhone(input: string): string | null {
	const digits = input.replace(/\D/g, '');
	if (digits.length === 10) return '+1' + digits;
	if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
	if (input.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15) return '+' + digits;
	return null;
}

export type ContactResult = { ok: true; contact: ProspectContact } | { ok: false; problems: string[] };

export function parseContact(raw: unknown): ContactResult {
	const input = asInput(raw);
	const problems: string[] = [];
	const firstName = field(input, 'first_name', 60);
	const lastName = field(input, 'last_name', 60);
	const businessName = field(input, 'business_name', 120);
	const websiteInput = field(input, 'website', 300);
	const email = field(input, 'email', 254).toLowerCase();
	const mobile = normalizePhone(field(input, 'mobile', 40));
	const website = websiteInput ? normalizeUrl(websiteInput) : null;

	if (!firstName) problems.push('first name is missing');
	if (!lastName) problems.push('last name is missing');
	if (!businessName) problems.push('business name is missing');
	if (websiteInput && !website) problems.push('the website address does not look valid');
	if (!mobile) problems.push('the mobile number needs 10 digits, or a + and country code');
	if (!EMAIL.test(email)) problems.push('the email address does not look valid');
	if (problems.length || !mobile) return { ok: false, problems };

	return {
		ok: true,
		contact: {
			first_name: firstName,
			last_name: lastName,
			business_name: businessName,
			website: website ? website.origin + (website.pathname === '/' ? '' : website.pathname) : '',
			mobile,
			email
		}
	};
}

const isProductLine = (value: string): value is ProductLine => (PRODUCT_LINES as readonly string[]).includes(value);

export function parseAnswers(raw: unknown): AuditAnswers {
	const input = asInput(raw);
	const productLine = field(input, 'product_line');
	return {
		business_type: field(input, 'business_type', 200),
		product_line: isProductLine(productLine) ? productLine : 'RockstarAI for Business',
		lead_sources: field(input, 'lead_sources'),
		after_hours_leads: field(input, 'after_hours_leads'),
		lead_response_time: field(input, 'lead_response_time', 300),
		monthly_leads: field(input, 'monthly_leads', 300),
		monthly_closes: field(input, 'monthly_closes', 300),
		average_customer_value: field(input, 'average_customer_value', 300),
		follow_up_process: field(input, 'follow_up_process'),
		reviews: field(input, 'reviews'),
		biggest_time_drain: field(input, 'biggest_time_drain'),
		current_tools_and_crm: field(input, 'current_tools_and_crm'),
		first_thing_to_hand_off: field(input, 'first_thing_to_hand_off'),
		what_has_held_them_back: field(input, 'what_has_held_them_back'),
		go_live_timeline: field(input, 'go_live_timeline', 300),
		website_findings: field(input, 'website_findings', 3000),
		wants_strategy_call: input.wants_strategy_call === true
	};
}
