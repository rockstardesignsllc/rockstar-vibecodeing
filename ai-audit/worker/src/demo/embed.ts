import PAGE from '../../../pages/bdc-demo.html';

/**
 * GET /demo/embed.js: the whole BDC demo page (pages/bdc-demo.html) as a script. The HighLevel page only holds the
 * loader in pages/bdc-demo-loader.html, so every change to the page on main goes live with the Worker deploy.
 */
const BOOT = `(function () {
	var here = document.currentScript;
	var mount = document.getElementById('rex-demo-mount');
	if (!mount) {
		mount = document.createElement('div');
		here.parentNode.insertBefore(mount, here);
	}
	if (mount.getAttribute('data-loaded')) return;
	mount.setAttribute('data-loaded', '1');
	var tpl = document.createElement('template');
	tpl.innerHTML = PAGE;
	var scripts = Array.prototype.slice.call(tpl.content.querySelectorAll('script'));
	scripts.forEach(function (s) { s.parentNode.removeChild(s); });
	mount.appendChild(tpl.content);
	scripts.forEach(function (s) {
		var run = document.createElement('script');
		run.textContent = s.textContent;
		mount.appendChild(run);
	});
})();`;

const BODY = `var PAGE = ${JSON.stringify(PAGE)};\n${BOOT}\n`;

export const demoEmbed = (): Response =>
	new Response(BODY, {
		headers: {
			'content-type': 'application/javascript; charset=utf-8',
			'cache-control': 'public, max-age=300',
			'access-control-allow-origin': '*'
		}
	});
