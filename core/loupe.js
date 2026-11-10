/* The Loupe: what every room shares. A readout for anything you hover, a drawer of real posts for
 * anything you click, and the door where visitors bring their own CSV. */
(function () {
  'use strict';
  var K = window.Kit, D = window.Door, esc = K.esc, fmt = K.fmt, UP = window.MURMUR_UPLOAD || null;
  var me = document.querySelector('script[src$="core/loupe.js"]'), BASE = me ? me.getAttribute('src').replace(/core\/loupe\.js$/, '') : '';
  var ROOMS = [['listen', 'I', 'The Listening Post', 'How did it get here?', '#ffb454'], ['weather', 'II', 'The Weather Room', 'How does it feel?', '#8fc8ff'], ['atlas', 'III', 'The Audience Atlas', 'Who are they?', '#35d0c0'], ['swell', 'IV', 'The Swell', 'What is rising?', '#ff9270'], ['grapevine', 'V', 'The Grapevine', 'Who told whom?', '#a3de76']];
  var PAPER = {
    listen: [['s-formats', '§3 Data and CSV'], ['s-problems', '§5 Dirty data'], ['s-cleansing', '§5.1 Cleansing'], ['s-protect', '§9.1 Data protection']],
    weather: [['s-polarity', '§6.2.1 Polarity'], ['s-strength', '§6.2.1 Strength'], ['s-subjective', '§6.2.1 Subjectivity'], ['s-bayes', '§6.2.2 Naive Bayes']],
    atlas: [['s-tagging', '§5.2 Tagging by rules'], ['s-holistic', '§2.1.2 Holistic analysis'], ['s-dash', '§2.1.2 Dashboards']],
    swell: [['s-emerging', '§1.3 Emerging events'], ['s-replay', '§9.3 Historic mode'], ['s-evaluate', '§9.4 Model evaluation']],
    grapevine: [['s-mining', '§6.1 Data mining'], ['s-network', '§1.4 Network analysis'], ['s-simulate', '§6.1 Simulation']]
  };
  var css = '.lp-tip{position:fixed;z-index:90;max-width:300px;padding:9px 12px;border-radius:12px;background:#10121df5;border:1px solid rgba(255,255,255,.18);box-shadow:0 14px 40px #0009;color:#eef1f8;font:12px/1.45 var(--sans,Manrope,system-ui,sans-serif);pointer-events:none;opacity:0;transition:opacity .12s;white-space:pre-line}.lp-tip.on{opacity:1}.lp-tip b{display:block;font:italic 400 15px/1.25 var(--display,Georgia,serif);margin-bottom:2px}.lp-tip em{display:block;margin-top:5px;font-style:normal;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--a,#ffc266)}'
    + '[data-drill]{cursor:pointer}svg [data-drill],svg [data-tip]{transition:filter .12s}svg [data-drill]:hover,svg [data-tip]:hover,svg circle:hover,svg rect[fill]:hover{filter:brightness(1.35) drop-shadow(0 0 4px rgba(255,255,255,.35))}.hit{fill:transparent;stroke:none}.hit:hover{fill:rgba(255,255,255,.1)}svg circle.hitd{fill-opacity:0;stroke:none}svg circle.hitd:hover{fill-opacity:1}'
    + 'div[data-drill],tr[data-drill],article[data-drill],i[data-drill]{transition:background .15s,transform .15s,border-color .15s}tr[data-drill]:hover td{background:rgba(255,255,255,.06)}article.note[data-drill]:hover,.lp-liftable[data-drill]:hover{transform:translateY(-3px);border-color:var(--c,var(--a,#ffc266))}.trow[data-drill]:hover,.row[data-drill]:hover{background:rgba(255,255,255,.05);border-radius:8px}.sbar i[data-drill]:hover{filter:brightness(1.3)}.note[data-drill]:after{content:"Open \\2192";position:absolute;right:16px;bottom:12px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--c,#ffc266);opacity:0;transition:opacity .15s}.note[data-drill]:hover:after,.note[data-drill]:focus-visible:after{opacity:1}'
    + '#reach text{pointer-events:none}.lp-back{position:fixed;inset:0;z-index:70;background:#04050acc;backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s}.lp-back.on{opacity:1;pointer-events:auto}.lp-drawer{position:fixed;z-index:80;top:0;right:0;bottom:0;width:min(470px,100vw);background:#0d0f19;border-left:1px solid rgba(255,255,255,.12);transform:translateX(102%);transition:transform .26s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;color:#eef1f8;font:13px/1.55 var(--sans,Manrope,system-ui,sans-serif)}.lp-drawer.on{transform:none}.lp-dhead{padding:20px 22px 14px;border-bottom:1px solid rgba(255,255,255,.09)}.lp-dbody{padding:14px 22px 26px;overflow:auto;flex:1}.lp-x{float:right;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-size:18px;line-height:1;cursor:pointer}.lp-x:hover{background:rgba(255,255,255,.08)}.lp-eye{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--a,#ffc266);font-weight:700}.lp-h{font:400 30px/1.08 var(--display,Georgia,serif);margin:6px 42px 0 0;letter-spacing:-.015em;overflow-wrap:anywhere}.lp-s{color:#a3abbd;font:italic 14px var(--display,Georgia,serif);margin-top:5px}.lp-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.lp-kp div{padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.05);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#a3abbd}.lp-kp b{display:block;font:300 24px/1.1 var(--display,Georgia,serif);color:#eef1f8;letter-spacing:0;text-transform:none}.lp-moodbar{display:flex;height:9px;border-radius:5px;overflow:hidden;background:rgba(255,255,255,.07)}.lp-moodbar i{display:block;height:100%}.lp-lg{display:flex;gap:12px;font-size:11px;color:#a3abbd;margin:5px 0 12px}.lp-lg u{text-decoration:none;display:inline-flex;align-items:center;gap:5px}.lp-lg u:before{content:"";width:8px;height:8px;border-radius:2px;background:var(--c)}.lp-tl{display:flex;align-items:flex-end;gap:1px;height:46px;margin:6px 0 2px}.lp-tl button{flex:1;min-width:1px;height:100%;padding:0;border:0;background:transparent;display:flex;align-items:flex-end;cursor:pointer}.lp-tl button i{display:block;width:100%;background:var(--a,#ffc266);opacity:.75;border-radius:2px 2px 0 0}.lp-tl button:hover i{opacity:1}.lp-sec{margin:14px 0 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6e778c}.lp-chips{display:flex;flex-wrap:wrap;gap:5px}.lp-chip{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);border-radius:99px;padding:3px 10px;font-size:11.5px;color:#cfd5e2;cursor:pointer}.lp-chip:hover{background:rgba(255,255,255,.12);color:#fff}.lp-post{padding:11px 0;border-top:1px solid rgba(255,255,255,.08)}.lp-post .m{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:10.5px;color:#7f889c}.lp-post .m b{font-weight:600;color:#a3abbd}.lp-post p{margin:4px 0 0;font:400 16px/1.38 var(--display,Georgia,serif);color:#e9edf6;overflow-wrap:anywhere}.lp-post small{display:block;margin-top:4px;color:#7f889c;font-style:italic}.lp-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:var(--c)}.lp-more,.lp-btn{display:inline-block;margin-top:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#eef1f8;border-radius:10px;padding:8px 14px;font:600 12px var(--sans,Manrope,system-ui,sans-serif);cursor:pointer;text-decoration:none}.lp-more:hover,.lp-btn:hover{background:rgba(255,255,255,.12)}.lp-btn.go{background:var(--a,#ffc266);color:var(--dark-on-a,#241603);border-color:transparent}'
    + '.lp-dock{position:fixed;z-index:60;right:18px;bottom:18px;display:flex;gap:7px;align-items:center;font:600 12px var(--sans,Manrope,system-ui,sans-serif)}.lp-dock a,.lp-dock button{display:inline-flex;align-items:center;gap:7px;padding:10px 15px;border-radius:99px;border:1px solid rgba(255,255,255,.16);background:#141724f0;color:#eef1f8;text-decoration:none;cursor:pointer;font:inherit;box-shadow:0 12px 34px #0008;backdrop-filter:blur(6px)}.lp-dock a:hover,.lp-dock button:hover{background:#21263a}.lp-dock .go{background:var(--a,#ffc266);color:var(--dark-on-a,#241603);border-color:transparent}.lp-dock .go:hover{background:var(--a,#ffc266);filter:brightness(1.08)}.lp-dock svg{width:14px;height:14px}body{padding-bottom:64px}@media(max-width:620px){.lp-dock{right:10px;bottom:10px}.lp-dock a,.lp-dock button{padding:9px 12px}.lp-dock .wide{display:none}}'
    + '.lp-paper{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:14px 0 2px;font-size:11.5px;color:var(--muted,#a3abbd)}.lp-paper span{font:italic 14px var(--display,Georgia,serif);margin-right:4px}.lp-paper a{padding:3px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.12);text-decoration:none;color:inherit}.lp-paper a:hover{color:var(--ink,#fff);border-color:var(--a,#ffc266)}.lp-ban{margin:12px 0;padding:12px 16px;border-radius:14px;border:1px solid color-mix(in srgb,var(--a,#ffc266) 40%,transparent);background:color-mix(in srgb,var(--a,#ffc266) 9%,transparent);font-size:12.5px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between}.lp-ban b{font:italic 400 17px var(--display,Georgia,serif)}.lp-ban .act{display:flex;gap:6px}.lp-ban .lp-btn{margin:0;padding:6px 11px}'
    + '.lp-door{position:fixed;inset:0;z-index:85;display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 14px;background:#05060cdd;backdrop-filter:blur(8px);color:#eef1f8;font:13px/1.55 var(--sans,Manrope,system-ui,sans-serif)}.lp-door.on{display:flex}.lp-card{position:relative;width:min(880px,100%);padding:30px 32px;border-radius:26px;background:linear-gradient(170deg,#191a2e,#0d0f19 62%);border:1px solid rgba(255,255,255,.12);box-shadow:0 40px 110px #000b}.lp-card h2{font:400 clamp(32px,5vw,50px)/1.02 var(--display,Georgia,serif);margin:6px 42px 6px 0;letter-spacing:-.02em}.lp-card h2 em{color:var(--a,#ffc266)}.lp-card .sub{font:italic 16px/1.4 var(--display,Georgia,serif);color:#cfd5e2;margin:0 0 16px;max-width:60ch}.lp-drop{display:block;padding:44px 20px;text-align:center;border:1.5px dashed rgba(255,255,255,.26);border-radius:20px;cursor:pointer;transition:background .15s,border-color .15s}.lp-drop:hover,.lp-drop.over{background:rgba(255,255,255,.05);border-color:var(--a,#ffc266)}.lp-drop b{display:block;font:400 25px var(--display,Georgia,serif)}.lp-drop span{color:#a3abbd;font-size:12.5px}.lp-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}.lp-three div{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.045);font-size:12px;color:#a3abbd}.lp-three b{display:block;color:#eef1f8;font:italic 400 16px var(--display,Georgia,serif)}.lp-err{margin-top:12px;padding:11px 14px;border-radius:12px;background:#ff7f9e1c;border:1px solid #ff7f9e55;color:#ffd5df}.lp-prev{overflow:auto;border:1px solid rgba(255,255,255,.1);border-radius:12px;max-height:150px;margin:8px 0 14px}.lp-prev table{border-collapse:collapse;font-size:11.5px;white-space:nowrap}.lp-prev td,.lp-prev th{padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.07);text-align:left;max-width:240px;overflow:hidden;text-overflow:ellipsis}.lp-prev th{color:#a3abbd;font-weight:600;position:sticky;top:0;background:#14162a}.lp-map{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 12px}.lp-map label{display:block;font-size:11px;color:#a3abbd}.lp-map label b{color:#eef1f8;font-weight:600}.lp-map label i{font-style:normal;color:var(--a,#ffc266)}.lp-map select{display:block;width:100%;margin-top:3px;padding:7px 8px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#14162a;color:#eef1f8;font:12px var(--sans,Manrope,system-ui,sans-serif)}.lp-map select.set{border-color:color-mix(in srgb,var(--a,#ffc266) 55%,transparent)}.lp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:4px 0 12px}.lp-kpis div{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#a3abbd}.lp-kpis b{display:block;font:300 31px/1.1 var(--display,Georgia,serif);color:#eef1f8;letter-spacing:-.01em;text-transform:none;overflow-wrap:anywhere}.lp-rep{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.lp-rep>div{padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.09);font-size:12px;color:#a3abbd}.lp-rep h5{margin:0 0 5px;font:italic 400 17px var(--display,Georgia,serif);color:#eef1f8}.lp-rep p{margin:0;display:flex;justify-content:space-between;gap:8px}.lp-rep p b{color:#eef1f8;font-weight:600;font-variant-numeric:tabular-nums}.lp-notes{margin:12px 0 0;padding:0;list-style:none;color:#cfd5e2;font:italic 15px/1.4 var(--display,Georgia,serif)}.lp-notes li{padding:4px 0 4px 16px;position:relative}.lp-notes li:before{content:"";position:absolute;left:0;top:13px;width:6px;height:6px;border-radius:50%;background:var(--a,#ffc266)}.lp-rooms{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}.lp-rooms a{padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);text-decoration:none;color:inherit;transition:border-color .15s,transform .15s}.lp-rooms a:hover{transform:translateY(-3px);border-color:var(--c)}.lp-rooms i{font:italic 21px var(--display,Georgia,serif);color:var(--c)}.lp-rooms b{display:block;font-size:12px}.lp-rooms small{color:#a3abbd;font-size:11px}.lp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}@media(max-width:760px){.lp-card{padding:22px 16px}.lp-map,.lp-three{grid-template-columns:1fr 1fr}.lp-kpis,.lp-rep{grid-template-columns:1fr 1fr}.lp-rooms{grid-template-columns:1fr 1fr}}@media(max-width:440px){.lp-map,.lp-three{grid-template-columns:1fr}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }
  function feed() { return K.loadFeed(); }
  function dlFile(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type || 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500); }

  /* ---------------------------- the readout ---------------------------- */
  var tip = document.body.appendChild(el('<div class="lp-tip" role="status"></div>')), tipTimer = 0;
  function place(x, y) { var w = tip.offsetWidth, h = tip.offsetHeight, px = x + 16, py = y + 16; if (px + w > innerWidth - 8) px = x - w - 12; if (py + h > innerHeight - 8) py = y - h - 12; tip.style.left = Math.max(6, px) + 'px'; tip.style.top = Math.max(6, py) + 'px'; }
  function showTip(x, y, text, can) { var ls = String(text).split('\n'); tip.innerHTML = '<b>' + esc(ls[0]) + '</b>' + esc(ls.slice(1).join('\n')) + (can ? '<em>' + esc(can) + '</em>' : ''); tip.classList.add('on'); place(x, y); }
  function hideTip() { tip.classList.remove('on'); }
  function source(t) {
    for (; t && t !== document && t.getAttribute; t = t.parentNode) {
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return null;
      var ti = t.querySelector && t.querySelector(':scope > title');
      if (ti) { t.setAttribute('data-tip', ti.textContent); ti.remove(); }
      else if (t.hasAttribute('title') && t.getAttribute('title')) { t.setAttribute('data-tip', t.getAttribute('title')); t.removeAttribute('title'); }
      if (t.hasAttribute('data-tip') || t.hasAttribute('data-drill')) return t;
    }
    return null;
  }
  document.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var s = source(e.target); if (!s) { if (!tip._canvas) hideTip(); return; } tip._canvas = false; showTip(e.clientX, e.clientY, s.getAttribute('data-tip') || 'See what is inside', s.hasAttribute('data-drill') ? 'Click to open the posts' : ''); }, { passive: true });
  document.addEventListener('pointerleave', hideTip);
  document.addEventListener('scroll', hideTip, { passive: true, capture: true });

  /* ---------------------------- the drawer of posts ---------------------------- */
  var MC = { '1': '#7be08a', '0': '#ffd27a', '-1': '#ff7f9e' }, ML = { '1': 'warm', '0': 'even', '-1': 'sour' };
  var DEMOGRAPHIC = ['region', 'calling', 'voices', 'lang'];
  function test(q) {
    var word = q.word ? new RegExp('(^|[^\\p{L}])' + String(q.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'iu') : null, depthPlus = q.depth !== undefined && /\+$/.test(String(q.depth)), dv = q.depth !== undefined ? parseInt(q.depth, 10) : 0;
    return function (p) {
      if (q.platform !== undefined && p.platform !== q.platform) return false;
      if (q.day !== undefined && p.day !== +q.day) return false;
      if (q.hour !== undefined && p.hour !== +q.hour) return false;
      if (q.tag !== undefined && p.tag !== q.tag) return false;
      if (q.from !== undefined && (p.ts < +q.from || p.ts >= +q.to)) return false;
      if (q.type !== undefined && p.type !== q.type) return false;
      if (q.emotion !== undefined && p.emotion !== q.emotion) return false;
      if (q.mood !== undefined && p.mood !== +q.mood) return false;
      if (q.reacting && p.ref < 0) return false;
      if (q.depth !== undefined && (depthPlus ? p.depth < dv : p.depth !== dv)) return false;
      if (q.voice !== undefined && p.voice.id !== q.voice) return false;
      if (q.audience && p.voice.org) return false;
      if (q.norepost && p.type === 'repost') return false;
      if (q.voices && !q.voices.has(p.voice.id)) return false;
      if (q.region !== undefined && p.voice.region !== q.region) return false;
      if (q.calling !== undefined && p.voice.calling !== q.calling) return false;
      if (q.lang !== undefined && p.lang !== q.lang) return false;
      if (q.missing !== undefined) { var v = p.raw[q.missing]; if (v && String(v).trim() && !/^not specified$/i.test(v)) return false; }
      if (word && !word.test(p.text)) return false;
      if (q.strength !== undefined || q.subj !== undefined) { var r = K.lexOf(p); if (!r) return false; if (q.strength !== undefined && r.strength !== q.strength) return false; if (q.subj !== undefined && r.subj !== q.subj) return false; }
      return true;
    };
  }
  function parseQ(s) { var o = {}; String(s).split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }); return o; }
  function nameOf(q) {
    if (q.label) return q.label; var a = [];
    if (q.tag) a.push(q.tag); if (q.word) a.push('"' + q.word + '"'); if (q.emotion) a.push(q.emotion); if (q.mood !== undefined) a.push(ML[q.mood]); if (q.strength) a.push(q.strength + ' opinions'); if (q.subj) a.push(q.subj === 'opinion' ? 'opinions' : 'plain statements'); if (q.platform) a.push('on ' + q.platform); if (q.type) a.push({ post: 'originals', reply: 'replies', quote: 'quotes', repost: 'reposts', share: 'crossings' }[q.type] || q.type); if (q.region) a.push(q.region); if (q.calling) a.push(q.calling); if (q.lang) a.push('language: ' + q.lang); if (q.depth !== undefined) a.push(q.depth === '0' ? 'origins' : 'hop ' + q.depth); if (q.reacting) a.push('reactions'); if (q.missing) a.push('no ' + q.missing.replace(/_/g, ' ')); if (q.day !== undefined) a.push(K.dayName(feed().dayStart(+q.day))); if (q.hour !== undefined) a.push(K.pad2(+q.hour) + ':00 UTC'); if (q.from !== undefined) a.push(new Date(+q.from).toUTCString().slice(5, 11));
    return a.join(', ') || 'Everything on file';
  }
  var back = document.body.appendChild(el('<div class="lp-back"></div>')), drawer = document.body.appendChild(el('<aside class="lp-drawer" role="dialog" aria-modal="true" aria-label="Posts behind this mark"><div class="lp-dhead"></div><div class="lp-dbody"></div></aside>')), stack = [], cur = null, lastFocus = null, shown = 40;
  function open(q, opts) {
    var F = feed(), P = F.posts, list;
    if (q.chain !== undefined) {
      var i0 = P.findIndex(function (p) { return p.id === q.chain; }); if (i0 < 0) return; var ids = [], c = i0; while (c >= 0) { ids.unshift(c); c = P[c].ref; } P[i0].kids.forEach(function (k) { ids.push(k); }); list = ids.map(function (i) { return P[i]; });
    } else list = P.filter(test(q));
    if (DEMOGRAPHIC.some(function (k) { return q[k] !== undefined; })) { var nv = new Set(list.map(function (p) { return p.voice.id; })).size; if (nv < K.K_MIN) { var r = (opts && opts.at) || { x: innerWidth / 2, y: innerHeight / 2 }; showTip(r.x, r.y, 'Folded away', 'fewer than five people'); clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 1800); return; } }
    if (!(opts && opts.refine)) stack = []; else if (cur) stack.push(cur);
    cur = q; shown = 40; lastFocus = lastFocus || document.activeElement; render(list, q);
    back.classList.add('on'); drawer.classList.add('on'); hideTip(); var x = drawer.querySelector('.lp-x'); if (x) x.focus({ preventScroll: true });
  }
  function close() { back.classList.remove('on'); drawer.classList.remove('on'); cur = null; stack = []; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); lastFocus = null; }
  function top(list, fn, n) { var c = {}; list.forEach(function (p) { var v = fn(p); if (v) c[v] = (c[v] || 0) + 1; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, n).map(function (k) { return [k, c[k]]; }); }
  function postHTML(p, F) {
    var parent = p.ref >= 0 ? F.posts[p.ref] : null;
    return '<article class="lp-post"><div class="m"><span>' + (p.mood === null ? '' : '<i class="lp-dot" style="--c:' + MC[p.mood] + '"></i>' + ML[p.mood]) + '</span><b>' + esc(p.platform) + '</b><span>' + esc(new Date(p.ts).toUTCString().slice(5, 22)) + '</span><span>' + esc(p.type) + '</span>' + (p.emotion !== 'Plain' ? '<span>' + esc(p.emotion) + '</span>' : '') + '<a href="#" data-chain="' + esc(p.id) + '" style="color:inherit">thread</a></div><p>' + esc(p.text) + '</p>' + (parent ? '<small>answering: ' + esc(parent.text.slice(0, 90)) + (parent.text.length > 90 ? '…' : '') + '</small>' : '') + '</article>';
  }
  function render(list, q) {
    var F = feed(), s = K.moodStats(list), v = new Set(list.map(function (p) { return p.voice.id; })).size, tl = new Array(F.days).fill(0); list.forEach(function (p) { tl[p.day]++; }); var mx = Math.max.apply(null, tl) || 1;
    drawer.querySelector('.lp-dhead').innerHTML = '<button type="button" class="lp-x" aria-label="Close">&times;</button><div class="lp-eye">' + (q.chain !== undefined ? 'One conversation' : 'Behind this mark') + '</div><h3 class="lp-h">' + esc(q.chain !== undefined ? 'The thread' : nameOf(q)) + '</h3>' + (stack.length ? '<a href="#" data-back="1" style="color:var(--a,#ffc266);font-size:12px">&larr; back</a>' : '<div class="lp-s">' + (list.length ? 'Every post that made this mark.' : 'Nothing on file matches this.') + '</div>');
    var o = '<div class="lp-kp"><div><b>' + fmt(list.length) + '</b>posts</div><div><b>' + fmt(v) + '</b>voices</div><div><b>' + (s.n ? K.deg(s.net) : '–') + '</b>mood</div></div>';
    if (s.n) o += '<div class="lp-moodbar"><i style="width:' + s.posShare + '%;background:' + MC[1] + '"></i><i style="width:' + s.neuShare + '%;background:' + MC[0] + '"></i><i style="width:' + s.negShare + '%;background:' + MC[-1] + '"></i></div><div class="lp-lg"><u style="--c:' + MC[1] + '">' + s.posShare + '% warm</u><u style="--c:' + MC[0] + '">' + s.neuShare + '% even</u><u style="--c:' + MC[-1] + '">' + s.negShare + '% sour</u></div>';
    if (q.day === undefined && q.chain === undefined && list.length > 1) o += '<div class="lp-sec">When</div><div class="lp-tl">' + tl.map(function (n, d) { return '<button type="button" data-add="day=' + d + '" data-tip="' + esc(K.dayName(F.dayStart(d))) + '\n' + n + ' posts"><i style="height:' + Math.max(n ? 6 : 0, 100 * n / mx) + '%"></i></button>'; }).join('') + '</div>';
    if (q.chain === undefined) {
      var tags = q.tag ? [] : top(list, function (p) { return p.tag; }, 8), pls = q.platform ? [] : top(list, function (p) { return p.platform; }, 8), emo = q.emotion ? [] : top(list, function (p) { return p.emotion === 'Plain' ? null : p.emotion; }, 6);
      [['Trends in here', tags, 'tag'], ['Doors', pls, 'platform'], ['Feelings', emo, 'emotion']].forEach(function (g) { if (g[1].length > 1 || (g[1].length === 1 && g[1][0][1] < list.length)) o += '<div class="lp-sec">' + g[0] + '</div><div class="lp-chips">' + g[1].map(function (x) { return '<button type="button" class="lp-chip" data-add="' + g[2] + '=' + encodeURIComponent(x[0]) + '">' + esc(x[0]) + ' &middot; ' + fmt(x[1]) + '</button>'; }).join('') + '</div>'; });
    }
    if (list.length) o += '<div class="lp-sec">The posts' + (list.length > shown ? ', first ' + shown : '') + '</div>' + list.slice(0, shown).map(function (p) { return postHTML(p, F); }).join('');
    if (list.length > shown) o += '<button type="button" class="lp-more" data-more="1">Show 40 more</button> ';
    if (list.length) o += '<button type="button" class="lp-more" data-csv="1">Download these ' + fmt(list.length) + ' posts</button>';
    drawer.querySelector('.lp-dbody').innerHTML = o; drawer.querySelector('.lp-dbody').scrollTop = 0; drawer._list = list;
  }
  drawer.addEventListener('click', function (e) {
    var t = e.target, b;
    if (t.closest('.lp-x')) { close(); return; }
    if ((b = t.closest('[data-chain]'))) { e.preventDefault(); open({ chain: b.getAttribute('data-chain') }, { refine: true }); return; }
    if ((b = t.closest('[data-back]'))) { e.preventDefault(); var q0 = stack.pop(); if (q0) { cur = q0; var L = q0.chain !== undefined ? null : feed().posts.filter(test(q0)); if (L) render(L, q0); else { var sv = stack.slice(); open(q0, { refine: true }); stack = sv; } } return; }
    if ((b = t.closest('[data-add]'))) { var add = parseQ(b.getAttribute('data-add')), nq = Object.assign({}, cur); delete nq.label; Object.assign(nq, add); open(nq, { refine: true }); return; }
    if (t.closest('[data-more]')) { shown += 40; var keep = drawer.querySelector('.lp-dbody').scrollTop; render(drawer._list, cur); drawer.querySelector('.lp-dbody').scrollTop = keep; return; }
    if (t.closest('[data-csv]')) { var q = function (v) { v = String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; dlFile('murmuration_posts.csv', 'timestamp,platform,kind,mood,feeling,text\n' + drawer._list.map(function (p) { return [new Date(p.ts).toISOString(), p.platform, p.type, p.mood === null ? '' : ML[p.mood], p.emotion, p.text].map(q).join(','); }).join('\n') + '\n'); }
  });
  back.addEventListener('click', close);
  function activate(t, e) {
    if (e.target.closest && e.target.closest('.lp-drawer,.lp-door,.lp-dock')) return false;
    var a = t.closest('[data-drill]'); if (!a) return false;
    e.preventDefault(); open(parseQ(a.getAttribute('data-drill')), { at: { x: e.clientX || 200, y: e.clientY || 200 } }); return true;
  }
  document.addEventListener('click', function (e) {
    if (activate(e.target, e)) return;
    if (e.pointerType === 'touch' || ('ontouchstart' in window)) { var s = source(e.target); if (s && s.hasAttribute('data-tip')) { showTip(e.clientX, e.clientY, s.getAttribute('data-tip')); clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 2600); } }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (doorEl.classList.contains('on')) closeDoor(); else if (drawer.classList.contains('on')) close(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-drill]')) activate(e.target, e);
  });

  /* ---------------------------- reports ---------------------------- */
  function reportHTML(r) {
    var row = function (l, n) { return '<p><span>' + l + '</span><b>' + fmt(n) + '</b></p>'; };
    return '<div class="lp-rep"><div><h5>Missing</h5>' + row('No words', r.missing.text) + row('No date', r.missing.time) + row('No author', r.missing.author) + '</div><div><h5>Incorrect</h5>' + row('Impossible dates', r.incorrect.dates) + row('Links to nowhere', r.incorrect.refs) + row('Bad follower counts', r.incorrect.followers) + '</div><div><h5>Inconsistent</h5>' + row('Odd date styles', r.inconsistent.dateStyles) + row('Mood labels unified', r.inconsistent.moodLabels) + row('Platform spellings', r.inconsistent.platformCase) + row('Messy spacing fixed', r.inconsistent.whitespace) + '</div><div><h5>Removed or masked</h5>' + row('Duplicates', r.duplicates) + row('Handles', r.masked.handles) + row('Emails', r.masked.emails) + row('Numbers', r.masked.numbers) + row('Links', r.masked.links) + '</div></div>' + (r.notes && r.notes.length ? '<ul class="lp-notes">' + r.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '');
  }

  /* ---------------------------- the door ---------------------------- */
  var doorEl = document.body.appendChild(el('<div class="lp-door" role="dialog" aria-modal="true" aria-label="Bring your own CSV"><div class="lp-card"></div></div>')), card = doorEl.firstChild, table = null, map = null, fname = '', pending = null;
  var LABEL = { text: ['The words', 1], timestamp: ['The moment'], user_id: ['The author'], post_id: ['Post ID'], ref_post_id: ['Replying to'], platform: ['Platform'], sentiment: ['Mood label'], interaction: ['Kind of post'], language: ['Language'], user_bio: ['Bio'], user_location: ['Place'], followers: ['Followers'], joined: ['Joined'] };
  var closeBtn = '<button type="button" class="lp-x" data-close="1" aria-label="Close">&times;</button>';
  function stepDrop(err) {
    card.innerHTML = closeBtn + '<div class="lp-eye">The door is open</div><h2>Bring your <em>own flock</em></h2><p class="sub">Any spreadsheet of posts will do. All five rooms rearrange themselves around it, and it never leaves this device.</p><label class="lp-drop" id="lp-drop"><input type="file" accept=".csv,.tsv,.txt,text/csv" hidden id="lp-file"><b>Drop a CSV here</b><span>or click to choose one. Commas, semicolons, tabs and pipes all work.</span></label>' + (err ? '<div class="lp-err" role="alert">' + esc(err) + '</div>' : '') + '<div class="lp-three"><div><b>One column is enough</b>Words are all it needs. Dates, authors and moods make the rooms richer.</div><div><b>Names stay at the door</b>Authors become codes. Handles, emails and numbers are struck out first.</div><div><b>Stays on your machine</b>Read in this browser and kept here until you send it away.</div></div>' + (UP ? '<div class="lp-row"><button type="button" class="lp-btn" data-report="1">See the current report</button><button type="button" class="lp-btn" data-forget="1">Back to the demo flock</button></div>' : '<div class="lp-row"><a class="lp-btn" href="' + BASE + 'data/audience_sample.csv" download="audience_sample.csv">Download an example file</a></div>');
    var drop = card.querySelector('#lp-drop');
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
    card.querySelector('#lp-file').addEventListener('change', function (e) { if (e.target.files[0]) readFile(e.target.files[0]); });
  }
  function readFile(f) {
    if (f.size > 60 * 1048576) { stepDrop('That file is over 60 MB. Trim it and try again.'); return; }
    if (/\.(xlsx?|json|pdf|zip)$/i.test(f.name)) { stepDrop('That looks like a ' + f.name.split('.').pop().toUpperCase() + ' file. Save it as CSV first.'); return; }
    fname = f.name; card.querySelector('.lp-drop b').textContent = 'Reading ' + f.name + '…';
    var rd = new FileReader();
    rd.onerror = function () { stepDrop('The browser could not open that file.'); };
    rd.onload = function () { setTimeout(function () { try { table = D.parseTable(String(rd.result)); if (table.error) return stepDrop(table.error); if (!table.rows.length) return stepDrop('That file has a header but no rows.'); map = D.guessMap(table); stepMap(); } catch (e) { stepDrop('That file could not be read as a table.'); } }, 30); };
    rd.readAsText(f);
  }
  function stepMap(err) {
    var opts = function (f) { return '<option value="">not in this file</option>' + table.headers.map(function (h, i) { return '<option value="' + i + '"' + (map[f] === i ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join(''); };
    var D_NAME = { ',': 'commas', ';': 'semicolons', '\t': 'tabs', '|': 'pipes' };
    card.innerHTML = closeBtn + '<div class="lp-eye">' + esc(fname) + '</div><h2>Is this <em>what it means?</em></h2><p class="sub">' + fmt(table.rows.length) + ' rows, split by ' + D_NAME[table.delim] + (table.headerless ? ', with no header row' : '') + '. The door guessed the columns below. Correct anything it got wrong.</p><div class="lp-prev"><table><tr>' + table.headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>' + table.rows.slice(0, 4).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(String(c).slice(0, 80)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div><div class="lp-map">' + D.FIELDS.map(function (f) { return '<label><b>' + LABEL[f][0] + '</b>' + (LABEL[f][1] ? ' <i>required</i>' : '') + '<select data-f="' + f + '" class="' + (map[f] !== undefined ? 'set' : '') + '">' + opts(f) + '</select></label>'; }).join('') + '<label><b>Date order</b><select id="lp-order"><option value="auto">work it out</option><option value="dmy">day first</option><option value="mdy">month first</option></select></label></div>' + (err ? '<div class="lp-err" role="alert">' + esc(err) + '</div>' : '') + '<div class="lp-row" style="margin-top:14px"><button type="button" class="lp-btn go" data-run="1">Send it through the rooms</button><button type="button" class="lp-btn" data-restart="1">Choose another file</button></div>';
    card.querySelectorAll('select[data-f]').forEach(function (s) { s.addEventListener('change', function () { var f = s.getAttribute('data-f'); if (s.value === '') delete map[f]; else map[f] = +s.value; s.className = s.value === '' ? '' : 'set'; }); });
  }
  function run() {
    var order = card.querySelector('#lp-order').value, btn = card.querySelector('[data-run]'); btn.textContent = 'Cleaning…'; btn.disabled = true;
    setTimeout(function () {
      var res;
      try { res = D.ingest(table, map, { name: fname, dateOrder: order }); } catch (e) { return stepMap('Something in this file stopped the cleaner. Check the column choices.'); }
      if (res.error) return stepMap(res.error);
      var kept = D.save(res.rows, res.report);
      if (!kept.ok) return stepMap('This browser would not store the file between pages. Private windows often refuse. Try a normal window.');
      table = null; pending = true; location.hash = ''; location.reload();
    }, 40);
  }
  function stepReport() {
    var F = feed(), r = UP, s = K.moodStats(F.posts), T = F.tags.slice(0, 6);
    card.innerHTML = closeBtn + '<div class="lp-eye">' + esc(r.name) + '</div><h2>The rooms have <em>read it</em></h2><p class="sub">' + fmt(r.sourceRows) + ' rows came to the door and ' + fmt(F.posts.length) + ' posts went through. Here is what happened on the way in.</p><div class="lp-kpis"><div><b>' + fmt(F.posts.length) + '</b>posts</div><div><b>' + fmt(F.voices.size) + '</b>voices</div><div><b>' + esc(K.spanText(F)) + '</b>on file</div><div><b>' + K.deg(s.net) + '</b>' + esc(K.condition(s.net)) + '</div></div><div class="lp-moodbar"><i style="width:' + s.posShare + '%;background:' + MC[1] + '"></i><i style="width:' + s.neuShare + '%;background:' + MC[0] + '"></i><i style="width:' + s.negShare + '%;background:' + MC[-1] + '"></i></div><div class="lp-lg"><u style="--c:' + MC[1] + '">' + s.posShare + '% warm</u><u style="--c:' + MC[0] + '">' + s.neuShare + '% even</u><u style="--c:' + MC[-1] + '">' + s.negShare + '% sour</u></div><div class="lp-sec">Rising through it</div><div class="lp-chips">' + T.map(function (t) { return '<span class="lp-chip" style="cursor:default">' + esc(t.tag) + ' &middot; ' + fmt(t.n) + '</span>'; }).join('') + '</div><div class="lp-sec">Clean-up report</div>' + reportHTML(r) + '<div class="lp-sec">Now walk the rooms</div><div class="lp-rooms">' + ROOMS.map(function (x) { return '<a href="' + BASE + x[0] + '/index.html" style="--c:' + x[4] + '"><i>' + x[1] + '</i><b>' + x[2] + '</b><small>' + x[3] + '</small></a>'; }).join('') + '</div><div class="lp-row" style="margin-top:14px"><button type="button" class="lp-btn go" data-dl="results">Download the results</button><button type="button" class="lp-btn" data-dl="clean">Download the cleaned file</button><button type="button" class="lp-btn" data-restart="1">Bring another file</button><button type="button" class="lp-btn" data-forget="1">Back to the demo flock</button></div>';
  }
  function openDoor(report) { (report && UP ? stepReport : stepDrop)(); doorEl.classList.add('on'); doorEl.scrollTop = 0; document.body.style.overflow = 'hidden'; hideTip(); var x = card.querySelector('.lp-x'); if (x) x.focus({ preventScroll: true }); }
  function closeDoor() { doorEl.classList.remove('on'); document.body.style.overflow = ''; }
  doorEl.addEventListener('click', function (e) {
    var t = e.target, b;
    if (t === doorEl || t.closest('[data-close]')) { closeDoor(); return; }
    if (t.closest('[data-restart]')) { stepDrop(); return; }
    if (t.closest('[data-run]')) { run(); return; }
    if (t.closest('[data-report]')) { stepReport(); return; }
    if (t.closest('[data-forget]')) { D.forget(); try { sessionStorage.removeItem('murmuration.justRead'); } catch (x) { } location.hash = ''; location.reload(); return; }
    if ((b = t.closest('[data-dl]'))) { var what = b.getAttribute('data-dl'); dlFile(what === 'clean' ? 'murmuration_cleaned.csv' : 'murmuration_results.csv', what === 'clean' ? window.SAMPLE_AUDIENCE_CSV : D.summaryCSV(feed(), UP)); }
  });
  window.addEventListener('beforeunload', function () { if (pending) try { sessionStorage.setItem('murmuration.justRead', '1'); } catch (e) { } });

  /* ---------------------------- on every page ---------------------------- */
  var room = (location.pathname.match(/\/(listen|weather|atlas|swell|grapevine|blueprint)\//) || [])[1] || 'home';
  var UP_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11V3M4.5 6 8 2.5 11.5 6M2.5 13.5h11"/></svg>';
  var dock = document.body.appendChild(el('<div class="lp-dock">' + (room === 'blueprint' ? '' : '<a class="wide" href="' + BASE + 'blueprint/index.html">The paper</a>') + '<button type="button" class="go" data-open="1">' + UP_ICON + (UP ? '<span>Your file</span>' : '<span>Bring your CSV</span>') + '</button></div>'));
  dock.addEventListener('click', function (e) { if (e.target.closest('[data-open]')) openDoor(!!UP); });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-door]'); if (b) { e.preventDefault(); openDoor(b.getAttribute('data-door') === 'report'); } });
  var lf = document.querySelector('label[for="csv-file"]'); if (lf) { lf.textContent = 'Bring your CSV'; lf.addEventListener('click', function (e) { e.preventDefault(); openDoor(!!UP); }); }

  var main = document.querySelector('main');
  if (main && PAPER[room]) { var pl = el('<div class="lp-paper"><span>From the paper:</span>' + PAPER[room].map(function (x) { return '<a href="' + BASE + 'blueprint/index.html#' + x[0] + '">' + x[1] + '</a>'; }).join('') + '</div>'); main.insertBefore(pl, main.firstChild); }
  if (UP) {
    var F0 = feed(), unit = K.unitNote(F0);
    document.querySelectorAll('.banner').forEach(function (b) { if (/^\s*Synthetic/.test(b.textContent)) b.hidden = true; });
    document.querySelectorAll('[data-sample]').forEach(function (b) { b.hidden = true; });
    document.querySelectorAll('.strip strong').forEach(function (s) { if (/Murmuration flock/.test(s.textContent)) s.textContent = UP.name; });
    document.querySelectorAll('a[download="audience_sample.csv"]').forEach(function (a) { a.textContent = 'Download the cleaned file'; a.removeAttribute('href'); a.setAttribute('role', 'button'); a.style.cursor = 'pointer'; a.addEventListener('click', function (e) { e.preventDefault(); dlFile('murmuration_cleaned.csv', window.SAMPLE_AUDIENCE_CSV); }); });
    if (main && room !== 'home' && room !== 'blueprint') { var ban = el('<div class="lp-ban"><div><b>Reading ' + esc(UP.name) + '</b><br>' + fmt(F0.posts.length) + ' posts from ' + fmt(F0.voices.size) + ' voices.' + (unit ? ' ' + esc(unit) : '') + '</div><div class="act"><button type="button" class="lp-btn" data-door="report">See the report</button></div></div>'); main.insertBefore(ban, main.firstChild); }
    if (UP.pseudoTime) ['wall', 'hours', 'clock'].forEach(function (id) { var e = document.getElementById(id), p = e && e.closest('.plate'); if (p) p.hidden = true; });
    var just = false; try { just = sessionStorage.getItem('murmuration.justRead') === '1'; sessionStorage.removeItem('murmuration.justRead'); } catch (e) { }
    if (just) setTimeout(function () { openDoor(true); }, 60);
  }
  /* A readout for the scrub bars, which sit under a range input and so never see a hover of their own. */
  function scrub(host, fn) { host.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = host.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); tip._canvas = true; showTip(e.clientX, e.clientY - 34, fn(f)); }); host.addEventListener('pointerleave', function () { tip._canvas = false; hideTip(); }); }
  function canvasTip(x, y, text, can) { tip._canvas = true; showTip(x, y, text, can); }
  function canvasOff() { if (tip._canvas) { tip._canvas = false; hideTip(); } }
  window.Loupe = { open: open, close: close, q: K.q, scrub: scrub, tipAt: canvasTip, tipOff: canvasOff, openDoor: openDoor, reportHTML: reportHTML, BASE: BASE, ROOMS: ROOMS, dlFile: dlFile };
})();
