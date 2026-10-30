/*
  Rockstar shared site script, served from https://assets.rockstarinfo.com/rockstar-shared.js
  One file for every Rockstar HighLevel page. Change a button here and it changes on every page that loads it.

  How pages use it: a button gets data-rs-cta="<name>", e.g.
    <a class="rs-btn rs-btn--red" data-rs-cta="audit" href="https://aiaudit.rockstarinfo.com" target="_blank" rel="noopener">Free Instant AI Audit</a>
  The href and text written in the page are the backup: if this file ever fails to load, the button still works.
*/
(function () {
	'use strict';

	var VERSION = '1.1.0';

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
		applyCtas(document);
		document.documentElement.setAttribute('data-rs-shared', VERSION);
	}

	window.RockstarShared = { version: VERSION, ctas: CTAS, parts: PARTS, apply: function (root) { applyParts(root); applyCtas(root); } };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
	else run();
	/* HighLevel can render page sections after load; catch anything added late */
	window.addEventListener('load', run);
})();
