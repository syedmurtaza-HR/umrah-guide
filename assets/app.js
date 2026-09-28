/* Shahid (Umrah Guide) – app behaviour. Everything is stored only on this device (localStorage). */
(function () {
  'use strict';

  // ---------- safe storage ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('ug:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ug:' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('ug:' + k); } catch (e) {} },
    clearAll: function () { try { Object.keys(localStorage).filter(function (k) { return k.indexOf('ug:') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} }
  };

  // ---------- language (English pages: x.html, Urdu pages: x-ur.html) ----------
  var UR = document.documentElement.lang === 'ur';
  var L = function (en, ur) { return UR ? ur : en; };
  var u = function (url) { return UR ? url.replace(/^([a-z0-9]+)\.html/, '$1-ur.html') : url; };
  function otherLangUrl() {
    var p = location.pathname, file = p.slice(p.lastIndexOf('/') + 1) || 'index.html';
    var m = file.match(/^([a-z0-9]+?)(-ur)?\.html$/);
    var base = m ? m[1] : 'index';
    if (base === '404') base = 'index';
    return base + (UR ? '' : '-ur') + '.html' + location.hash;
  }
  function switchLang(to) {
    store.set('lang', to);
    if ((to === 'ur') !== UR) location.href = otherLangUrl();
  }

  var STEPS = {
    1: { name: L('Before Umrah', 'عمرہ سے پہلے'), url: 'step1.html' }, 2: { name: L('Ihram', 'احرام'), url: 'step2.html' },
    3: { name: L('Entering Makkah', 'مکہ میں داخلہ'), url: 'step3.html' }, 4: { name: L('Entering the Masjid', 'مسجد میں داخلہ'), url: 'step4.html' },
    5: { name: L('Tawaf', 'طواف'), url: 'step5.html' }, 6: { name: L('After Tawaf', 'طواف کے بعد'), url: 'step6.html' },
    7: { name: L('Sa‘i', 'سعی'), url: 'step7.html' }, 8: { name: L('Halq / Taqsir', 'حلق / تقصیر'), url: 'step8.html' },
    9: { name: L('Umrah complete', 'عمرہ مکمل'), url: 'complete.html' }
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
      el.querySelectorAll('[data-c="from"]').forEach(function (s) { s.textContent = odd ? L('Safa', 'صفا') : L('Marwah', 'مروہ'); });
      el.querySelectorAll('[data-c="to"]').forEach(function (s) { s.textContent = odd ? L('Marwah', 'مروہ') : L('Safa', 'صفا'); });
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
    var unit = name === 'tawaf' ? L('Round', 'چکر') : L('Lap', 'چکر');
    el.textContent = n === 0 ? L('Not started', 'شروع نہیں ہوا') : (n >= 7 ? L('All 7 done', 'ساتوں مکمل') : unit + ' ' + (n + 1) + L(' of 7', ' از 7'));
  });

  // ---------- Home: continue where you left off ----------
  var cont = document.getElementById('continue');
  if (cont) {
    if (lastStep && STEPS[lastStep]) {
      var s = STEPS[lastStep];
      var extra = '';
      if (lastStep === 5 && counterState('tawaf') > 0 && counterState('tawaf') < 7) extra = L(', round ', '، چکر ') + (counterState('tawaf') + 1);
      if (lastStep === 7 && counterState('sai') > 0 && counterState('sai') < 7) extra = L(', lap ', '، چکر ') + (counterState('sai') + 1);
      cont.href = u(s.url);
      cont.querySelector('[data-c="label"]').textContent = (lastStep === 9 ? '' : L('Step ', 'مرحلہ ') + lastStep + ' · ') + s.name + extra;
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
        var pill = document.createElement('span'); pill.className = 'here'; pill.innerHTML = PIN + L('YOU ARE HERE', 'آپ یہاں ہیں');
        b.insertBefore(pill, b.firstChild);
      }
    });
    var hs = document.getElementById('here-line');
    if (hs) hs.textContent = lastStep && lastStep < 9 ? L('8 steps. You are on step ' + lastStep + '.', '8 مراحل۔ آپ مرحلہ ' + lastStep + ' پر ہیں۔') : (lastStep === 9 ? L('All 8 steps done. Alhamdulillah.', 'تمام 8 مراحل مکمل۔ الحمدللہ۔') : L('8 steps. Start with step 1.', '8 مراحل۔ مرحلہ 1 سے شروع کریں۔'));
    var jn = document.getElementById('journey-next');
    if (jn) {
      var target = lastStep ? lastStep : 1;
      jn.href = u(STEPS[target].url);
      jn.querySelector('small').textContent = lastStep ? (target === 9 ? L('Finished', 'مکمل') : L('Continue · Step ', 'جاری رکھیں · مرحلہ ') + target) : L('Start · Step 1', 'شروع · مرحلہ 1');
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
      if (label) label.insertAdjacentHTML('beforeend', '<small>' + L('YOU ARE HERE', 'آپ یہاں ہیں') + '</small>');
    }
  });
  document.querySelectorAll('[data-back]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (history.length > 1 && document.referrer && document.referrer.indexOf(location.origin) === 0) { e.preventDefault(); history.back(); }
    });
  });


  // ---------- My dua list ----------
  var dl = document.getElementById('dua-list');
  if (dl) {
    var who = document.getElementById('d-who'), what = document.getElementById('d-what');
    var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var list = function () { var l = store.get('duas', []); return Array.isArray(l) ? l : []; };
    var save = function (l) { store.set('duas', l); render(); };
    var render = function () {
      var l = list();
      dl.innerHTML = l.map(function (d, i) {
        return '<li class="' + (d.done ? 'done' : '') + '"><input type="checkbox" id="dua-' + i + '" data-i="' + i + '"' + (d.done ? ' checked' : '') + '>' +
          '<label for="dua-' + i + '" style="display:flex;flex-direction:column;gap:2px;cursor:pointer"><span class="who">' + esc(d.who) + '</span>' + (d.what ? '<span class="what">' + esc(d.what) + '</span>' : '') + '</label>' +
          '<button type="button" class="del" data-del="' + i + '" aria-label="' + L('Remove ', 'ہٹائیں: ') + esc(d.who) + '"><svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg></button></li>';
      }).join('');
      var done = l.filter(function (d) { return d.done; }).length;
      var c = document.getElementById('dua-count'); if (c) c.textContent = UR ? (l.length + ' میں سے ' + done + ' کے لیے دعا ہو گئی') : (done + ' of ' + l.length + ' prayed for');
      var e = document.getElementById('dua-empty'); if (e) e.hidden = l.length > 0;
    };
    var add = function (w, t) {
      w = (w || '').trim(); t = (t || '').trim();
      if (!w) { toast(L('Who shall I add? Type their name first.', 'کس کا نام شامل کروں؟ پہلے نام لکھیں۔')); if (who) who.focus(); return; }
      var l = list(); l.push({ who: w.slice(0, 80), what: t.slice(0, 160), done: false }); save(l);
      toast(L('Added. I’ll keep them on your list.', 'شامل ہو گیا۔ ہم انہیں آپ کی فہرست میں رکھیں گے۔'));
    };
    document.querySelectorAll('[data-action="dua-add"]').forEach(function (b) {
      b.addEventListener('click', function () { add(who && who.value, what && what.value); if (who) who.value = ''; if (what) what.value = ''; });
    });
    [who, what].forEach(function (inp) { if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); add(who.value, what.value); who.value = ''; what.value = ''; who.focus(); } }); });
    document.querySelectorAll('[data-quick]').forEach(function (b) { b.addEventListener('click', function () { add(b.getAttribute('data-quick'), ''); }); });
    dl.addEventListener('change', function (e) {
      var i = e.target.getAttribute('data-i'); if (i === null) return;
      var l = list(); if (l[i]) { l[i].done = e.target.checked; save(l); if (navigator.vibrate && e.target.checked) navigator.vibrate(30); }
    });
    dl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      var l = list(); var i = +b.getAttribute('data-del');
      if (l[i] && confirm(UR ? ('“' + l[i].who + '” کو فہرست سے ہٹا دیں؟') : ('Remove “' + l[i].who + '” from your list?'))) { l.splice(i, 1); save(l); }
    });
    document.querySelectorAll('[data-action="dua-reset"]').forEach(function (b) {
      b.addEventListener('click', function () { var l = list(); l.forEach(function (d) { d.done = false; }); save(l); toast(L('All clear, ready for your next Tawaf.', 'سب صاف، اگلے طواف کے لیے تیار۔')); });
    });
    render();
  }

  // ---------- reset ----------
  document.querySelectorAll('[data-action="reset"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (confirm(L('Starting a new Umrah? I’ll clear your ticks, counters and progress on this phone. Don’t worry, your “My info” card and dua list stay.', 'نیا عمرہ شروع کرنا ہے؟ ہم اس فون سے آپ کے نشان، گنتی اور پیش رفت صاف کر دیں گے۔ فکر نہ کریں، “میری معلومات” کارڈ اور دعاؤں کی فہرست محفوظ رہیں گی۔'))) {
        var keep = {};
        try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('ug:info:') === 0 || k === 'ug:textsize' || k === 'ug:duas' || k === 'ug:voiceLang' || k === 'ug:voiceSlow' || k === 'ug:lang' || k === 'ug:who' || k === 'ug:showall' || k === 'ug:when' || k === 'ug:from') keep[k] = localStorage.getItem(k); }); } catch (e) {}
        store.clearAll();
        try { Object.keys(keep).forEach(function (k) { localStorage.setItem(k, keep[k]); }); } catch (e) {}
        location.href = u('index.html');
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
      toast(UR ? ['عام تحریر', 'بڑی تحریر', 'بہت بڑی تحریر'][i] : ['Normal text', 'Large text', 'Extra large text'][i]);
    });
  });

  // ---------- things not built yet ----------
  document.querySelectorAll('.audio').forEach(function (b) {
    b.addEventListener('click', function () { toast(L('Arabic recitation is not added yet. Use “Key points” at the top of the page to listen.', 'عربی تلاوت ابھی شامل نہیں کی گئی۔ صفحے کے اوپر “اہم باتیں سنیں” استعمال کریں۔')); });
  });
  document.querySelectorAll('[data-action="lang"]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); switchLang(UR ? 'en' : 'ur'); });
  });
  // first visit: let the reader choose a language for the whole guide
  if (store.get('lang', null) === null && page !== 'print') {
    var ch = document.createElement('div');
    ch.className = 'langpick'; ch.setAttribute('role', 'dialog'); ch.setAttribute('aria-label', 'Choose language / زبان منتخب کریں');
    ch.innerHTML = '<div class="langpick-box"><div class="langpick-t">السلام علیکم<span>Which language shall I guide you in?</span><span lang="ur" style="font:400 18px/2 var(--arabic)">میں آپ کی رہنمائی کس زبان میں کروں؟</span></div>' +
      '<button type="button" class="btn primary" data-l="ur" lang="ur">اردو</button>' +
      '<button type="button" class="btn secondary" data-l="en">English</button>' +
      '<p>You can change this any time from the menu. · آپ یہ کسی بھی وقت مینو سے بدل سکتے ہیں۔</p></div>';
    document.body.appendChild(ch);
    ch.addEventListener('click', function (e) {
      var b = e.target.closest('[data-l]'); if (!b) return;
      var to = b.getAttribute('data-l');
      ch.remove(); switchLang(to);
      if ((to === 'ur') === UR && store.get('who', null) === null) onboard();
    });
  }
  // ---------- who is travelling (personalised guide) ----------
  var WHO = [
    ['man', L('I’m a man, travelling on my own', 'میں مرد ہوں، اکیلا سفر کر رہا ہوں'), '<circle cx="12" cy="7" r="3.5"></circle><path d="M5 21c0-4 3-7 7-7s7 3 7 7"></path>'],
    ['woman', L('I’m a woman, on my own or with other women', 'میں خاتون ہوں، اکیلی یا خواتین کے ساتھ'), '<circle cx="12" cy="7" r="3.5"></circle><path d="M5 21c0-4 3-7 7-7s7 3 7 7"></path><path d="M9 4.5c1-2 5-2 6 0"></path>'],
    ['couple', L('My husband or wife is coming with me', 'میرے شوہر یا بیوی میرے ساتھ ہیں'), '<circle cx="8" cy="8" r="3"></circle><circle cx="16" cy="8" r="3"></circle><path d="M2.5 20c0-3.3 2.4-6 5.5-6s5.5 2.7 5.5 6M10.5 20c0-3.3 2.4-6 5.5-6s5.5 2.7 5.5 6"></path>'],
    ['elderly', L('I’m taking my elderly parents', 'میرے بزرگ والدین میرے ساتھ ہیں'), '<path d="M12 3v18M8 21h8"></path><circle cx="12" cy="6" r="2"></circle>'],
    ['babies', L('We have a baby or little ones with us', 'ہمارے ساتھ شیر خوار یا چھوٹے بچے ہیں'), '<circle cx="12" cy="9" r="5"></circle><path d="M10 9h.01M14 9h.01M10.5 11.5c.9.7 2.1.7 3 0M6 20c1.5-3 3.6-4.5 6-4.5s4.5 1.5 6 4.5"></path>'],
    ['kids', L('We have older children with us', 'ہمارے ساتھ بڑے بچے ہیں'), '<circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="10" r="2.3"></circle><path d="M2.5 20c0-3.3 2.4-6 5.5-6s5.5 2.7 5.5 6M13.5 20c.2-2.6 1.7-4.5 3.5-4.5s3.3 1.9 3.5 4.5"></path>']
  ];
  var SHORT = { man: L('a man on his own', 'اکیلے مرد'), woman: L('a woman', 'خاتون'), couple: L('a couple', 'میاں بیوی'), elderly: L('with your parents', 'والدین کے ساتھ'), babies: L('with little ones', 'چھوٹے بچوں کے ساتھ'), kids: L('with older children', 'بڑے بچوں کے ساتھ') };
  var who = store.get('who', null);
  var showAll = !!store.get('showall', false);
  function whoLabel(list) { return (list || []).map(function (k) { return SHORT[k]; }).filter(Boolean).join(L(', ', '، ')); }
  function openWho(onDone, step) {
    var sel = (who || []).slice();
    var box = document.createElement('div');
    box.className = 'langpick whopick'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', L('Who’s coming on this journey?', 'اس سفر میں کون کون شامل ہے؟'));
    box.innerHTML = '<div class="langpick-box">' + (step ? '<div class="small muted" style="text-align:center">' + step + '</div>' : '') + '<div class="langpick-t" style="text-align:center">' + L('Who’s coming on this journey?', 'اس سفر میں کون کون شامل ہے؟') + '</div>' +
      '<p style="text-align:center">' + L('Tell me who’s travelling and I’ll keep this guide to what matters for you. Pick as many as you like.', 'ہمیں بتائیں سفر میں کون کون شامل ہے، ہم آپ کو صرف وہی دکھائیں گے جو آپ کے کام کا ہے۔ جتنے چاہیں منتخب کریں۔') + '</p>' +
      '<div class="who-grid">' + WHO.map(function (w) {
        return '<button type="button" class="who" data-who="' + w[0] + '" aria-pressed="' + (sel.indexOf(w[0]) > -1) + '"><svg class="ic" viewBox="0 0 24 24">' + w[2] + '</svg><span>' + w[1] + '</span><span class="tick">' + CHECK.replace('class="ic"', 'class="ic sm"') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="row"><button type="button" class="btn secondary" data-who-act="all">' + L('Show me everything', 'مجھے سب کچھ دکھائیں') + '</button><button type="button" class="btn primary" data-who-act="save">' + L('That’s us', 'جی، یہی ہیں') + '</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-who]');
      if (b) { var k = b.getAttribute('data-who'), i = sel.indexOf(k); if (i > -1) sel.splice(i, 1); else sel.push(k); b.setAttribute('aria-pressed', i === -1); return; }
      var a = e.target.closest('[data-who-act]'); if (!a) return;
      if (a.getAttribute('data-who-act') === 'save' && sel.length) { store.set('who', sel); store.set('showall', false); }
      else { store.set('who', []); store.set('showall', false); }
      box.remove();
      if (onDone) onDone(); else location.reload();
    });
  }
  document.querySelectorAll('[data-action="profile"]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openWho(); }); });

  // ---------- when and from where (trip) ----------
  var MONTHS = UR ? ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var FROM = [['pk', L('Pakistan', 'پاکستان')], ['ae', L('United Arab Emirates', 'متحدہ عرب امارات')], ['sa', L('I live in Saudi Arabia', 'میری رہائش سعودی عرب میں ہے')], ['gb', L('United Kingdom', 'برطانیہ')], ['other', L('Somewhere else', 'کہیں اور سے')]];
  var tripData = null;
  function getTripData() { return tripData ? Promise.resolve(tripData) : fetch('assets/trip-data.json').then(function (r) { return r.json(); }).then(function (j) { tripData = j; return j; }); }
  function monthLabel(ym) { if (!ym) return L('I haven’t decided yet', 'ابھی طے نہیں کیا'); var p = ym.split('-'); return MONTHS[+p[1] - 1] + ' ' + p[0]; }
  function fromLabel(k) { var f = FROM.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : L('You haven’t told me yet', 'آپ نے ابھی نہیں بتایا'); }
  function sheet(title, sub, opts, current, onPick, step) {
    var box = document.createElement('div');
    box.className = 'langpick whopick'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', title);
    box.innerHTML = '<div class="langpick-box">' + (step ? '<div class="small muted" style="text-align:center">' + step + '</div>' : '') + '<div class="langpick-t" style="text-align:center">' + title + '</div><p style="text-align:center">' + sub + '</p><div class="who-grid">' +
      opts.map(function (o) { return '<button type="button" class="who" data-v="' + o[0] + '" aria-pressed="' + (o[0] === current) + '"><span>' + o[1] + '</span><span class="tick">' + CHECK.replace('class="ic"', 'class="ic sm"') + '</span></button>'; }).join('') + '</div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; box.remove(); onPick(b.getAttribute('data-v')); });
  }
  function openWhen(onDone, step) {
    var now = new Date(), opts = [];
    for (var i = 0; i < 12; i++) { var d = new Date(now.getFullYear(), now.getMonth() + i, 1); var ym = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); opts.push([ym, monthLabel(ym)]); }
    opts.push(['', L('I haven’t decided yet', 'ابھی طے نہیں کیا')]);
    sheet(L('When are you hoping to go?', 'آپ کب جانے کا ارادہ رکھتے ہیں؟'), L('I’ll tell you what the weather will be like, and whether it’s a busy time.', 'ہم آپ کو بتائیں گے کہ موسم کیسا ہوگا، اور کیا اس وقت رش ہوتا ہے۔'), opts, store.get('when', null), function (v) { store.set('when', v); if (onDone) onDone(); else location.reload(); }, step);
  }
  function openFrom(onDone, step) {
    sheet(L('Where will you be travelling from?', 'آپ کا سفر کہاں سے ہے؟'), L('Visas, vaccines and where to put on ihram depend on your route. I’ll point you to what applies.', 'ویزا، ویکسین اور احرام کہاں باندھنا ہے، یہ آپ کے راستے پر منحصر ہے۔ ہم آپ کو وہی بتائیں گے جو آپ پر لاگو ہو۔'), FROM, store.get('from', null), function (v) { store.set('from', v); if (onDone) onDone(); else location.reload(); }, step);
  }
  function onboard() {
    openWho(function () { openWhen(function () { openFrom(function () { location.reload(); }, L('Step 3 of 3', 'مرحلہ 3 از 3')); }, L('Step 2 of 3', 'مرحلہ 2 از 3')); }, L('Step 1 of 3', 'مرحلہ 1 از 3'));
  }
  document.querySelectorAll('[data-action="when"]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openWhen(); }); });
  document.querySelectorAll('[data-action="from"]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openFrom(); }); });
  function esc2(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tx(o) { return o ? (UR ? o.ur : o.en) : ''; }
  function eventsFor(data, ym) {
    if (!ym) return [];
    var p = ym.split('-'), start = new Date(+p[0], +p[1] - 1, 1), end = new Date(+p[0], +p[1], 0);
    return data.events.filter(function (ev) { var f = new Date(ev.from + 'T00:00:00'), t = new Date(ev.to + 'T00:00:00'); return f <= end && t >= start; });
  }
  var whenV = store.get('when', null), fromV = store.get('from', null);
  if (document.querySelector('[data-trip]')) {
    getTripData().then(function (data) {
      var set = function (k, h) { document.querySelectorAll('[data-trip="' + k + '"]').forEach(function (el) { el.innerHTML = h; }); };
      set('when', esc2(whenV === null ? L('You haven’t told me yet', 'آپ نے ابھی نہیں بتایا') : monthLabel(whenV)));
      set('from', esc2(fromLabel(fromV)));
      var m = whenV ? +whenV.split('-')[1] : 0;
      if (m) {
        var c = data.climate.months[String(m)], band = data.climate.bands[c.band], evs = eventsFor(data, whenV);
        set('monthtitle', esc2(monthLabel(whenV)) + ' · ' + esc2(tx(band.title)));
        var h = '<div class="temps"><div><span class="small muted">' + L('Makkah', 'مکہ') + '</span><b dir="ltr">' + c.mk[0] + '° / ' + c.mk[1] + '°</b><span class="small muted">' + L('day / night', 'دن / رات') + '</span></div><div><span class="small muted">' + L('Madinah', 'مدینہ') + '</span><b dir="ltr">' + c.md[0] + '° / ' + c.md[1] + '°</b><span class="small muted">' + L('day / night', 'دن / رات') + '</span></div></div>';
        h += '<ul class="avoidlist">' + band.tips.map(function (t) { return '<li>' + CHECK + '<span>' + esc2(tx(t)) + '</span></li>'; }).join('') + '</ul>';
        h += '<p class="src">' + esc2(tx(data.climate.source)) + '</p>';
        evs.forEach(function (ev) { h += '<div class="card ' + (ev.id === 'hajjclose' || ev.id === 'visaend' ? 'avoid' : 'remember') + '"><svg class="ic" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg><div class="t">' + esc2(tx(ev)) + '<span class="small muted" style="display:block;margin-top:6px">' + esc2(tx(ev.src)) + '</span></div></div>'; });
        set('monthbody', h);
        document.querySelectorAll('tr[data-m]').forEach(function (tr) { tr.classList.toggle('now', +tr.getAttribute('data-m') === m); });
      }
      if (fromV && data.countries[fromV]) {
        var co = data.countries[fromV];
        set('countrytitle', L('Coming from ', '') + esc2(tx(co.name)) + L('', ' سے سفر'));
        var h2 = '<ul class="avoidlist">' + co.items.map(function (t) { return '<li>' + CHECK + '<span>' + esc2(tx(t)) + '</span></li>'; }).join('') + '</ul><p class="src">' + esc2(tx(co.src)) + '</p>';
        if (co.link) h2 += '<a class="btn secondary" href="' + u(co.link) + '" style="justify-content: space-between">' + L('Full guide for travellers from Pakistan', 'پاکستان سے سفر کرنے والوں کے لیے مکمل رہنمائی') + '</a>';
        set('countrybody', h2);
      }
      // home summary card
      var bits = [];
      if (whenV) { var cc = data.climate.months[String(+whenV.split('-')[1])]; bits.push(UR ? (monthLabel(whenV) + ' میں مکہ میں دن کا درجہ حرارت تقریباً ' + cc.mk[0] + '°C ہوگا۔') : ('In ' + monthLabel(whenV) + ', expect about ' + cc.mk[0] + '°C by day in Makkah.')); }
      var evn = eventsFor(data, whenV);
      if (evn.length) bits.push(tx(evn[0]).split(/[.۔]/)[0] + L('.', '۔'));
      if (bits.length) set('homecard', esc2(bits.join(' ')));
    }).catch(function () {});
  }
  document.querySelectorAll('[data-pf="label"]').forEach(function (el) { el.textContent = whoLabel(who); });
  // a small chip on pages that have content for particular travellers.
  // It offers only the choices that change something on this page.
  var TAG_KEYS = { men: ['man', 'woman', 'couple'], women: ['man', 'woman', 'couple'], couple: ['couple'], elderly: ['elderly'], babies: ['babies', 'kids'], kids: ['babies', 'kids'] };
  var tagged = document.querySelectorAll('.root [data-for]');
  if (tagged.length && page !== 'home') {
    var rel = [];
    tagged.forEach(function (el) { el.getAttribute('data-for').split(' ').forEach(function (t) { (TAG_KEYS[t] || []).forEach(function (k) { if (rel.indexOf(k) < 0) rel.push(k); }); }); });
    var order = WHO.map(function (w) { return w[0]; });
    rel.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    var mine = (who || []).filter(function (k) { return rel.indexOf(k) > -1; });
    var chip = document.createElement('div'); chip.className = 'pfchip-row';
    var label = (who && who.length && !showAll) ? whoLabel(mine.length ? mine : who) : (showAll && who && who.length ? L('everyone', 'سب کے لیے') : L('Tell me who’s with you', 'بتائیں آپ کے ساتھ کون ہے'));
    chip.innerHTML = '<button type="button" class="pfchip" aria-haspopup="dialog"><svg class="ic sm" viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"></circle><circle cx="17" cy="10" r="2.3"></circle><path d="M2.5 20c0-3.3 2.4-6 5.5-6s5.5 2.7 5.5 6M13.5 20c.2-2.6 1.7-4.5 3.5-4.5s3.3 1.9 3.5 4.5"></path></svg><span class="pfchip-k">' + ((who && who.length) ? L('Guiding you as', 'آپ کی رہنمائی:') : '') + '</span> <b></b><svg class="ic sm" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"></path></svg></button>';
    chip.querySelector('b').textContent = label;
    var hero = document.querySelector('.root > .hero');
    if (hero) hero.insertAdjacentElement('afterend', chip);
    chip.querySelector('.pfchip').addEventListener('click', function () {
      var sel = (who || []).slice();
      var ASK = {
        step1: [L('Who’s packing for this trip?', 'اس سفر کی تیاری کس کس کے لیے ہے؟'), L('Men and women pack a little differently. Tell me who’s going.', 'مردوں اور خواتین کا سامان تھوڑا مختلف ہوتا ہے۔ بتائیں سفر میں کون کون ہے۔')],
        step2: [L('Who’s putting on ihram?', 'احرام کس کس کو باندھنا ہے؟'), L('Men and women dress differently for ihram. Who’s with you?', 'احرام کے لیے مرد اور خواتین الگ لباس پہنتے ہیں۔ آپ کے ساتھ کون ہے؟')],
        step4: [L('Who’s coming into the Masjid with you?', 'مسجد میں آپ کے ساتھ کون کون ہے؟'), L('I’ll show you anything that’s different for your group.', 'آپ کے گروپ کے لیے جو مختلف ہے، وہ ہم دکھا دیں گے۔')],
        step5: [L('Who’s doing Tawaf with you?', 'طواف میں آپ کے ساتھ کون کون ہے؟'), L('A few things are different for men, for women and for little ones.', 'مردوں، خواتین اور چھوٹے بچوں کے لیے چند باتیں مختلف ہیں۔')],
        step6: [L('Who’s praying with you?', 'نماز میں آپ کے ساتھ کون کون ہے؟'), L('There’s one small thing just for men here.', 'یہاں ایک چھوٹی سی بات صرف مردوں کے لیے ہے۔')],
        step7: [L('Who’s walking Sa‘i with you?', 'سعی میں آپ کے ساتھ کون کون ہے؟'), L('Tell me who’s with you and I’ll keep only what helps.', 'بتائیں آپ کے ساتھ کون ہے، ہم صرف کام کی باتیں رکھیں گے۔')],
        step8: [L('Who’s having their hair cut?', 'بال کس کس کو کٹوانے ہیں؟'), L('Men and women do this differently. I’ll show you the right way for you.', 'مرد اور خواتین یہ الگ طریقے سے کرتے ہیں۔ ہم آپ کو آپ کا صحیح طریقہ دکھائیں گے۔')],
        families: [L('Which children are coming along?', 'کون سے بچے ساتھ ہیں؟'), L('Babies need a few extra things. Tell me who’s with you.', 'شیر خوار بچوں کے لیے کچھ اضافی چیزیں چاہییں۔ بتائیں کون ساتھ ہے۔')],
        care: [L('Who needs a little extra care?', 'کسے تھوڑی زیادہ دیکھ بھال کی ضرورت ہے؟'), L('I’ll keep the parts that help your family.', 'ہم وہی حصے رکھیں گے جو آپ کے خاندان کے کام آئیں۔')]
      }[page] || [L('Who’s travelling with you?', 'سفر میں آپ کے ساتھ کون کون ہے؟'), L('I’ll only show you what applies to your group.', 'ہم آپ کو صرف وہی دکھائیں گے جو آپ کے گروپ پر لاگو ہو۔')];
      var box = document.createElement('div');
      box.className = 'langpick whopick'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', ASK[0]);
      box.innerHTML = '<div class="langpick-box"><div class="langpick-t" style="text-align:center">' + ASK[0] + '</div>' +
        '<p style="text-align:center">' + ASK[1] + '</p><div class="who-grid">' +
        WHO.filter(function (w) { return rel.indexOf(w[0]) > -1; }).map(function (w) {
          return '<button type="button" class="who" data-who="' + w[0] + '" aria-pressed="' + (sel.indexOf(w[0]) > -1) + '"><svg class="ic" viewBox="0 0 24 24">' + w[2] + '</svg><span>' + w[1] + '</span><span class="tick">' + CHECK.replace('class="ic"', 'class="ic sm"') + '</span></button>';
        }).join('') + '</div><div class="row"><button type="button" class="btn secondary" data-who-act="all">' + L('Show me everything', 'مجھے سب کچھ دکھائیں') + '</button><button type="button" class="btn primary" data-who-act="save">' + L('That’s right', 'جی، یہی') + '</button></div></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target === box) { box.remove(); return; }
        var b = e.target.closest('[data-who]');
        if (b) { var k = b.getAttribute('data-who'), i = sel.indexOf(k); if (i > -1) sel.splice(i, 1); else sel.push(k); b.setAttribute('aria-pressed', i === -1); return; }
        var a = e.target.closest('[data-who-act]'); if (!a) return;
        if (a.getAttribute('data-who-act') === 'all') { store.set('showall', true); }
        else { store.set('who', sel); store.set('showall', false); }
        location.reload();
      });
    });
  }
  // first visit: after the language is chosen, ask who is travelling (once)
  if (who === null && store.get('lang', null) !== null && page !== 'print') onboard();

  document.querySelectorAll('[data-soon]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); toast(b.getAttribute('data-soon')); });
  });

  // ---------- share ----------
  document.querySelectorAll('[data-action="share"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var url = new URL(u('index.html'), location.href).href;
      if (navigator.share) navigator.share({ title: L('Shahid: Witness the Journey', 'شاہد: سفر کے گواہ'), text: L('A free, simple step-by-step Umrah guide that works offline.', 'مفت، آسان، مرحلہ وار عمرہ گائیڈ جو آف لائن بھی چلتی ہے۔'), url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast(L('Link copied', 'لنک کاپی ہو گیا')); });
      else toast(url);
    });
  });

  // ---------- My info full screen ----------
  document.querySelectorAll('[data-action="showinfo"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var rows = UR ? [['نام', 'name'], ['ہوٹل', 'hotel'], ['گروپ لیڈر کا فون', 'phone'], ['ملاقات کا دروازہ', 'gate']] : [['Name', 'name'], ['Hotel', 'hotel'], ['Group leader’s phone', 'phone'], ['Meeting gate', 'gate']];
      var html = '<dl style="margin:0">';
      rows.forEach(function (r) {
        var v = store.get('info:' + r[1], '') || '—';
        html += '<dt>' + r[0] + '</dt><dd>' + String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }) + '</dd>';
      });
      html += '<dt>' + L('Emergency (Makkah)', 'ایمرجنسی (مکہ)') + '</dt><dd dir="ltr">911</dd></dl>';
      var sheet = document.createElement('div');
      sheet.className = 'infosheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', L('My info', 'میری معلومات'));
      sheet.innerHTML = '<div style="font:600 30px var(--display)">' + L('Please help me', 'براہِ کرم میری مدد کریں') + (UR ? '<div lang="en" style="font:600 20px var(--body);direction:ltr">Please help me</div>' : '') + '</div>' + html + '<button class="btn primary" type="button">' + L('Close', 'بند کریں') + '</button>';
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
    fetch(UR ? 'search-index-ur.json' : 'search-index.json').then(function (r) { return r.json(); }).then(function (j) { index = j; }).catch(function () {});
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      results.innerHTML = '';
      if (!q || !index) { results.hidden = true; return; }
      var terms = q.split(/\s+/);
      var hits = index.filter(function (p) { return terms.every(function (t) { return p.text.indexOf(t) !== -1; }); }).slice(0, 8);
      results.hidden = false;
      if (!hits.length) { results.innerHTML = '<p class="small muted">' + L('I couldn’t find that. Try a shorter word, like “wudu”.', 'مجھے یہ نہیں ملا۔ کوئی چھوٹا لفظ آزمائیں، جیسے “وضو”۔') + '</p>'; return; }
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
            if (w.state === 'installed' && navigator.serviceWorker.controller) toast(L('I’ve been updated. Close and reopen me to see what’s new.', 'گائیڈ اپ ڈیٹ ہو گئی ہے۔ نیا دیکھنے کے لیے بند کر کے دوبارہ کھولیں۔'));
            else if (w.state === 'activated' && !navigator.serviceWorker.controller) toast(L('I’m saved on your phone now, so I’ll work even without internet.', 'اب یہ گائیڈ آپ کے فون میں محفوظ ہے، انٹرنیٹ کے بغیر بھی چلے گی۔'));
          });
        });
      }).catch(function () {});
    });
  }
})();
