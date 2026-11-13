/*
  Rockstar shared site script, served from https://assets.rockstarinfo.com/rockstar-shared.js
  One file for every Rockstar HighLevel page. Change a button here and it changes on every page that loads it.

  How pages use it: a button gets data-rs-cta="<name>", e.g.
    <a class="rs-btn rs-btn--red" data-rs-cta="audit" href="https://aiaudit.rockstarinfo.com" target="_blank" rel="noopener">Free Instant AI Audit</a>
  The href and text written in the page are the backup: if this file ever fails to load, the button still works.
*/
(function () {
	'use strict';

	var VERSION = '1.3.0';
	var BASE = 'https://assets.rockstarinfo.com';

	/* Every shared button. label: the button text. href: where it goes. newTab: open in a new window. */
	var CTAS = {
		audit: { label: 'Free Instant AI Audit', href: 'https://aiaudit.rockstarinfo.com', newTab: true },
		meeting: { label: 'Book a Meeting', href: 'https://app.rockstarinfo.com/widget/bookings/rockstarai', newTab: true },
		/* other links to the calendar that keep their own wording ("Talk to Mat's Team", "Get Custom Pricing") */
		booking: { label: null, href: 'https://app.rockstarinfo.com/widget/bookings/rockstarai', newTab: false }
	};

	/*
	  Shared menus and footers. Each page marks them with data-rs-part="nav" or "footer" and data-rs-site="<site>".
	  Empty means every page keeps the menu and footer pasted into it. To change one site-wide, put the new inner
	  HTML here, e.g. PARTS.footer.aifordealers = '<div class="rs-wrap">...</div>'; ("all" covers every site).
	*/
	var PARTS = { nav: {}, footer: {} };

	/*
	  Extra menu and footer links, added to pages that were pasted before the link existed.
	  after: the existing link (end of its href) the new one goes right after. A page that already has the link is left alone.
	*/
	var LINKS = {
		aifordealers: [
			{ href: 'https://aifordealers.com/automotive-call-coaching', label: 'RockstarAI Call Coach', after: '/rockstarai-reception' }
		],
		aiforpowersports: [
			{ href: 'https://aiforpowersports.com/powersports-call-coaching', label: 'RockstarAI Call Coach', after: '/rockstarai-reception' }
		]
	};

	function hasLink(box, href) {
		var as = box.querySelectorAll('a[href]');
		for (var i = 0; i < as.length; i++) if (as[i].getAttribute('href').replace(/\/$/, '') === href) return true;
		return false;
	}

	function findAfter(box, end) {
		var as = box.querySelectorAll('a[href]');
		for (var i = 0; i < as.length; i++) if (as[i].getAttribute('href').replace(/\/$/, '').slice(-end.length) === end) return as[i];
		return null;
	}

	function applyLinks(root) {
		var boxes = (root || document).querySelectorAll('[data-rs-part][data-rs-site]');
		for (var i = 0; i < boxes.length; i++) {
			var box = boxes[i];
			var list = LINKS[box.getAttribute('data-rs-site')];
			if (!list) continue;
			for (var j = 0; j < list.length; j++) {
				var l = list[j];
				if (hasLink(box, l.href)) continue;
				var ref = findAfter(box, l.after);
				if (!ref) continue;
				var a = document.createElement('a');
				a.href = l.href;
				a.textContent = l.label;
				if (ref.parentNode.tagName === 'LI') {
					var li = document.createElement('li');
					li.appendChild(a);
					ref.parentNode.parentNode.insertBefore(li, ref.parentNode.nextSibling);
				} else {
					ref.parentNode.insertBefore(a, ref.nextSibling);
				}
			}
		}
	}

	/*
	  New sections for pages pasted before the section existed. When the page's site matches and the block is not
	  already in the page, the block file is fetched from blocks/ and placed right after the element found by
	  `after`. `up` moves from that element to its enclosing tag first, `next` then steps past that many siblings,
	  and `unflip` removes the flipped layout from one element so the left/right pattern keeps alternating.
	*/
	var INSERTS = [
		{ site: 'rockstarinfo', block: 'rockstarinfo/solutions-call-coach', after: '#calculator', unflip: '#churches' },
		{ site: 'aifordealers', block: 'aifordealers/ai-tools-call-coach', after: '#reception', up: 'section', next: 1 },
		{ site: 'aiforpowersports', block: 'aiforpowersports/ai-tools-call-coach', after: '#reception', up: 'section', next: 1 }
	];

	function pageSite() {
		var el = document.querySelector('[data-rs-part][data-rs-site]');
		return el ? el.getAttribute('data-rs-site') : null;
	}

	function insertTarget(ins) {
		var ref = document.querySelector(ins.after);
		if (ref && ins.up) ref = ref.closest(ins.up);
		for (var i = 0; ref && i < (ins.next || 0); i++) ref = ref.nextElementSibling;
		return ref;
	}

	function applyInserts() {
		if (!window.fetch) return;
		var site = pageSite();
		INSERTS.forEach(function (ins) {
			if (ins.site !== site || ins.started) return;
			if (document.querySelector('[data-rs-block="' + ins.block + '"]')) return;
			var ref = insertTarget(ins);
			if (!ref || !ref.parentNode) return;
			ins.started = true;
			fetch(BASE + '/blocks/' + ins.block + '.html', { cache: 'no-cache' })
				.then(function (r) { return r.ok ? r.text() : null; })
				.then(function (html) {
					if (!html || document.querySelector('[data-rs-block="' + ins.block + '"]')) return;
					var tpl = document.createElement('template');
					tpl.innerHTML = html;
					var fresh = tpl.content.querySelector('[data-rs-block="' + ins.block + '"]');
					if (!fresh) return;
					fresh.setAttribute('data-rs-checked', '1');
					ref.parentNode.insertBefore(fresh, ref.nextSibling);
					if (ins.unflip) {
						var u = document.querySelector(ins.unflip);
						if (u) u.classList.remove('rs-feature--flip');
					}
					applyCtas(fresh);
				})
				.catch(function () { ins.started = false; });
		});
	}

	/*
	  Self-updating blocks. A page section marked data-rs-block="<site>/<name>" data-rs-v="<version>" is swapped for
	  https://assets.rockstarinfo.com/blocks/<site>/<name>.html when that file carries a newer data-rs-v.
	  The pasted copy stays in the page for search engines and as the backup if this site is down.
	*/
	function newer(a, b) {
		var x = String(a).split('.'), y = String(b || '0').split('.');
		for (var i = 0; i < Math.max(x.length, y.length); i++) {
			var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0);
			if (d) return d > 0;
		}
		return false;
	}

	function applyBlocks(root) {
		if (!window.fetch) return;
		var els = (root || document).querySelectorAll('[data-rs-block]:not([data-rs-checked])');
		Array.prototype.forEach.call(els, function (el) {
			el.setAttribute('data-rs-checked', '1');
			var name = el.getAttribute('data-rs-block');
			if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(name)) return;
			fetch(BASE + '/blocks/' + name + '.html', { cache: 'no-cache' })
				.then(function (r) { return r.ok ? r.text() : null; })
				.then(function (html) {
					if (!html) return;
					var tpl = document.createElement('template');
					tpl.innerHTML = html;
					var fresh = tpl.content.querySelector('[data-rs-block="' + name + '"]');
					if (!fresh || !newer(fresh.getAttribute('data-rs-v'), el.getAttribute('data-rs-v'))) return;
					fresh.setAttribute('data-rs-checked', '1');
					el.parentNode.replaceChild(fresh, el);
					applyCtas(fresh);
				})
				.catch(function () {});
		});
	}

	function applyParts(root) {
		var els = (root || document).querySelectorAll('[data-rs-part]');
		for (var i = 0; i < els.length; i++) {
			var el = els[i];
			var part = PARTS[el.getAttribute('data-rs-part')];
			if (!part) continue;
			var html = part[el.getAttribute('data-rs-site')] || part.all;
			if (typeof html === 'string' && el.getAttribute('data-rs-applied') !== VERSION) {
				el.innerHTML = html;
				el.setAttribute('data-rs-applied', VERSION);
			}
		}
	}

	function applyCtas(root) {
		var links = (root || document).querySelectorAll('a[data-rs-cta]');
		for (var i = 0; i < links.length; i++) {
			var a = links[i];
			var cta = CTAS[a.getAttribute('data-rs-cta')];
			if (!cta) continue;
			/* data-rs-keep-label="1" keeps the page's own wording, e.g. a longer label in a sentence-style button */
			if (cta.label && a.getAttribute('data-rs-keep-label') !== '1') a.textContent = cta.label;
			if (cta.href) a.href = cta.href;
			if (cta.newTab) { a.target = '_blank'; a.rel = 'noopener'; }
			else { a.removeAttribute('target'); a.removeAttribute('rel'); }
		}
	}

	function run() {
		applyParts(document);
		applyLinks(document);
		applyCtas(document);
		applyBlocks(document);
		applyInserts();
		document.documentElement.setAttribute('data-rs-shared', VERSION);
	}

	window.RockstarShared = { version: VERSION, ctas: CTAS, parts: PARTS, links: LINKS, apply: function (root) { applyParts(root); applyLinks(root); applyCtas(root); applyBlocks(root); } };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
	else run();
	/* HighLevel can render page sections after load; catch anything added late */
	window.addEventListener('load', run);
})();
