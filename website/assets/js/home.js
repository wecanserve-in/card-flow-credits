/* ScanMyCard — home page interactions: pile-to-sheet scroll scene, try-it demo, before/after slider.
   Vanilla JS. Everything degrades to a static, readable page without JS or with reduced motion. */
(function () {
  'use strict';

  var doc = document;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* =========================================================
     1. Signature: scattered cards snap into a table on scroll
     ========================================================= */
  (function sortScene() {
    var section = doc.querySelector('.sort');
    if (!section || reduceMotion) return; // static table is already shown
    var track = section.querySelector('.sort__track');
    var board = section.querySelector('.sort__board');
    var cards = $all('.pile .bcard', section);
    var rows = $all('.sheet tbody tr', section);
    var counter = section.querySelector('[data-counter]');
    var TOTAL = parseInt(counter ? counter.textContent : '147', 10) || 147;
    var n = Math.min(cards.length, rows.length);
    var geo = null, ticking = false, lastP = -1;

    function measure() {
      var b = board.getBoundingClientRect();
      var cw = clamp(b.width * 0.36, 128, 210);
      board.style.setProperty('--cw', cw + 'px');
      var ch = cw / 1.75;
      geo = { w: b.width, h: b.height, cw: cw, ch: ch, targets: [] };
      for (var i = 0; i < n; i++) {
        var r = rows[i].getBoundingClientRect();
        geo.targets.push({ x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height });
      }
    }

    function frame() {
      ticking = false;
      if (!geo) measure();
      var t = track.getBoundingClientRect();
      var span = t.height - window.innerHeight;
      var p = span > 0 ? clamp(-t.top / span, 0, 1) : 1;
      if (Math.abs(p - lastP) < 0.0005) return;
      lastP = p;
      var landed = 0;
      for (var i = 0; i < n; i++) {
        var c = cards[i], g = geo.targets[i];
        // Each card gets its own window, so they fly in one after another.
        var start = 0.06 + i * 0.075, end = start + 0.32;
        var k = easeInOut(clamp((p - start) / (end - start), 0, 1));
        var sx = parseFloat(c.getAttribute('data-x')) * (geo.w - geo.cw * 0.6);
        var sy = parseFloat(c.getAttribute('data-y')) * Math.max(geo.h - geo.ch * 0.6, geo.ch);
        var sr = parseFloat(c.getAttribute('data-r'));
        // Land as a small card on the left edge of its row, then fade while the row appears.
        var endScale = (g.h / geo.ch) * 1.1;
        var sc = lerp(1, endScale, k);
        var x = lerp(sx, g.x + 6, k), y = lerp(sy, g.y + (g.h - geo.ch * endScale) / 2, k), rot = lerp(sr, 0, k);
        var op = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
        c.style.opacity = op.toFixed(3);
        c.style.zIndex = String(k > 0 && k < 1 ? 20 + i : 10 - i);
        var isIn = k >= 0.82;
        if (isIn) landed++;
        if (isIn !== rows[i].classList.contains('is-in')) {
          rows[i].classList.toggle('is-in', isIn);
          if (isIn) {
            rows[i].classList.add('is-new');
            (function (row) { setTimeout(function () { row.classList.remove('is-new'); }, 700); })(rows[i]);
          }
        }
      }
      if (counter) {
        var shown = landed === n ? TOTAL : Math.round(TOTAL * easeInOut(clamp(p / 0.85, 0, 1)) * 0.98);
        counter.textContent = String(shown);
      }
      section.classList.toggle('is-done', landed === n);
    }

    function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } }
    function onResize() { geo = null; lastP = -1; request(); }

    // Only listen while the section is near the viewport.
    var active = false;
    function setActive(on) {
      if (on === active) return;
      active = on;
      if (on) { window.addEventListener('scroll', request, { passive: true }); request(); }
      else window.removeEventListener('scroll', request);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { setActive(en[0].isIntersecting); }, { rootMargin: '200px 0px' }).observe(section);
    } else { setActive(true); }
    window.addEventListener('resize', onResize);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(onResize);
    request();
  })();

  /* =========================================================
     2. "Try it" demo: scripted, client-side only
     ========================================================= */
  (function demo() {
    var root = doc.querySelector('[data-demo]');
    if (!root) return;
    var SAMPLES = [
      {
        color: '#B45309', logo: 'SH',
        name: 'Priya Sharma', company: 'Sharma Handicrafts Pvt. Ltd.', designation: 'Export Manager',
        phone: '+91 98765 43210', email: 'priya@sharmahandicrafts.in', website: 'www.sharmahandicrafts.in',
        country: 'India', address: '14 Civil Lines, Moradabad, Uttar Pradesh 244001'
      },
      {
        color: '#0044AC', logo: 'MR',
        name: 'Rahul Mehta', company: 'Mehta Realty LLP', designation: 'Senior Property Consultant',
        phone: '+91 98765 11730', email: 'rahul@mehtarealty.in', website: 'www.mehtarealty.in',
        country: 'India', address: '7th Floor, Sunrise Tower, Andheri East, Mumbai 400069'
      },
      {
        color: '#0F766E', logo: 'H&H',
        name: 'Lukas Weber', company: 'Haus & Hof GmbH', designation: 'Head of Sourcing',
        phone: '+49 151 0000 4421', email: 'l.weber@hausundhof.de', website: 'www.hausundhof.de',
        country: 'Germany', address: 'Lindenstraße 12, 50674 Köln'
      }
    ];
    var KEYS = ['name', 'company', 'designation', 'phone', 'email', 'website', 'country', 'address'];
    var LABELS = ['Name', 'Company', 'Designation', 'Phone', 'Email', 'Website', 'Country', 'Address'];
    var idx = 0, timers = [], running = false;
    var card = root.querySelector('.vcard');
    var scanBtn = root.querySelector('[data-demo-scan]');
    var scanLabel = root.querySelector('[data-demo-label]');
    var nextBtn = root.querySelector('[data-demo-next]');
    var status = root.querySelector('[data-demo-status]');
    var live = root.querySelector('[data-demo-live]');
    var fields = $all('.rf', root);

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function renderCard(s) {
      card.style.setProperty('--vc', s.color);
      card.innerHTML =
        '<div class="vcard__who"><b>' + esc(s.name) + '</b><i>' + esc(s.designation) + '</i></div>' +
        '<div class="vcard__logo" aria-hidden="true">' + esc(s.logo) + '</div>' +
        '<div class="vcard__co">' + esc(s.company) + '</div>' +
        '<div class="vcard__lines"><span>' + esc(s.phone) + '</span><span>' + esc(s.email) + '</span>' +
        '<span>' + esc(s.website) + '</span><span>' + esc(s.country) + '</span>' +
        '<span class="full">' + esc(s.address) + '</span></div>';
    }
    function resetFields() {
      fields.forEach(function (f) {
        f.classList.remove('is-filled', 'is-typing');
        f.querySelector('dd').innerHTML = '<span class="ph"></span>';
      });
    }
    function setState(state) {
      root.classList.toggle('is-scanning', state === 'scanning');
      root.classList.toggle('is-done', state === 'done');
      status.textContent = state === 'scanning' ? 'AI is reading…' : state === 'done' ? '8 of 8 fields found' : 'Waiting to scan';
    }

    function typeInto(field, text, done) {
      var dd = field.querySelector('dd');
      if (reduceMotion) { dd.textContent = text; field.classList.add('is-filled'); done(); return; }
      field.classList.add('is-typing');
      var i = 0, stepMs = Math.max(12, Math.min(28, 420 / text.length));
      (function tick() {
        i = Math.min(text.length, i + 1 + (text.length > 24 ? 1 : 0));
        dd.textContent = text.slice(0, i);
        if (i < text.length) later(tick, stepMs);
        else { field.classList.remove('is-typing'); field.classList.add('is-filled'); later(done, 90); }
      })();
    }

    function run() {
      if (running) return;
      running = true;
      clearTimers(); resetFields();
      scanBtn.disabled = true; nextBtn.disabled = true;
      setState('scanning');
      live.textContent = 'Scanning the card.';
      var s = SAMPLES[idx];
      var startFill = function () {
        var k = 0;
        (function next() {
          if (k >= KEYS.length) {
            setState('done'); running = false;
            scanBtn.disabled = false; nextBtn.disabled = false;
            scanLabel.textContent = 'Scan again';
            live.textContent = 'Done. ' + KEYS.map(function (key, i) { return LABELS[i] + ': ' + s[key]; }).join('. ') + '.';
            return;
          }
          typeInto(fields[k], s[KEYS[k]], function () { k++; next(); });
        })();
      };
      if (reduceMotion) startFill(); else later(startFill, 1500);
    }

    scanBtn.addEventListener('click', run);
    nextBtn.addEventListener('click', function () {
      if (running) return;
      clearTimers();
      idx = (idx + 1) % SAMPLES.length;
      renderCard(SAMPLES[idx]); resetFields(); setState('idle');
      scanLabel.textContent = 'Scan this card';
      live.textContent = 'New sample card loaded: ' + SAMPLES[idx].name + ', ' + SAMPLES[idx].company + '.';
    });
  })();

  /* =========================================================
     3. Before / after slider (range input = keyboard + touch)
     ========================================================= */
  $all('[data-ba]').forEach(function (ba) {
    var range = ba.querySelector('.ba__range');
    if (!range) return;
    var touched = false;
    function set(v) { ba.style.setProperty('--pos', v + '%'); }
    function hint(v) { if (!touched) set(v); }
    range.addEventListener('input', function () { touched = true; ba.classList.remove('is-hint'); set(range.value); });
    set(range.value);
    // One gentle hint when it first scrolls into view.
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      ba.classList.add('is-hint');
      setTimeout(function () { hint(28); }, 400);
      setTimeout(function () { hint(66); }, 1350);
      setTimeout(function () { hint(range.value); }, 2300);
      setTimeout(function () { ba.classList.remove('is-hint'); }, 3300);
    }, { threshold: 0.6 });
    io.observe(ba);
  });
})();
