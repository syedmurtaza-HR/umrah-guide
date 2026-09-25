/* Shahid (Umrah Guide) – "Key points" narration.
   Each page has a short spoken summary (what matters, what to do) in Urdu and English.
   If a recorded MP3 exists for the page it is played; otherwise the phone's own voice is used,
   choosing the softest-sounding voice available and a calm, slightly slow pace. */
(function () {
  'use strict';

  var page = document.body.getAttribute('data-page');
  var root = document.querySelector('.root');
  if (!page || !root) return;

  var hasTTS = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  var synth = hasTTS ? window.speechSynthesis : null;
  var get = function (k, d) { try { var v = localStorage.getItem('ug:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  var set = function (k, v) { try { localStorage.setItem('ug:' + k, JSON.stringify(v)); } catch (e) {} };

  var LANGS = {
    ur: { code: 'ur-PK', match: /^ur/i, region: [/ur[-_]PK/i, /ur[-_]IN/i], rate: 0.88, btn: 'اہم باتیں سنیں', done: 'بس اتنا ہی۔ اللہ آسانی فرمائے۔' },
    en: { code: 'en-GB', match: /^en/i, region: [/en[-_]GB/i, /en[-_]IN/i, /en[-_]US/i], rate: 0.9, btn: 'Key points', done: 'That’s all for this page.' }
  };
  // voices that usually sound softer / warmer (female or neural voices on common devices)
  var SOFT = /(natural|neural|uzma|gul|female|woman|samantha|karen|moira|tessa|serena|kate|libby|sonia|jenny|aria|hazel|susan|zira|veena|heera|neerja)/i;

  // the narration follows the page language (English pages / Urdu -ur pages)
  var lang = document.documentElement.lang === 'ur' ? 'ur' : 'en';
  function otherPage() {
    var p = location.pathname, file = p.slice(p.lastIndexOf('/') + 1) || 'index.html';
    var m = file.match(/^([a-z0-9]+?)(-ur)?\.html$/);
    var base = m ? m[1] : 'index';
    return base + (lang === 'ur' ? '' : '-ur') + '.html' + location.hash;
  }
  var slow = get('voiceSlow', false);
  var item = null;          // {en, ur, audio:{en,ur}}
  var chunksQ = [], pos = 0, playing = false, runId = 0;
  var audioEl = null;
  var recAvail = {};        // lang -> url or false (checked in the background)
  function recUrl(l) { return 'assets/audio/' + page + '-' + l + '.mp3'; }
  function checkRec(l) {
    if (recAvail[l] !== undefined) return;
    if (item && item.audio && item.audio[l]) { recAvail[l] = item.audio[l]; return; }
    recAvail[l] = false;
    fetch(recUrl(l), { method: 'HEAD' }).then(function (r) {
      var t = r.headers.get('content-type') || '';
      if (r.ok && /audio|mpeg|octet/i.test(t)) recAvail[l] = recUrl(l);
    }).catch(function () {});
  }

  function voices() { try { return synth ? (synth.getVoices() || []) : []; } catch (e) { return []; } }
  function pickVoice(l) {
    var list = voices().filter(function (v) { return LANGS[l].match.test(v.lang); });
    if (!list.length) return null;
    if (!navigator.onLine) { var loc = list.filter(function (v) { return v.localService; }); if (loc.length) list = loc; }
    var score = function (v) {
      var s = 0;
      if (SOFT.test(v.name)) s += 4;
      if (/natural|neural/i.test(v.name)) s += 2;
      LANGS[l].region.forEach(function (r, i) { if (r.test(v.lang)) s += 3 - i; });
      if (v.localService) s += 1;
      if (/male/i.test(v.name) && !/female/i.test(v.name)) s -= 3;
      return s;
    };
    return list.slice().sort(function (a, b) { return score(b) - score(a); })[0];
  }

  function chunks(text) {
    var parts = text.match(/[^.!?۔؟]+[.!?۔؟]*\s*/g) || [text];
    var out = [], buf = '';
    parts.forEach(function (p) { if ((buf + p).length > 200 && buf) { out.push(buf.trim()); buf = ''; } buf += p; });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  // ---------- UI ----------
  var ICON = {
    play: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"></path></svg>',
    pause: '<svg class="ic" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"></path></svg>',
    replay: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.6"></path><path d="M4 4v4h4"></path></svg>',
    stop: '<svg class="ic" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    speaker: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"></path><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"></path></svg>'
  };
  var bar = document.createElement('div');
  bar.className = 'listen';
  bar.innerHTML =
    '<button type="button" class="listen-go" data-n="go">' + ICON.speaker + '<span class="listen-label"></span></button>' +
    '<div class="listen-lang" role="group" aria-label="Language / زبان">' +
    '<button type="button" data-n="lang" data-l="ur" lang="ur">اردو</button>' +
    '<button type="button" data-n="lang" data-l="en">English</button>' +
    '</div>';
  var player = document.createElement('div');
  player.className = 'player'; player.hidden = true;
  player.setAttribute('role', 'region'); player.setAttribute('aria-label', lang === 'ur' ? 'اہم باتیں' : 'Key points player');
  player.innerHTML =
    '<div class="player-cap" aria-live="polite"></div>' +
    '<div class="player-row">' +
    '<button type="button" data-n="toggle" class="player-main" aria-label="Pause">' + ICON.pause + '</button>' +
    '<button type="button" data-n="replay" aria-label="' + (lang === 'ur' ? 'دوبارہ سنیں' : 'Play again') + '">' + ICON.replay + '</button>' +
    '<button type="button" data-n="slow" class="player-slow" aria-pressed="false">Slower</button>' +
    '<button type="button" data-n="stop" aria-label="' + (lang === 'ur' ? 'بند کریں' : 'Close') + '">' + ICON.stop + '</button>' +
    '</div>';

  function sync() {
    bar.querySelector('.listen-label').textContent = LANGS[lang].btn;
    bar.querySelector('.listen-label').setAttribute('lang', lang === 'ur' ? 'ur' : 'en');
    bar.querySelector('.listen-go').classList.toggle('ur', lang === 'ur');
    bar.querySelectorAll('[data-n="lang"]').forEach(function (b) {
      var on = b.getAttribute('data-l') === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var sb = player.querySelector('.player-slow');
    sb.textContent = lang === 'ur' ? 'آہستہ' : 'Slower';
    sb.classList.toggle('ur', lang === 'ur');
    sb.setAttribute('aria-pressed', slow ? 'true' : 'false'); sb.classList.toggle('on', !!slow);
  }
  function placePlayer() { var nb = document.querySelector('.nextbar'); player.style.bottom = ((nb ? nb.offsetHeight : 0) + 8) + 'px'; }
  function caption(t) { var c = player.querySelector('.player-cap'); c.textContent = t; c.dir = lang === 'ur' ? 'rtl' : 'ltr'; c.classList.toggle('ur', lang === 'ur'); }
  function mainIcon(isPlaying) { var m = player.querySelector('.player-main'); m.innerHTML = isPlaying ? ICON.pause : ICON.play; m.setAttribute('aria-label', lang === 'ur' ? (isPlaying ? 'روکیں' : 'چلائیں') : (isPlaying ? 'Pause' : 'Play')); }

  function noVoice() {
    var ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    caption(lang === 'ur'
      ? (ios ? 'اس آئی فون میں اردو آواز موجود نہیں۔ یہ اہم باتیں نیچے اسکرین پر پڑھ لیں، یا انگریزی منتخب کریں۔'
             : 'اس فون میں اردو آواز نہیں ملی۔ Settings › Text-to-speech › Google › Install voice data › Urdu انسٹال کریں، پھر ایپ دوبارہ کھولیں۔')
      : 'No English voice found on this device.');
    player.querySelector('.player-cap').textContent += '\n\n' + (item[lang] || '');
    mainIcon(false); playing = false;
  }

  // ---------- playback ----------
  function stopAll() {
    runId++; playing = false;
    if (synth) synth.cancel();
    if (audioEl) { audioEl.pause(); }
  }
  function playRecorded(src) {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.addEventListener('ended', function () { playing = false; mainIcon(false); caption(LANGS[lang].done); });
    }
    if (audioEl.getAttribute('data-src') !== src) { audioEl.src = src; audioEl.setAttribute('data-src', src); }
    audioEl.playbackRate = slow ? 0.85 : 1;
    caption(item[lang]);
    audioEl.play().then(function () { playing = true; mainIcon(true); }).catch(function () { speakFrom(0); });
  }
  function speakFrom(i) {
    if (!synth) { caption(item[lang]); return; }
    var my = ++runId;
    synth.cancel(); pos = i;
    if (pos >= chunksQ.length) { playing = false; mainIcon(false); caption(LANGS[lang].done); return; }
    var v = pickVoice(lang);
    if (!v && lang === 'ur') { noVoice(); return; }
    var u = new SpeechSynthesisUtterance(chunksQ[pos]);
    u.lang = v ? v.lang : LANGS[lang].code; if (v) u.voice = v;
    u.rate = slow ? 0.75 : LANGS[lang].rate; u.pitch = 1; u.volume = 1;
    caption(chunksQ[pos]);
    u.onend = function () { if (my === runId && playing) setTimeout(function () { if (my === runId && playing) speakFrom(pos + 1); }, 250); };
    u.onerror = function (e) { if (my === runId && playing && e.error !== 'interrupted' && e.error !== 'canceled') speakFrom(pos + 1); };
    playing = true; mainIcon(true);
    setTimeout(function () { if (my === runId) synth.speak(u); }, 60);
  }
  function start() {
    if (!item) return;
    stopAll();
    player.hidden = false; placePlayer();
    var rec = recAvail[lang];
    if (rec) { playRecorded(rec); return; }
    chunksQ = chunks(item[lang] || item.en);
    speakFrom(0);
  }
  function pause() { stopAll(); mainIcon(false); }
  function resume() {
    var rec = recAvail[lang];
    if (rec && audioEl && audioEl.getAttribute('data-src') === rec && !audioEl.ended) { audioEl.playbackRate = slow ? 0.85 : 1; audioEl.play(); playing = true; mainIcon(true); return; }
    if (!rec && chunksQ.length && pos < chunksQ.length) { speakFrom(pos); return; }
    start();
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var n = b.getAttribute('data-n');
    if (n === 'lang') {
      var to = b.getAttribute('data-l');
      if (to !== lang) { stopAll(); set('lang', to); location.href = otherPage(); }
    }
    if (n === 'go') start();
  });
  player.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var n = b.getAttribute('data-n');
    if (n === 'toggle') { if (playing) pause(); else resume(); }
    if (n === 'replay') start();
    if (n === 'stop') { stopAll(); player.hidden = true; }
    if (n === 'slow') { slow = !slow; set('voiceSlow', slow); sync(); if (playing) { if (audioEl && !audioEl.paused) audioEl.playbackRate = slow ? 0.85 : 1; else speakFrom(pos); } }
  });
  window.addEventListener('pagehide', stopAll);
  window.addEventListener('resize', placePlayer);
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () {};

  fetch('assets/narration.json').then(function (r) { return r.json(); }).then(function (all) {
    item = all[page];
    if (!item) return;
    
    var hero = root.querySelector(':scope > .hero');
    if (!hero) return;
    hero.insertAdjacentElement('afterend', bar);
    document.body.appendChild(player);
    sync(); voices(); checkRec(lang);
  }).catch(function () {});
})();
