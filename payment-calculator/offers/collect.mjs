#!/usr/bin/env node
/*
 * Rockstar Deal Desk rebate collector.
 *
 * For each brand in brands.json: open its public offer pages in a real browser, read the text, follow the
 * detail and fine print links it finds (web pages and PDFs), and have Claude pull out the current US retail
 * offers as structured data. Each brand's offers are written to data/<brand>.json, and a summary of the run
 * is written to last-run.md. The weekly GitHub workflow opens a pull request with any changes for approval;
 * nothing reaches the Deal Desk until that pull request is merged.
 *
 * A brand whose pages cannot be read keeps its previous data file. A brand whose page text has not changed
 * since the last run is not sent to Claude again.
 *
 * Usage:
 *   node collect.mjs                     all brands (needs ANTHROPIC_API_KEY)
 *   node collect.mjs --brand polaris     one brand (repeat --brand for more)
 *   node collect.mjs --dry-run           read the pages only; write the text to snapshots/ and skip Claude
 *   node collect.mjs --brands file.json  use another brand list; data/, snapshots/ and last-run.md go next to it
 *
 * CHROMIUM_PATH points Playwright at an already installed Chromium instead of its own download.
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { chromium } from 'playwright';
import { z } from 'zod';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.flatMap((a, i) => (a === '--brand' && args[i + 1] ? [args[i + 1]] : []));
const BRANDS_FILE = args.includes('--brands') ? path.resolve(args[args.indexOf('--brands') + 1]) : path.join(HERE, 'brands.json');
const WORK = path.dirname(BRANDS_FILE);
const DATA_DIR = path.join(WORK, 'data');
const SNAPSHOT_DIR = path.join(WORK, 'snapshots');
const REPORT = path.join(WORK, 'last-run.md');

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 32000;
const MAX_PAGE_CHARS = 60000;
const MAX_DETAIL_PAGES = 10;
const MAX_PDFS = 4;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MIN_PAGE_CHARS = 400;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const DETAIL_LINK = /offer|promo|rebate|incentive|financ|bonus|savings|disclaim|terms|details|fine-?print|legal/i;
const ZIP_INPUT = ['zip', 'postal'].flatMap(w => ['name', 'id', 'placeholder', 'aria-label'].map(a => `input[${a}*="${w}" i]`)).join(', ');
const BLOCKED_PAGE = /access denied|request unsuccessful|are you a robot|verify you are human|captcha|pardon our interruption/i;

const Offer = z.object({
  title: z.string().describe('Offer headline as the manufacturer words it, e.g. "Up to $1,500 Customer Cash on 2025 RZR XP 1000".'),
  type: z.enum(['cash', 'apr', 'bonus', 'other']).describe('cash = customer cash or rebate off the price; apr = promotional financing rate; bonus = extra cash for a group such as military, first responder, loyalty or conquest; other = anything else such as free accessories or extended warranty.'),
  amount: z.number().nullable().describe('Dollar amount for cash and bonus offers. For "up to" offers, the largest amount. Null when there is no dollar amount.'),
  apr: z.number().nullable().describe('Annual percentage rate for apr offers, e.g. 3.99. Null for other types.'),
  termMonths: z.number().int().nullable().describe('Longest term in months that the apr applies to. Null when not stated.'),
  category: z.string().describe('Product line, e.g. Off-Road, Side-by-Side, ATV, Snowmobile, Motorcycle, Watercraft, Three-Wheel.'),
  modelYears: z.array(z.number().int()).describe('Model years the offer covers. Empty when the offer does not say.'),
  models: z.array(z.string()).describe('Model names or families exactly as written, e.g. ["RZR XP 1000", "Ranger 570"]. Empty when the offer covers every model in the category.'),
  start: z.string().nullable().describe('Start date as YYYY-MM-DD, or null.'),
  end: z.string().nullable().describe('End date as YYYY-MM-DD, or null.'),
  eligibility: z.string().describe('Who qualifies, e.g. "All retail buyers", "Active military and veterans", "Approved credit through Polaris Acceptance". Empty when not stated.'),
  combinable: z.string().describe('What the offer can or cannot be combined with, e.g. "Cannot be combined with promotional financing". Empty when not stated.'),
  finePrint: z.string().describe('The key conditions in one or two plain sentences.'),
  sourceUrl: z.string().describe('The SOURCE url the offer was read from. Must be one of the SOURCE urls given.')
});
const Extraction = z.object({
  offers: z.array(Offer),
  problems: z.array(z.string()).describe('Anything that stopped a complete read, such as offers mentioned with no amount or dates, or pages that looked empty or blocked.')
});

const SYSTEM = [
  'You extract factory rebates and incentives for powersports dealers from manufacturer web pages.',
  'Return every current offer that a US retail customer buying a new vehicle can receive.',
  'Leave out: offers outside the US, expired offers, dealer-only programs, parts and accessories coupons, sweepstakes, and offers on used or pre-owned vehicles.',
  'Use only what the pages and documents say. Never estimate an amount, rate, model or date. When the text does not give a value, use null or an empty value and say what is missing under problems.',
  'When one offer has different amounts for different models, return one offer per amount with the models that amount applies to.',
  'Use the fine print documents to fill in dates, eligibility and combinability for the offers on the pages.'
].join(' ');

const today = () => new Date().toISOString().slice(0, 10);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const sameSite = (a, b) => {
  const root = h => h.split('.').slice(-2).join('.');
  return root(new URL(a).hostname) === root(new URL(b).hostname);
};

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}

/* Pages that ask where the shopper is (brands with a "zip" in brands.json) get that ZIP typed in and submitted. */
async function enterZip(page, zip) {
  const box = page.locator(ZIP_INPUT).first();
  if (!(await box.count()) || !(await box.isVisible())) return;
  await box.fill(zip);
  await box.press('Enter');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
}

