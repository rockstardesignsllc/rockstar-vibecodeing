/*
  Rockstar blog menu and footer, served from https://assets.rockstarinfo.com/rockstar-blog.js
  Gives the HighLevel blog (rockstarinfo.com/blog and rockstarinfo.com/post/...) the same menu and footer as
  rockstarinfo.com. HighLevel only needs this one line in the blog's tracking code:
    <script src="https://assets.rockstarinfo.com/rockstar-blog.js" defer></script>
  The menu and footer come from blocks/rockstarinfo/blog-header.html and blog-footer.html, built from
  pages-2027/rockstarinfo/13-blog-header.html and 14-blog-footer.html. It only runs on blog paths and only when the
  page has no Rockstar menu of its own, so it is safe in site-wide tracking code.
*/
(function () {
	'use strict';

	var VERSION = '1.0.0';
	var BASE = 'https://assets.rockstarinfo.com';
	var PATHS = /^\/(blog|post|posts)(\/|$)/i;

	if (!PATHS.test(location.pathname)) return;
	if (document.documentElement.getAttribute('data-rs-blog')) return;
	document.documentElement.setAttribute('data-rs-blog', VERSION);

	function addOnce(tag, attr, url) {
		if (document.querySelector(tag + '[' + attr + '="' + url + '"]')) return;
		var el = document.createElement(tag);
		if (tag === 'link') { el.rel = 'stylesheet'; el.href = url; }
		else { el.src = url; el.defer = true; }
		document.head.appendChild(el);
	}

	var CSS =
		'.rs-blog-chrome{background:transparent;overflow:visible}' +
		'.rs-blog-chrome .rs-footer{margin-top:60px}';

	function fetchBlock(name) {
		return fetch(BASE + '/blocks/rockstarinfo/' + name + '.html', { cache: 'no-cache' })
			.then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
			.then(function (html) {
				var tpl = document.createElement('template');
				tpl.innerHTML = html;
				var el = tpl.content.querySelector('[data-rs-block]');
				if (el) el.setAttribute('data-rs-checked', '1');
				return el;
			});
	}

	function wireMenu() {
		document.addEventListener('click', function (e) {
			var chrome = e.target.closest && e.target.closest('.rs-blog-chrome');
			var drops = document.querySelectorAll('.rs-blog-chrome .rs-has-drop');
			if (!chrome) { drops.forEach(function (x) { x.classList.remove('is-open'); }); return; }
			var nav = chrome.querySelector('.rs-nav');
			var burger = e.target.closest('.rs-burger');
			if (burger && nav) {
				var open = nav.classList.toggle('is-open');
				burger.setAttribute('aria-expanded', open);
				return;
			}
			var dropBtn = e.target.closest('.rs-has-drop > button');
			if (dropBtn) {
				e.stopPropagation();
				var d = dropBtn.parentNode, wasOpen = d.classList.contains('is-open');
				drops.forEach(function (x) { x.classList.remove('is-open'); x.querySelector('button').setAttribute('aria-expanded', 'false'); });
				if (!wasOpen) { d.classList.add('is-open'); dropBtn.setAttribute('aria-expanded', 'true'); }
				return;
			}
			if (!e.target.closest('.rs-has-drop')) drops.forEach(function (x) { x.classList.remove('is-open'); });
			if (e.target.closest('.rs-menu a') && nav) nav.classList.remove('is-open');
		});
		document.addEventListener('mouseover', function (e) {
			if (window.innerWidth <= 960) return;
			var d = e.target.closest && e.target.closest('.rs-blog-chrome .rs-has-drop');
			document.querySelectorAll('.rs-blog-chrome .rs-has-drop').forEach(function (x) { if (x !== d) x.classList.remove('is-open'); });
			if (d) d.classList.add('is-open');
		});
	}

	function run() {
		if (document.querySelector('[data-rs-part="nav"]')) return;
		addOnce('link', 'href', BASE + '/rockstar-master.css');
		addOnce('script', 'src', BASE + '/rockstar-shared.js');
		var style = document.createElement('style');
		style.textContent = CSS;
		document.body.appendChild(style);
		wireMenu();
		fetchBlock('blog-header').then(function (el) {
			if (el && !document.querySelector('[data-rs-block="rockstarinfo/blog-header"]')) document.body.insertBefore(el, document.body.firstChild);
		}).catch(function () {});
		fetchBlock('blog-footer').then(function (el) {
			if (!el || document.querySelector('[data-rs-block="rockstarinfo/blog-footer"]')) return;
			document.body.appendChild(el);
			var y = el.querySelector('.rs-year');
			if (y) y.textContent = new Date().getFullYear();
			if (window.RockstarShared) window.RockstarShared.apply(el);
		}).catch(function () {});
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
	else run();
})();
