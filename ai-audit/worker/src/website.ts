/**
 * Reads a prospect's homepage so Rex can tailor the audit. Returns the page title, description, headings,
 * a text excerpt, and signals that matter for the audit: chat widgets, online booking, forms, click-to-call.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_TEXT_CHARS = 6000;
const MAX_HEADINGS = 20;

interface Signal {
	label: string;
	pattern: RegExp;
}

const SIGNALS: Signal[] = [
	{ label: 'HighLevel / LeadConnector chat or forms', pattern: /leadconnectorhq|msgsndr|widgets\.leadconnector/i },
	{ label: 'Podium', pattern: /podium\.com|podium-website-widget/i },
	{ label: 'Birdeye', pattern: /birdeye\.com/i },
	{ label: 'Intercom chat', pattern: /intercom(cdn)?\.(io|com)/i },
	{ label: 'Drift chat', pattern: /js\.driftt\.com|drift\.com/i },
	{ label: 'Tidio chat', pattern: /tidio\.co/i },
	{ label: 'LiveChat', pattern: /livechatinc\.com/i },
	{ label: 'HubSpot', pattern: /js\.hs-scripts\.com|hubspot\.com/i },
	{ label: 'Facebook Messenger chat', pattern: /connect\.facebook\.net\/[^"']*customerchat/i },
	{ label: 'Gubagoo (dealer chat)', pattern: /gubagoo/i },
	{ label: 'CarNow (dealer chat)', pattern: /carnow\.com/i },
	{ label: 'Calendly booking', pattern: /calendly\.com/i },
	{ label: 'Acuity booking', pattern: /acuityscheduling\.com/i },
	{ label: 'Housecall Pro', pattern: /housecallpro\.com/i },
	{ label: 'ServiceTitan', pattern: /servicetitan\.com/i },
	{ label: 'Jobber', pattern: /getjobber\.com|jobber\.com/i },
	{ label: 'Square Appointments', pattern: /squareup\.com\/appointments|square\.site/i },
	{ label: 'OpenTable', pattern: /opentable\.com/i },
	{ label: 'Online ordering (Toast / ChowNow / Grubhub / DoorDash)', pattern: /toasttab\.com|chownow\.com|grubhub\.com|doordash\.com/i },
	{ label: 'Google reviews widget', pattern: /elfsight|trustindex|google-reviews/i },
	{ label: 'Dealer platform (Dealer.com / DealerOn / Dealer Inspire / DealerSocket)', pattern: /dealer\.com|dealeron|dealerinspire|dealersocket/i },
	{ label: 'Powersports platform (Dealer Spike / ARI / Room58)', pattern: /dealerspike|arinet|room58/i },
	{ label: 'Wix site', pattern: /wix\.com|wixstatic/i },
	{ label: 'Squarespace site', pattern: /squarespace/i },
	{ label: 'WordPress site', pattern: /wp-content/i },
	{ label: 'Shopify site', pattern: /cdn\.shopify\.com/i }
];

export interface WebsiteSnapshot {
	ok: true;
	url: string;
	title: string;
	description: string;
	headings: string[];
	phone_links: string[];
	has_forms: boolean;
	signals: string[];
	text_excerpt: string;
}

export interface WebsiteFailure {
	ok: false;
	url: string;
	reason: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

const decode = (s: string): string =>
	s
		.replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
		.replace(/&([a-z#0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m);

const clean = (s: string): string => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Accepts "acme.com", "www.acme.com/about" or a full URL; returns an https/http URL or null. */
export function normalizeUrl(input: string): URL | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	try {
		const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed);
		const host = url.hostname.toLowerCase();
		if (!host.includes('.') || host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) return null;
		return url;
	} catch {
		return null;
	}
}

async function readCapped(response: Response): Promise<string> {
	if (!response.body) return '';
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	while (total < MAX_HTML_BYTES) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		total += value.byteLength;
	}
	await reader.cancel();
	const bytes = new Uint8Array(Math.min(total, MAX_HTML_BYTES));
	let offset = 0;
	for (const chunk of chunks) {
		const room = bytes.length - offset;
		if (room <= 0) break;
		bytes.set(chunk.subarray(0, room), offset);
		offset += Math.min(chunk.byteLength, room);
	}
	return new TextDecoder().decode(bytes);
}

export function snapshot(url: string, html: string): WebsiteSnapshot {
	const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
	const description = decode(
		html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
			html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1] ??
			''
	).trim();
	const body = html
		.replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ');
	const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
		.map(m => clean(m[1] ?? ''))
		.filter(h => h.length > 1)
		.filter((h, i, all) => all.indexOf(h) === i)
		.slice(0, MAX_HEADINGS);
	const phoneLinks = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)]
		.map(m => decode(m[1] ?? '').trim())
		.filter((p, i, all) => p && all.indexOf(p) === i)
		.slice(0, 5);
	return {
		ok: true,
		url,
		title,
		description,
		headings,
		phone_links: phoneLinks,
		has_forms: /<form[\s>]/i.test(html),
		signals: SIGNALS.filter(s => s.pattern.test(html)).map(s => s.label),
		text_excerpt: clean(body).slice(0, MAX_TEXT_CHARS)
	};
}

export async function readWebsite(input: string): Promise<WebsiteSnapshot | WebsiteFailure> {
	const url = normalizeUrl(input);
	if (!url) return { ok: false, url: input, reason: 'That does not look like a website address.' };
	try {
		const response = await fetch(url.toString(), {
			redirect: 'follow',
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			headers: {
				'user-agent': 'Mozilla/5.0 (compatible; RockstarAI-Audit/1.0; +https://getrockstarai.com)',
				accept: 'text/html,application/xhtml+xml'
			}
		});
		if (!response.ok) return { ok: false, url: url.toString(), reason: `The site answered with HTTP ${response.status}.` };
		const type = response.headers.get('content-type') ?? '';
		if (!/html|text/i.test(type)) return { ok: false, url: url.toString(), reason: 'The address is not a web page.' };
		return snapshot(response.url || url.toString(), await readCapped(response));
	} catch (error) {
		const reason = error instanceof Error && error.name === 'TimeoutError' ? 'The site took too long to load.' : 'The site could not be reached.';
		return { ok: false, url: url.toString(), reason };
	}
}