/* The form fields and links on a page, for the report when a brand returns no offers. */
const pageMap = page => page.evaluate(() => ({
  fields: [...document.querySelectorAll('input, select, button')].filter(e => e.offsetParent).slice(0, 25)
    .map(e => [e.tagName.toLowerCase(), e.type, e.name || e.id, e.placeholder || e.getAttribute('aria-label') || e.innerText].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 120)),
  links: [...document.querySelectorAll('a[href]')].filter(a => a.offsetParent).slice(0, 60)
    .map(a => (a.innerText || a.title || '').replace(/\s+/g, ' ').trim().slice(0, 60) + ' -> ' + a.href)
}));

/* Load a page, scroll so lazy content renders, and return its text plus the links worth following. */
async function readPage(context, url, zip) {
  const page = await context.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!res || res.status() >= 400) throw new Error('HTTP ' + (res ? res.status() : 'no response'));
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    if (zip) await enterZip(page, zip);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const text = (await page.evaluate(() => document.body.innerText)).replace(/\n{3,}/g, '\n\n').trim();
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({ href: a.href, text: (a.innerText || a.title || '').trim() })));
    if (text.length < MIN_PAGE_CHARS || BLOCKED_PAGE.test(text.slice(0, 2000))) throw new Error('page looked empty or blocked (' + text.length + ' characters)');
    return { url, text: text.slice(0, MAX_PAGE_CHARS), links, map: await pageMap(page) };
  } finally {
    await page.close();
  }
}

async function readPdf(context, url) {
  const res = await context.request.get(url, { timeout: 60000 });
  if (!res.ok()) throw new Error('HTTP ' + res.status());
  const body = await res.body();
  if (body.length > MAX_PDF_BYTES) throw new Error('PDF larger than ' + MAX_PDF_BYTES + ' bytes');
  if (body.subarray(0, 4).toString() !== '%PDF') throw new Error('not a PDF');
  return { url, data: body.toString('base64') };
}

