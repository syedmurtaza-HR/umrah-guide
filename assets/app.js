/* Umrah Guide – app behaviour. Everything is stored only on this device (localStorage). */
(function () {
  'use strict';

  // ---------- safe storage ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ug:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ug:' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('ug:' + k); } catch (e) {} },
    clearAll: function () { try { Object.keys(localStorage).filter(function (k) { return k.indexOf('ug:') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  };

  var STEPS = {
    1: { name: 'Before Umrah', url: 'step1.html' }, 2: { name: 'Ihram', url: 'step2.html' },
    3: { name: 'Entering Makkah', url: 'step3.html' }, 4: { name: 'Entering the Masjid', url: 'step4.html' },
    5: { name: 'Tawaf', url: 'step5.html' }, 6: { name: 'After Tawaf', url: 'step6.html' },
    7: { name: 'Sa‘i', url: 'step7.html' }, 8: { name: 'Halq / Taqsir', url: 'step8.html' },
    9: { name: 'Umrah complete', url: 'complete.html' }
  };
  var CHECK = '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
  var PIN = '<svg class="ic sm" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0119 9.5C19 14.8 12 21 12 21z"></path></svg>';

  var body = document.body;
  var page = body.getAttribute('data-page') || 'page';

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  // ---------- remember where the pilgrim is ----------
  var stepHere = parseInt(body.getAttribute('data-step') || '0', 10);
  if (stepHere) store.set('lastStep', stepHere);
  var lastStep = store.get('lastStep', 0);

  // ---------- checklists ----------
  document.querySelectorAll('.checklist input[type="checkbox"]').forEach(function (cb, i) {
    var key = 'chk:' + page + ':' + i;
    cb.checked = !!store.get(key, false);
    cb.addEventListener('change', function () { store.set(key, cb.checked); });
  });

  // ---------- "My info" fields ----------
  document.querySelectorAll('input[data-save]').forEach(function (inp) {
    var key = 'info:' + inp.getAttribute('data-save');
    inp.value = store.get(key, '');
    inp.addEventListener('input', function () { store.set(key, inp.value); });
  });

  // ---------- counters (Tawaf rounds, Sa'i laps) ----------
  function counterState(name) { return Math.max(0, Math.min(7, store.get('count:' + name, 0))); }
  document.querySelectorAll('[data-counter]').forEach(function (el) {
    var name = el.getAttribute('data-counter');
    function render() {
      var n = counterState(name);
      var cur = Math.min(n + 1, 7);
      el.querySelector('.c-active').hidden = n >= 7;
      el.querySelector('.c-done').hidden = n < 7;
      el.querySelectorAll('[data-c="current"]').forEach(function (s) { s.textContent = cur; });
      var odd = cur % 2 === 1;
      el.querySelectorAll('[data-c="from"]').forEach(function (s) { s.textContent = odd ? 'Safa' : 'Marwah'; });
      el.querySelectorAll('[data-c="to"]').forEach(function (s) { s.textContent = odd ? 'Marwah' : 'Safa'; });
      el.querySelectorAll('[data-n]').forEach(function (d) { d.classList.toggle('on', parseInt(d.getAttribute('data-n'), 10) <= n); });
    }
    el.querySelector('[data-act="add"]').addEventListener('click', function () {
      var n = counterState(name);
      if (n < 7) { store.set('count:' + name, n + 1); if (navigator.vibrate) navigator.vibrate(n + 1 === 7 ? [80, 60, 80] : 40); }
      render();
    });
    el.querySelector('[data-act="undo"]').addEventListener('click', function () {
      store.set('count:' + name, Math.max(0, counterState(name) - 1)); render();
    });
    render();
  });

  // keep the screen awake while a counter page is open (where supported)
  if (document.querySelector('[data-counter]') && navigator.wakeLock) {
    var lock = null;
    var req = function () { navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {}); };
    req();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') req(); });
  }

  // counter status on Quick reference
  document.querySelectorAll('[data-counter-status]').forEach(function (el) {
    var name = el.getAttribute('data-counter-status');
    var n = counterState(name);
    var unit = name === 'tawaf' ? 'Round' : 'Lap';
    el.textContent = n === 0 ? 'Not started' : (n >= 7 ? 'All 7 done' : unit + ' ' + (n + 1) + ' of 7');
  });

  // ---------- Home: continue where you left off ----------
  var cont = document.getElementById('continue');
  if (cont) {
    if (lastStep && STEPS[lastStep]) {
      var s = STEPS[lastStep];
      var extra = '';
      if (lastStep === 5 && counterState('tawaf') > 0 && counterState('tawaf') < 7) extra = ', round ' + (counterState('tawaf') + 1);
      if (lastStep === 7 && counterState('sai') > 0 && counterState('sai') < 7) extra = ', lap ' + (counterState('sai') + 1);
      cont.href = s.url;
      cont.querySelector('[data-c="label"]').textContent = (lastStep === 9 ? '' : 'Step ' + lastStep + ' · ') + s.name + extra;
      cont.hidden = false;
    } else { cont.hidden = true; }
  }

  // ---------- Journey map: "you are here" ----------
  var stops = document.querySelectorAll('.stop[data-step]');
  if (stops.length) {
    stops.forEach(function (stop) {
      var n = parseInt(stop.getAttribute('data-step'), 10);
      stop.classList.remove('done', 'now');
      if (!lastStep) return;
      if (n < lastStep) { stop.classList.add('done'); var dot = stop.querySelector('.dot svg'); if (dot && n < 9) dot.outerHTML = CHECK; }
      else if (n === lastStep) {
        stop.classList.add('now');
        var b = stop.querySelector('.body');
        var pill = document.createElement('span'); pill.className = 'here'; pill.innerHTML = PIN + 'YOU ARE HERE';
        b.insertBefore(pill, b.firstChild);
      }
    });
    var hs = document.getElementById('here-line');
    if (hs) hs.textContent = lastStep && lastStep < 9 ? '8 steps. You are on step ' + lastStep + '.' : (lastStep === 9 ? 'All 8 steps done. Alhamdulillah.' : '8 steps. Start with step 1.');
    var jn = document.getElementById('journey-next');
    if (jn) {
      var target = lastStep ? lastStep : 1;
      jn.href = STEPS[target].url;
      jn.querySelector('small').textContent = lastStep ? (target === 9 ? 'Finished' : 'Continue · Step ' + target) : 'Start · Step 1';
      jn.querySelector('strong').textContent = STEPS[target].name;
    }
  }

  // ---------- Menu: highlight current step ----------
  document.querySelectorAll('.mi[data-step]').forEach(function (mi) {
    var n = parseInt(mi.getAttribute('data-step'), 10);
    mi.classList.remove('done', 'now');
    if (!lastStep) return;
    if (n < lastStep) mi.classList.add('done');
    else if (n === lastStep) {
      mi.classList.add('now'); mi.setAttribute('aria-current', 'step');
      var label = mi.querySelector('.lbl');
      if (label) label.insertAdjacentHTML('beforeend', '<small>YOU ARE HERE</small>');
    }
  });
  document.querySelectorAll('[data-back]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (history.length > 1 && document.referrer && document.referrer.indexOf(location.origin) === 0) { e.preventDefault(); history.back(); }
    });
  });

  // ---------- reset ----------
  document.querySelectorAll('[data-action="reset"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (confirm('Start a new Umrah? This clears your ticks, counters and progress on this phone. Your “My info” card is kept.')) {
        var keep = {};
        try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('ug:info:') === 0 || k === 'ug:textsize') keep[k] = localStorage.getItem(k); }); } catch (e) {}
        store.clearAll();
        try { Object.keys(keep).forEach(function (k) { localStorage.setItem(k, keep[k]); }); } catch (e) {}
        location.href = 'index.html';
      }
    });
  });

  // ---------- text size ----------
  var SIZES = [1, 1.15, 1.3];
  function applySize(i) { document.documentElement.style.zoom = SIZES[i]; }
  document.querySelectorAll('[data-action="textsize"]').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = (store.get('textsize', 0) + 1) % SIZES.length;
      store.set('textsize', i); applySize(i);
      toast(['Normal text', 'Large text', 'Extra large text'][i]);
    });
  });

  // ---------- things not built yet ----------
  document.querySelectorAll('.audio').forEach(function (b) {
    b.addEventListener('click', function () { toast('Audio recitation is not added yet.'); });
  });
  document.querySelectorAll('[data-soon]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); toast(b.getAttribute('data-soon')); });
  });

  // ---------- share ----------
  document.querySelectorAll('[data-action="share"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var url = new URL('index.html', location.href).href;
      if (navigator.share) navigator.share({ title: 'Umrah Guide', text: 'A free, simple step-by-step Umrah guide that works offline.', url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); });
      else toast(url);
    });
  });

  // ---------- My info full screen ----------
  document.querySelectorAll('[data-action="showinfo"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var rows = [['Name', 'name'], ['Hotel', 'hotel'], ['Group leader’s phone', 'phone'], ['Meeting gate', 'gate']];
      var html = '<dl style="margin:0">';
      rows.forEach(function (r) {
        var v = store.get('info:' + r[1], '') || '—';
        html += '<dt>' + r[0] + '</dt><dd>' + String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</dd>';
      });
      html += '<dt>Emergency (Makkah)</dt><dd>911</dd></dl>';
      var sheet = document.createElement('div');
      sheet.className = 'infosheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'My info');
      sheet.innerHTML = '<div style="font:600 30px var(--display)">Please help me</div>' + html + '<button class="btn primary" type="button">Close</button>';
      document.body.appendChild(sheet);
      var close = sheet.querySelector('button'); close.focus();
      close.addEventListener('click', function () { sheet.remove(); a.focus(); });
    });
  });

  // ---------- search (menu) ----------
  var search = document.getElementById('search');
  var results = document.getElementById('results');
  if (search && results) {
    var index = null;
    fetch('search-index.json').then(function (r) { return r.json(); }).then(function (j) { index = j; }).catch(function () {});
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      results.innerHTML = '';
      if (!q || !index) { results.hidden = true; return; }
      var terms = q.split(/\s+/);
      var hits = index.filter(function (p) { return terms.every(function (t) { return p.text.indexOf(t) !== -1; }); }).slice(0, 8);
      results.hidden = false;
      if (!hits.length) { results.innerHTML = '<p class="small muted">No matches. Try a shorter word, e.g. “wudu”.</p>'; return; }
      hits.forEach(function (p) {
        var i = p.text.indexOf(terms[0]);
        var snip = p.text.slice(Math.max(0, i - 40), i + 80);
        var a = document.createElement('a'); a.href = p.url;
        a.innerHTML = '<b></b><span></span>';
        a.querySelector('b').textContent = p.title;
        a.querySelector('span').textContent = '…' + snip + '…';
        results.appendChild(a);
      });
    });
  }

  // ---------- install prompt (Home) ----------
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    var bar = document.getElementById('install');
    if (bar) bar.hidden = false;
  });
  var ib = document.getElementById('install-btn');
  if (ib) ib.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function () { deferred = null; document.getElementById('install').hidden = true; });
  });

  // ---------- print ----------
  document.querySelectorAll('[data-action="print"]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  // ---------- offline support ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Guide updated. Reopen to see the latest version.');
            else if (w.state === 'activated' && !navigator.serviceWorker.controller) toast('Saved for offline use.');
          });
        });
      }).catch(function () {});
    });
  }
})();
