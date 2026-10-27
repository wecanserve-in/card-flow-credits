/* ScanMyCard — shared site script (every page). Vanilla JS, no dependencies. */
(function () {
  'use strict';

  /* ---- Site constants: edit here ---- */
  var PLAY_URL = 'https://play.google.com/store/apps/details?id=com.wecanserve.scanmycard';
  var SUPPORT_EMAIL = 'wecanserve23@gmail.com';
  var GST_RATE = 0.18;

  /* ---- Analytics: the single place to add tracking later ----
     Plausible: set ANALYTICS = { plausible: 'scanmycard.in' };
     Google Analytics 4: set ANALYTICS = { ga4: 'G-XXXXXXXXXX' };
     Leave as null for no analytics. */
  var ANALYTICS = null;

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }
  if (!reduceMotion) root.classList.add('js-motion');

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ---- Analytics loader ---- */
  function loadScript(src, attrs) {
    var s = doc.createElement('script');
    s.async = true; s.src = src;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    doc.head.appendChild(s);
  }
  if (ANALYTICS && ANALYTICS.plausible) {
    loadScript('https://plausible.io/js/script.js', { 'data-domain': ANALYTICS.plausible, defer: '' });
  } else if (ANALYTICS && ANALYTICS.ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS.ga4);
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS.ga4));
  }

  /* ---- Play Store links all point at the one constant ---- */
  $all('[data-play]').forEach(function (a) { a.setAttribute('href', PLAY_URL); });

  /* ---- Current page in nav ---- */
  var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '') || '/';
  $all('.nav a, .menu__panel a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.charAt(0) === '/' && href.indexOf('#') === -1 && href.replace(/\/+$/, '') === path && path !== '/') {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---- Mobile menu: close on link click / Escape / outside click ---- */
  var menu = doc.querySelector('.menu');
  if (menu) {
    $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.removeAttribute('open'); }); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.hasAttribute('open')) { menu.removeAttribute('open'); menu.querySelector('summary').focus(); }
    });
    doc.addEventListener('click', function (e) { if (menu.hasAttribute('open') && !menu.contains(e.target)) menu.removeAttribute('open'); });
  }

  /* ---- Theme toggle (follows the system until the visitor picks one) ---- */
  var toggle = doc.querySelector('.theme-toggle');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function syncToggle() {
    if (!toggle) return;
    var dark = currentTheme() === 'dark';
    toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  if (toggle) {
    syncToggle();
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('smc-theme', next); } catch (e) { /* storage blocked */ }
      syncToggle();
    });
  }

  /* ---- Scroll reveals ---- */
  var reveals = $all('.reveal');
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---- Pricing: Personal / Business toggle + computed figures ---- */
  function inr(n, decimals) {
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  $all('.plan[data-price][data-cards]').forEach(function (plan) {
    var price = parseFloat(plan.getAttribute('data-price'));
    var cards = parseFloat(plan.getAttribute('data-cards'));
    if (!price || !cards) return;
    var per = plan.querySelector('[data-per]');
    var total = plan.querySelector('[data-total]');
    if (per) per.textContent = inr(round2(price / cards), 2);
    if (total) total.textContent = inr(round2(price * (1 + GST_RATE)), 2) + ' including GST';
  });
  $all('td[data-per-cell]').forEach(function (td) {
    var tr = td.closest('tr');
    var price = parseFloat(tr.getAttribute('data-price'));
    var cards = parseFloat(tr.getAttribute('data-cards'));
    if (price && cards) td.textContent = inr(round2(price / cards), 2);
  });
  $all('[data-plans]').forEach(function (wrap) {
    var tabs = $all('[data-plan-tab]', wrap);
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var biz = btn.getAttribute('data-plan-tab') === 'business';
        wrap.classList.toggle('show-business', biz);
        tabs.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      });
    });
  });

  /* ---- Pack picker (pricing page): cheapest mix of packs for N cards ---- */
  var picker = doc.querySelector('[data-picker]');
  if (picker) {
    var packs = $all('[data-pack]', doc).map(function (el) {
      return { name: el.getAttribute('data-pack'), price: parseFloat(el.getAttribute('data-price')), cards: parseFloat(el.getAttribute('data-cards')) };
    }).filter(function (p) { return p.price && p.cards; });
    var input = picker.querySelector('input');
    var out = picker.querySelector('[data-picker-out]');
    var cheapest = function (n) {
      // Unbounded knapsack: minimum cost to cover at least n cards. Step 25 keeps it tiny.
      var step = 25, need = Math.ceil(n / step), maxPack = 0;
      packs.forEach(function (p) { maxPack = Math.max(maxPack, Math.ceil(p.cards / step)); });
      var lim = need + maxPack, cost = [0], pick = [-1], i, j;
      for (i = 1; i <= lim; i++) { cost[i] = Infinity; pick[i] = -1; }
      for (i = 1; i <= lim; i++) {
        for (j = 0; j < packs.length; j++) {
          var u = Math.floor(packs[j].cards / step), prev = Math.max(0, i - u);
          if (cost[prev] + packs[j].price < cost[i]) { cost[i] = cost[prev] + packs[j].price; pick[i] = j; }
        }
      }
      var best = need;
      for (i = need; i <= lim; i++) if (cost[i] < cost[best]) best = i;
      var counts = {}, k = best, total = 0, cardsTotal = 0;
      while (k > 0 && pick[k] !== -1) {
        var p = packs[pick[k]];
        counts[p.name] = (counts[p.name] || 0) + 1; total += p.price; cardsTotal += p.cards;
        k = Math.max(0, k - Math.floor(p.cards / step));
      }
      return { counts: counts, total: total, cards: cardsTotal };
    };
    var render = function () {
      var n = Math.round(parseFloat(input.value));
      if (!n || n < 1) { out.innerHTML = '<strong>Enter a number of cards</strong><p>We\'ll work out the cheapest mix of packs.</p>'; return; }
      if (n > 200000) n = 200000;
      if (n <= 5) { out.innerHTML = '<strong>Free</strong><p>Your 25 free scans cover it.</p>'; return; }
      var r = cheapest(n);
      var parts = Object.keys(r.counts).map(function (name) { return r.counts[name] + ' × ' + name; });
      out.innerHTML = '<strong>' + parts.join(' + ') + '</strong>' +
        '<p>' + inr(r.total, 0) + ' + GST (' + inr(round2(r.total * (1 + GST_RATE)), 2) + ' total) for ' +
        r.cards.toLocaleString('en-IN') + ' credits, about ' + inr(round2(r.total / n), 2) + ' per card you need. ' +
        'Leftover credits never expire.</p>';
    };
    input.addEventListener('input', render);
    render();
  }

  /* ---- mailto forms (support + delete account): no backend needed ---- */
  $all('form[data-mailto]').forEach(function (form) {
    var status = form.querySelector('[data-form-status]');
    var fallback = doc.querySelector(form.getAttribute('data-fallback') || '#none');
    function build() {
      var subject = form.getAttribute('data-subject') || 'ScanMyCard';
      var lines = [];
      var intro = form.getAttribute('data-intro');
      if (intro) lines.push(intro, '');
      $all('[name]', form).forEach(function (f) {
        var label = f.getAttribute('data-label') || f.name;
        var v = (f.value || '').trim();
        if (f.name === 'topic' && v) subject = subject + ': ' + v;
        lines.push(label + ': ' + (v || '-'));
      });
      var outro = form.getAttribute('data-outro');
      if (outro) lines.push('', outro);
      return 'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { if (form.reportValidity) form.reportValidity(); return; }
      var href = build();
      if (fallback) fallback.setAttribute('href', href);
      if (status) status.textContent = 'Opening your email app with the message filled in. If nothing happens, use the link below or email ' + SUPPORT_EMAIL + '.';
      window.location.href = href;
    });
  });

  /* ---- Sticky Play bar: hide while the footer is on screen ---- */
  var bar = doc.querySelector('[data-playbar]');
  var footer = doc.querySelector('.site-footer');
  if (bar && footer && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bar.classList.toggle('is-hidden', entries[0].isIntersecting);
    }).observe(footer);
  }
})();