/* Read the brand's offer pages, then up to MAX_DETAIL_PAGES detail pages and MAX_PDFS fine print PDFs they link to. */
async function gather(context, brand) {
  const pages = [], pdfs = [], problems = [];
  const seen = new Set();
  const detail = [], pdfLinks = [];
  for (const url of brand.pages) {
    seen.add(url);
    try {
      const p = await readPage(context, url, brand.zip);
      pages.push(p);
      for (const l of p.links) {
        const href = l.href.split('#')[0];
        if (!href.startsWith('http') || seen.has(href) || !sameSite(href, url)) continue;
        if (!DETAIL_LINK.test(href + ' ' + l.text)) continue;
        seen.add(href);
        (/\.pdf($|\?)/i.test(href) ? pdfLinks : detail).push(href);
      }
    } catch (e) {
      problems.push('Could not read ' + url + ': ' + e.message);
    }
  }
  for (const url of detail.slice(0, MAX_DETAIL_PAGES)) {
    try { pages.push(await readPage(context, url, brand.zip)); } catch (e) { problems.push('Skipped detail page ' + url + ': ' + e.message); }
  }
  for (const url of pdfLinks.slice(0, MAX_PDFS)) {
    try { pdfs.push(await readPdf(context, url)); } catch (e) { problems.push('Skipped PDF ' + url + ': ' + e.message); }
  }
  return { pages, pdfs, problems };
}

async function extract(client, brand, pages, pdfs) {
  const content = [
    ...pdfs.flatMap(p => [
      { type: 'text', text: 'SOURCE ' + p.url + ' (fine print PDF)' },
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: p.data } }
    ]),
    ...pages.map(p => ({ type: 'text', text: 'SOURCE ' + p.url + '\n\n' + p.text })),
    { type: 'text', text: 'Today is ' + today() + '. List the current ' + brand.name + ' offers from the sources above.' }
  ];
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    output_config: { format: zodOutputFormat(Extraction) }
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'max_tokens') throw new Error('Claude ran out of room before finishing the list');
  if (message.stop_reason === 'refusal') throw new Error('Claude declined to read these pages');
  if (!message.parsed_output) throw new Error('Claude\'s answer did not match the offer format');
  return message.parsed_output;
}

/* Drop offers that cannot be traced to a page we read or that have already ended, and give each a stable id. */
function clean(slug, offers, sources) {
  const kept = [], dropped = [];
  const now = today();
  for (const o of offers) {
    if (!sources.includes(o.sourceUrl)) { dropped.push('"' + o.title + '" did not name a page that was read, so it was left out.'); continue; }
    if (o.end && o.end < now) { dropped.push('"' + o.title + '" ended ' + o.end + ', so it was left out.'); continue; }
    const id = sha([slug, o.type, o.title, o.models.join('|'), o.modelYears.join('|'), o.end || ''].join('#')).slice(0, 12);
    kept.push({ id, ...o });
  }
  kept.sort((a, b) => a.category.localeCompare(b.category) || a.type.localeCompare(b.type) || (b.amount || 0) - (a.amount || 0) || a.title.localeCompare(b.title));
  return { kept, dropped };
}

function money(n) { return n == null ? '' : '$' + n.toLocaleString('en-US'); }

