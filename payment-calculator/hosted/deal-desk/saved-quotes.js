/* Rockstar Deal Desk v3.12 | saved quotes page | hosted engine
   Served from https://assets.rockstarinfo.com/deal-desk/ . Built by payment-calculator/build_hosted.py. Do not edit here. */
(function () {
  var root = document.getElementById('rsq');
  if (!root || root.dataset.rsddStarted) return;
  root.dataset.rsddStarted = '1';
  var BASE = 'https://assets.rockstarinfo.com/deal-desk';
  var client = (root.dataset.client || 'rockstar-master').replace(/[^a-z0-9-]/g, '');
  var mode = root.dataset.mode || '';

  function fail(msg) {
    root.innerHTML = '<div style="font:15px/1.5 Arial,sans-serif;max-width:640px;margin:40px auto;padding:20px 24px;border:2px solid #d70015;border-radius:14px;color:#0b0b0d"><b>This page did not finish loading.</b><br>' + msg + '</div>';
  }

  if (!document.getElementById('rsdd-css-rsq')) {
    var st = document.createElement('style');
    st.id = 'rsdd-css-rsq';
    st.textContent = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');\n#rsq{--ink:#0b0b0d;--paper:#f5f5f7;--steel:#6e6e73;--line:#e3e3e8;--acc:#d70015;\n  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--ink);max-width:1180px;margin:24px auto;padding:0 16px;-webkit-font-smoothing:antialiased;line-height:1.5}\n#rsq *{box-sizing:border-box}\n#rsq h1,#rsq h2,#rsq p{margin:0}\n#rsq button,#rsq input,#rsq select{font:inherit}\n#rsq .sq-top{display:flex;align-items:center;gap:14px;background:var(--ink);color:#fff;padding:16px 22px;border-radius:22px 22px 0 0}\n#rsq .sq-top img{height:34px;width:auto;max-width:140px;object-fit:contain}\n#rsq .sq-top b{font-size:17px;letter-spacing:-.01em}\n#rsq .sq-top span{margin-left:auto;font-size:11px;font-weight:700;letter-spacing:.14em;color:#a1a1a6;text-transform:uppercase}\n#rsq .sq-shell{background:var(--paper);border-radius:0 0 22px 22px;padding:34px 28px}\n#rsq .sq-kicker{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin-bottom:10px}\n#rsq .sq-intro{margin-bottom:24px}\n#rsq .sq-intro h1{font-size:36px;line-height:1.1;font-weight:900;letter-spacing:-.04em;margin-bottom:8px}\n#rsq .sq-intro p{color:var(--steel);font-size:16px}\n#rsq .sq-card{background:#fff;border-radius:22px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 12px 40px rgba(0,0,0,.07);padding:26px}\n#rsq .sq-login{max-width:440px}\n#rsq .sq-field{display:block;font-size:13px;font-weight:700;color:var(--steel);margin-bottom:16px}\n#rsq .sq-field input,#rsq .sq-field select{display:block;width:100%;margin-top:6px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font-size:16px;font-weight:600}\n#rsq .sq-field input:focus,#rsq .sq-field select:focus{outline:none;border-color:var(--acc)}\n#rsq .sq-btn{display:inline-flex;align-items:center;justify-content:center;border:2px solid transparent;border-radius:999px;padding:12px 22px;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap}\n#rsq .sq-btn--acc{background:var(--acc);color:#fff}\n#rsq .sq-btn--acc:hover{filter:brightness(.9)}\n#rsq .sq-btn--ghost{background:transparent;border-color:var(--ink);color:var(--ink)}\n#rsq .sq-btn--ghost:hover{background:var(--ink);color:#fff}\n#rsq .sq-btn--small{padding:8px 16px;font-size:14px}\n#rsq .sq-btn[disabled]{opacity:.5;cursor:wait}\n#rsq .sq-error{color:#d70015;font-weight:600;margin-top:12px}\n#rsq .sq-bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:18px}\n#rsq .sq-bar .sq-field{flex:1 1 260px;margin:0}\n#rsq .sq-bar .sq-field input{margin-top:0}\n#rsq .sq-count{color:var(--steel);font-size:14px;font-weight:600}\n#rsq .sq-admin{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px;margin-bottom:18px;padding:16px 18px;border:1.5px dashed var(--line);border-radius:16px;background:#fff}\n#rsq .sq-admin .sq-field{flex:1 1 220px;margin:0}\n#rsq .sq-admin code{font-size:16px;font-weight:800;letter-spacing:.06em}\n#rsq table{width:100%;border-collapse:collapse;font-size:14px}\n#rsq th{text-align:left;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--steel);padding:0 10px 10px}\n#rsq td{padding:14px 10px;border-top:1px solid var(--line);vertical-align:middle}\n#rsq td b{display:block;font-size:15px}\n#rsq td small{display:block;color:var(--steel);font-size:12px}\n#rsq .sq-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:var(--paper);white-space:nowrap}\n#rsq .sq-pill--hot{background:var(--acc);color:#fff}\n#rsq .sq-empty{text-align:center;color:var(--steel);padding:30px 0}\n#rsq .sq-fine{font-size:12px;color:var(--steel);text-align:center;margin-top:20px}\n@media (max-width:760px){\n  #rsq .sq-shell{padding:24px 16px}\n  #rsq .sq-card{padding:18px}\n  #rsq .sq-intro h1{font-size:28px}\n  #rsq thead{display:none}\n  #rsq tr{display:block;padding:12px 0;border-top:1px solid var(--line)}\n  #rsq tbody tr:first-child{border-top:0;padding-top:0}\n  #rsq td{display:block;border:0;padding:3px 0}\n  #rsq td:last-child{padding-top:10px}\n}\n";
    document.head.appendChild(st);
  }

  function start(cfg) {
    window.__RSDD = { cfg: cfg, mode: mode, client: client };
(() => {
  /* ================= DEALER SETTINGS =================
     quoteStoreUrl must match CONFIG.quoteStoreUrl on the dealer page.
     Leave dealerName blank when Rockstar hosts this page for many dealers: each dealer types their name when signing in.
     Fill it in when a dealer pastes this on their own site. */
  const CONFIG = {
    dealerName:  '',   /* example: 'Smith Chevrolet' (must match the dealer name on the dealer page) */
    dealerLogo:  '',   /* full URL to the dealer logo image */
    accentColor: '',   /* example: '#0055a5' (blank uses Rockstar red) */
    quoteStoreUrl: ''   /* Rockstar quote store endpoint (https://.../quotes) */
  };
  Object.assign(CONFIG, (window.__RSDD && window.__RSDD.cfg) || {});
  /* ==================================================== */

  const VERSION = '3.12';
  const KEEP_DAYS = 90;
  const root = document.getElementById('rsq');
  if (!root) return;
  root.dataset.version = VERSION;

  const STORE_URL = String(CONFIG.quoteStoreUrl || '').trim().replace(/\/+$/, '');
  const BASE_URL = STORE_URL.replace(/\/quotes$/, '');
  const FIXED_DEALER = String(CONFIG.dealerName || '').trim();
  const SAVED_KEY = 'rsq-signin:' + STORE_URL;
  const EVENT_LABELS = {
    quote_requested: ['Locked in payment', true], lease_requested: ['Locked in lease', true],
    quote_printed: ['Printed offer', false], quote_created: ['Link sent', false]
  };

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(CONFIG.accentColor || '').trim())) root.style.setProperty('--acc', CONFIG.accentColor.trim());

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = s => root.querySelector(s);
  const money = v => { const n = Number(v); return v === '' || !isFinite(n) ? '' : '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  const shortDate = iso => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const daysLeft = iso => Math.max(0, KEEP_DAYS - Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

  const store = {
    read() { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || 'null'); } catch (e) { return null; } },
    write(v) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch (e) { /* stays signed in for this visit only */ } },
    clear() { try { localStorage.removeItem(SAVED_KEY); } catch (e) { /* nothing saved */ } }
  };

  let session = null;
  let quotes = [];
  let dealers = null;

  async function api(path, code) {
    const res = await fetch(BASE_URL + path, { headers: { 'x-access-code': code }, cache: 'no-store' });
    if (!res.ok) {
      const err = new Error(res.status === 401 ? 'That access code does not match this dealership. Check the name and code, then try again.'
        : 'The quote store did not answer (' + res.status + '). Try again in a minute.');
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  const frame = body =>
    '<div class="sq-top">' + (CONFIG.dealerLogo ? '<img src="' + esc(CONFIG.dealerLogo) + '" alt="" onerror="this.style.display=\'none\'">' : '') +
      '<b>' + esc(FIXED_DEALER || 'Rockstar Deal Desk') + '</b><span>Saved quotes</span></div>' +
    '<div class="sq-shell">' + body + '</div>';

  function showSetupNeeded() {
    root.innerHTML = frame('<div class="sq-card"><p><b>Quote saving is not turned on yet.</b> Add the quote store address to quoteStoreUrl in this page\'s settings.</p></div>');
  }

  function showLogin(message, dealer) {
    root.innerHTML = frame(
      '<div class="sq-intro"><div class="sq-kicker">Dealer sign in</div><h1>Your saved quotes</h1>' +
        '<p>Every quote your team sent, printed or got locked in over the last ' + KEEP_DAYS + ' days.</p></div>' +
      '<form class="sq-card sq-login" id="sq-login">' +
        (FIXED_DEALER ? '' : '<label class="sq-field">Dealership name<input id="sq-dealer" autocomplete="organization" required placeholder="Exactly as it shows on your quotes"></label>') +
        '<label class="sq-field">Access code<input id="sq-code" autocomplete="current-password" required placeholder="XXXX-XXXX-XXXX-XXXX"></label>' +
        '<button class="sq-btn sq-btn--acc" type="submit" id="sq-go">Show my quotes</button>' +
        (message ? '<p class="sq-error">' + esc(message) + '</p>' : '') +
        '<p class="sq-fine">Forgot your code? Use "Forgot your saved quotes code?" at the bottom of your dealer page to email it to yourself.</p>' +
      '</form>');
    const last = store.read();
    if (!FIXED_DEALER) $('#sq-dealer').value = dealer || (last && last.dealer) || '';
    $('#sq-login').addEventListener('submit', e => {
      e.preventDefault();
      signIn(FIXED_DEALER || $('#sq-dealer').value.trim(), $('#sq-code').value.trim(), true);
    });
  }

  async function signIn(dealer, code, remember) {
    const button = $('#sq-go');
    if (button) button.disabled = true;
    try {
      const list = await api('/quotes?dealer=' + encodeURIComponent(dealer), code);
      session = { dealer, code, slug: list.dealer };
      quotes = list.quotes;
      if (remember) store.write(session);
      dealers = await api('/dealers', code).then(r => r.dealers).catch(() => null);
      showList();
    } catch (err) {
      if (err.status === 401) store.clear();
      showLogin(err.message, dealer);
    }
  }

  const matches = (q, term) => !term ||
    [q.customer_name, q.customer_phone, q.vehicle, q.stock, q.salesperson, q.quote_id].join(' ').toLowerCase().includes(term);

  function rows(term) {
    const shown = quotes.filter(q => matches(q, term));
    $('#sq-count').textContent = shown.length + (shown.length === 1 ? ' quote' : ' quotes');
    $('#sq-rows').innerHTML = shown.length ? shown.map(q => {
      const label = EVENT_LABELS[q.event] || ['Saved', false];
      const pay = money(q.deal_monthly_payment);
      return '<tr>' +
        '<td><b>' + esc(q.customer_name || 'No name') + '</b><small>' + esc(q.customer_phone) + '</small></td>' +
        '<td><b>' + esc(q.vehicle || 'Vehicle not entered') + '</b><small>' + (q.stock ? 'Stock ' + esc(q.stock) : '') + '</small></td>' +
        '<td><b>' + (pay ? esc(pay) + '/mo' : '') + '</b><small>' + esc([{ lease: 'Lease', purchase: 'Purchase' }[q.deal_type], q.deal_term ? q.deal_term + ' months' : ''].filter(Boolean).join(', ')) + '</small></td>' +
        '<td><span class="sq-pill' + (label[1] ? ' sq-pill--hot' : '') + '">' + label[0] + '</span><small>' + esc(q.salesperson) + '</small></td>' +
        '<td><b>' + esc(shortDate(q.saved_at)) + '</b><small>Deleted in ' + daysLeft(q.saved_at) + ' days</small></td>' +
        '<td><button class="sq-btn sq-btn--ghost sq-btn--small" type="button" data-open="' + esc(q.quote_name) + '">Open quote</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" class="sq-empty">' + (quotes.length ? 'No quotes match that search.' : 'No saved quotes in the last ' + KEEP_DAYS + ' days.') + '</td></tr>';
  }

  function adminPanel() {
    if (!dealers) return '';
    return '<div class="sq-admin">' +
      '<label class="sq-field">Admin: view another dealer<select id="sq-pick">' +
        dealers.map(s => '<option value="' + esc(s) + '"' + (s === session.slug ? ' selected' : '') + '>' + esc(s) + '</option>').join('') +
      '</select></label>' +
      '<label class="sq-field">Access code for dealer name<input id="sq-codefor" placeholder="Smith Chevrolet"></label>' +
      '<button class="sq-btn sq-btn--ghost sq-btn--small" type="button" id="sq-makecode">Show code</button>' +
      '<code id="sq-newcode"></code>' +
    '</div>';
  }

  function showList() {
    root.innerHTML = frame(
      '<div class="sq-intro"><div class="sq-kicker">' + esc(session.dealer) + '</div><h1>Saved quotes</h1>' +
        '<p>Newest first. Open a quote to see the full offer and pick the deal back up.</p></div>' +
      adminPanel() +
      '<div class="sq-bar"><label class="sq-field"><input id="sq-search" type="search" placeholder="Search name, phone, vehicle, stock or salesperson"></label>' +
        '<span class="sq-count" id="sq-count"></span>' +
        '<button class="sq-btn sq-btn--ghost sq-btn--small" type="button" id="sq-refresh">Refresh</button>' +
        '<button class="sq-btn sq-btn--ghost sq-btn--small" type="button" id="sq-out">Sign out</button></div>' +
      '<div class="sq-card"><table><thead><tr><th>Customer</th><th>Vehicle</th><th>Payment</th><th>Status</th><th>Saved</th><th></th></tr></thead>' +
        '<tbody id="sq-rows"></tbody></table></div>' +
      '<p class="sq-fine">Quotes are deleted ' + KEEP_DAYS + ' days after they were last saved.</p>');
    rows('');
    $('#sq-search').addEventListener('input', e => rows(e.target.value.trim().toLowerCase()));
    $('#sq-refresh').addEventListener('click', () => signIn(session.dealer, session.code, false));
    $('#sq-out').addEventListener('click', () => { store.clear(); session = null; showLogin('', ''); });
    $('#sq-rows').addEventListener('click', e => {
      const button = e.target.closest('[data-open]');
      if (button) openQuote(button);
    });
    if (dealers) {
      $('#sq-pick').addEventListener('change', e => signIn(e.target.value, session.code, false));
      $('#sq-makecode').addEventListener('click', async () => {
        const name = $('#sq-codefor').value.trim();
        if (!name) return;
        try {
          const r = await api('/access-code?dealer=' + encodeURIComponent(name), session.code);
          $('#sq-newcode').textContent = r.dealer + ': ' + r.access_code;
        } catch (err) { $('#sq-newcode').textContent = err.message; }
      });
    }
  }

  async function openQuote(button) {
    const tab = window.open('', '_blank');
    button.disabled = true;
    try {
      const quote = await api('/quotes/' + encodeURIComponent(button.dataset.open) + '?dealer=' + encodeURIComponent(session.dealer), session.code);
      if (!/^https:\/\//i.test(quote.offer_url || '')) throw new Error('This quote has no link saved.');
      if (tab) tab.location.href = quote.offer_url; else location.href = quote.offer_url;
    } catch (err) {
      if (tab) tab.close();
      alert(err.message);
    } finally {
      button.disabled = false;
    }
  }

  if (!/^https:\/\//i.test(STORE_URL)) return showSetupNeeded();
  const saved = store.read();
  if (saved && saved.code && (FIXED_DEALER ? saved.dealer === FIXED_DEALER : saved.dealer)) signIn(saved.dealer, saved.code, false);
  else showLogin('', '');
})();

  }

  fetch(BASE + '/clients/' + client + '.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('settings ' + r.status); return r.json(); })
    .then(function (cfg) { delete cfg.label; start(cfg); })
    .catch(function (e) { fail('The calculator settings for "' + client + '" could not be loaded (' + (e && e.message) + '). Refresh the page. If it keeps happening, tell Rockstar support.'); });
})();
