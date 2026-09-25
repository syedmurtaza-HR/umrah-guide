/* Umrah Guide – page narration in English and Urdu using the phone's built-in voice (Web Speech API).
   Arabic duas are not read aloud; the narration gives their meaning. */
(function () {
  'use strict';
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

  var page = document.body.getAttribute('data-page');
  var root = document.querySelector('.root');
  if (!page || !root) return;

  var synth = window.speechSynthesis;
  var get = function (k, d) { try { var v = localStorage.getItem('ug:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem('ug:' + k, JSON.stringify(v)); } catch (e) {} };

  var LANGS = {
    en: { label: 'English', code: 'en-GB', match: /^en/i, prefer: [/en[-_]GB/i, /en[-_]US/i, /en[-_]IN/i] },
    ur: { label: 'اردو', code: 'ur-PK', match: /^ur/i, prefer: [/ur[-_]PK/i, /ur[-_]IN/i] }
  };
  var lang = get('voiceLang', 'en');
  var slow = get('voiceSlow', false);
  var segments = null;       // [{sec, en, ur}]
  var sections = Array.prototype.slice.call(root.querySelectorAll(':scope > .hero, :scope > section, :scope > div.sec, :scope > .nextbar'));
  var queue = [];            // [{segIndex, text}]
  var pos = 0;
  var playing = false;
  var runId = 0;

  function voices() { try { return synth.getVoices() || []; } catch (e) { return []; } }
  function pickVoice(l) {
    var list = voices().filter(function (v) { return LANGS[l].match.test(v.lang); });
    if (!list.length) return null;
    var offline = !navigator.onLine;
    var pool = offline ? list.filter(function (v) { return v.localService; }) : list;
    if (!pool.length) pool = list;
    for (var i = 0; i < LANGS[l].prefer.length; i++) {
      var p = pool.filter(function (v) { return LANGS[l].prefer[i].test(v.lang); });
      if (p.length) return p.filter(function (v) { return v.localService; })[0] || p[0];
    }
    return pool[0];
  }

  // split long text into sentence-sized chunks (Chrome stops long utterances)
  function chunks(text) {
    var parts = text.match(/[^.!?۔؟:]+[.!?۔؟:]*\s*/g) || [text];
    var out = [], buf = '';
    parts.forEach(function (p) {
      if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ''; }
      buf += p;
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  // ---------- UI ----------
  var ICON = {
    play: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"></path></svg>',
    pause: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"></path></svg>',
    prev: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 5v14M18 5l-9 7 9 7z"></path></svg>',
    next: '<svg class="ic" viewBox="0 0 24 24"><path d="M18 5v14M6 5l9 7-9 7z"></path></svg>',
    stop: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    speaker: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"></path><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"></path></svg>'
  };

  var bar = document.createElement('div');
  bar.className = 'listen';
  bar.innerHTML =
    '<button type="button" class="listen-go" data-n="go">' + ICON.speaker + '<span>Listen to this page</span></button>' +
    '<div class="listen-lang" role="group" aria-label="Narration language">' +
    '<button type="button" data-n="lang" data-l="en">English</button>' +
    '<button type="button" data-n="lang" data-l="ur" lang="ur">اردو</button>' +
    '</div>';

  var player = document.createElement('div');
  player.className = 'player';
  player.hidden = true;
  player.setAttribute('role', 'region');
  player.setAttribute('aria-label', 'Narration player');
  player.innerHTML =
    '<div class="player-cap" aria-live="polite"></div>' +
    '<div class="player-row">' +
    '<button type="button" data-n="prev" aria-label="Previous section">' + ICON.prev + '</button>' +
    '<button type="button" data-n="toggle" class="player-main" aria-label="Pause">' + ICON.pause + '</button>' +
    '<button type="button" data-n="next" aria-label="Next section">' + ICON.next + '</button>' +
    '<button type="button" data-n="slow" class="player-slow" aria-pressed="false">Slower</button>' +
    '<button type="button" data-n="stop" aria-label="Stop narration">' + ICON.stop + '</button>' +
    '</div>';

  function syncLangButtons() {
    bar.querySelectorAll('[data-n="lang"]').forEach(function (b) {
      var on = b.getAttribute('data-l') === lang;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    player.querySelector('.player-slow').setAttribute('aria-pressed', slow ? 'true' : 'false');
    player.querySelector('.player-slow').classList.toggle('on', !!slow);
  }

  function placePlayer() {
    var nb = document.querySelector('.nextbar');
    player.style.bottom = ((nb ? nb.offsetHeight : 0) + 8) + 'px';
  }

  function highlight(secIdx) {
    sections.forEach(function (s) { s.classList.remove('reading'); });
    var el = sections[secIdx];
    if (!el) return;
    el.classList.add('reading');
    var top = el.getBoundingClientRect().top + window.pageYOffset - 150;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  function helpNoVoice(l) {
    var ua = navigator.userAgent;
    var ios = /iPhone|iPad|iPod/i.test(ua);
    var msg = l === 'ur'
      ? (ios ? 'This iPhone has no Urdu voice. Please listen in English.'
             : 'No Urdu voice found on this phone. On Android: Settings › search "Text-to-speech" › Google › Install voice data › Urdu. Then reopen the app.')
      : 'No English voice found on this device.';
    var cap = player.querySelector('.player-cap');
    player.hidden = false; placePlayer();
    cap.textContent = msg; cap.dir = 'ltr'; cap.classList.remove('ur');
    player.querySelector('.player-main').innerHTML = ICON.play;
  }

  // ---------- speaking ----------
  function buildQueue() {
    queue = [];
    segments.forEach(function (s, i) {
      chunks(s[lang] || s.en).forEach(function (t) { queue.push({ seg: i, text: t }); });
    });
  }

  function speakFrom(i) {
    var myRun = ++runId;
    synth.cancel();
    pos = i;
    if (pos >= queue.length) { finish(); return; }
    var v = pickVoice(lang);
    if (!v && lang === 'ur') { playing = false; helpNoVoice('ur'); return; }
    var item = queue[pos];
    var u = new SpeechSynthesisUtterance(item.text);
    u.lang = v ? v.lang : LANGS[lang].code;
    if (v) u.voice = v;
    u.rate = slow ? 0.75 : 0.95;
    u.pitch = 1;
    var seg = segments[item.seg];
    if (pos === 0 || queue[pos - 1].seg !== item.seg) highlight(seg.sec);
    var cap = player.querySelector('.player-cap');
    cap.textContent = item.text;
    cap.dir = lang === 'ur' ? 'rtl' : 'ltr';
    cap.classList.toggle('ur', lang === 'ur');
    u.onend = function () { if (myRun === runId && playing) speakFrom(pos + 1); };
    u.onerror = function (e) { if (myRun === runId && playing && e.error !== 'interrupted' && e.error !== 'canceled') speakFrom(pos + 1); };
    playing = true;
    player.querySelector('.player-main').innerHTML = ICON.pause;
    player.querySelector('.player-main').setAttribute('aria-label', 'Pause');
    // small delay avoids a Chrome bug where speak() right after cancel() is ignored
    setTimeout(function () { if (myRun === runId) synth.speak(u); }, 60);
  }

  function finish() {
    playing = false;
    sections.forEach(function (s) { s.classList.remove('reading'); });
    player.querySelector('.player-cap').textContent = lang === 'ur' ? 'صفحہ مکمل ہو گیا۔' : 'End of this page.';
    player.querySelector('.player-main').innerHTML = ICON.play;
    player.querySelector('.player-main').setAttribute('aria-label', 'Play from the start');
    pos = queue.length;
  }

  function start() {
    if (!segments) return;
    buildQueue();
    player.hidden = false; placePlayer();
    speakFrom(0);
  }
  function pause() {
    playing = false; runId++; synth.cancel();
    player.querySelector('.player-main').innerHTML = ICON.play;
    player.querySelector('.player-main').setAttribute('aria-label', 'Continue');
  }
  function stop() {
    pause();
    sections.forEach(function (s) { s.classList.remove('reading'); });
    player.hidden = true;
  }
  function jumpSegment(dir) {
    if (!queue.length) return;
    var cur = queue[Math.min(pos, queue.length - 1)].seg;
    var target = Math.max(0, Math.min(segments.length - 1, cur + dir));
    for (var i = 0; i < queue.length; i++) if (queue[i].seg === target) { speakFrom(i); return; }
  }

  // ---------- events ----------
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var n = b.getAttribute('data-n');
    if (n === 'lang') {
      var was = playing;
      lang = b.getAttribute('data-l'); set('voiceLang', lang); syncLangButtons();
      if (was || !player.hidden) start();
    }
    if (n === 'go') start();
  });
  player.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var n = b.getAttribute('data-n');
    if (n === 'toggle') { if (playing) pause(); else if (pos >= queue.length || !queue.length) start(); else speakFrom(pos); }
    if (n === 'stop') stop();
    if (n === 'prev') jumpSegment(-1);
    if (n === 'next') jumpSegment(1);
    if (n === 'slow') { slow = !slow; set('voiceSlow', slow); syncLangButtons(); if (playing) speakFrom(pos); }
  });
  window.addEventListener('pagehide', function () { runId++; synth.cancel(); });
  window.addEventListener('resize', placePlayer);
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () {};

  // ---------- load script for this page ----------
  fetch('assets/narration.json').then(function (r) { return r.json(); }).then(function (all) {
    segments = all[page];
    if (!segments || !segments.length) return;
    var hero = root.querySelector(':scope > .hero');
    if (!hero) return;
    hero.insertAdjacentElement('afterend', bar);
    document.body.appendChild(player);
    syncLangButtons();
    voices(); // warm up the voice list
  }).catch(function () {});
})();