async function main() {
  const brands = await readJson(BRANDS_FILE, {});
  const slugs = Object.keys(brands).filter(s => !ONLY.length || ONLY.includes(s));
  const unknown = ONLY.filter(s => !brands[s]);
  if (unknown.length) throw new Error('Unknown brand: ' + unknown.join(', '));
  if (!DRY_RUN && !process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = DRY_RUN ? null : new Anthropic();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'en-US', timezoneId: 'America/Chicago', viewport: { width: 1366, height: 900 } });
  await fs.mkdir(DRY_RUN ? SNAPSHOT_DIR : DATA_DIR, { recursive: true });

  const report = ['# Weekly rebate offers, ' + today(), '', 'Check each brand below against its offer page before merging. Merging publishes these offers to every Deal Desk.', ''];
  let failures = 0;
  try {
    for (const slug of slugs) {
      const brand = brands[slug];
      const file = path.join(DATA_DIR, slug + '.json');
      const previous = await readJson(file, null);
      const { pages, pdfs, problems } = await gather(context, brand);
      report.push('## ' + brand.name, '');
      const notes = [...problems];

      if (!pages.length) {
        failures++;
        report.push('Could not read any offer page. The previous offers stay in place.', '', ...notes.map(n => '- ' + n), '');
        continue;
      }
      const sourceHash = sha(JSON.stringify([pages.map(p => [p.url, p.text]), pdfs.map(p => [p.url, sha(p.data)])]));

      if (DRY_RUN) {
        await fs.writeFile(path.join(SNAPSHOT_DIR, slug + '.txt'), pages.map(p => 'SOURCE ' + p.url + '\n\n' + p.text).join('\n\n=====\n\n'));
        report.push('Read ' + pages.length + ' pages and ' + pdfs.length + ' PDFs (dry run, Claude not called).', '', ...notes.map(n => '- ' + n), '');
        continue;
      }
      if (previous && previous.sourceHash === sourceHash) {
        report.push('No change since the last run (' + previous.offers.length + ' offers).', '', ...notes.map(n => '- ' + n), '');
        continue;
      }

      let result;
      try {
        result = await extract(client, brand, pages, pdfs);
      } catch (e) {
        failures++;
        report.push('Claude could not read the offers: ' + e.message + '. The previous offers stay in place.', '', ...notes.map(n => '- ' + n), '');
        continue;
      }
      const sources = [...pages.map(p => p.url), ...pdfs.map(p => p.url)];
      const { kept, dropped } = clean(slug, result.offers, sources);
      notes.push(...result.problems, ...dropped);
      if (!kept.length) {
        report.push('No offers found' + (previous && previous.offers.length ? ', so the previous ' + previous.offers.length + ' offers stay in place.' : '.'), '', ...notes.map(n => '- ' + n), '');
        report.push('<details><summary>What the robot saw on each page</summary>', '');
        for (const p of pages) report.push('**' + p.url + '**', '', 'Fields: ' + (p.map.fields.join('; ') || 'none'), '', ...p.map.links.map(l => '- ' + l), '');
        report.push('</details>', '');
        continue;
      }
      if (previous && JSON.stringify(previous.offers) === JSON.stringify(kept)) {
        report.push('The pages changed but the offers did not (' + kept.length + ' offers).', '', ...notes.map(n => '- ' + n), '');
        continue;
      }
      await fs.writeFile(file, JSON.stringify({ brand: slug, name: brand.name, updated: today(), sourceHash, sources, offers: kept }, null, 2) + '\n');

      report.push(kept.length + ' offers from ' + pages.length + ' pages and ' + pdfs.length + ' PDFs.', '');
      report.push('| Offer | Amount | Models | Years | Ends | Source |', '| --- | --- | --- | --- | --- | --- |');
      for (const o of kept) {
        const amount = o.type === 'apr' ? (o.apr != null ? o.apr + '% APR' : '') + (o.termMonths ? ' / ' + o.termMonths + ' mo' : '') : money(o.amount);
        const cell = s => String(s).replace(/\|/g, '/').replace(/\n/g, ' ');
        report.push('| ' + [cell(o.title), amount, cell(o.models.join(', ') || 'All ' + o.category), o.modelYears.join(', '), o.end || '', '[link](' + o.sourceUrl + ')'].join(' | ') + ' |');
      }
      report.push('', ...notes.map(n => '- ' + n), '');
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(REPORT, report.join('\n') + '\n');
  console.log(report.join('\n'));
  if (failures === slugs.length) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
