(function () {
  var q = new URLSearchParams(location.search);
  var client = (q.get('client') || '').replace(/[^a-z0-9-]/g, '');
  var site = (q.get('site') || '').replace(/[^a-z0-9.:-]/gi, '');
  function fill(key, value) {
    document.querySelectorAll('[data-dg="' + key + '"]').forEach(function (n) { n.textContent = value; });
  }
  if (site) fill('site', site);
  if (!client) return;
  fetch('../clients/' + client + '.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (c) {
      if (!c) return;
      var name = String(c.dealerName || '').trim();
      if (name) { fill('dn', name); document.title = name + ' · ' + document.title; }
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c.accentColor || '').trim())) document.documentElement.style.setProperty('--acc', c.accentColor.trim());
      var slot = document.querySelector('[data-dg="logo"]');
      if (slot && /^(https:\/\/|data:image\/)/.test(String(c.dealerLogo || ''))) {
        var img = new Image();
        img.className = 'dealer-logo';
        img.alt = name;
        img.onerror = function () { img.remove(); };
        img.src = c.dealerLogo;
        slot.replaceWith(img);
      }
    })
    .catch(function () { /* the guide still reads fine without the dealer's name and logo */ });
})();
