/* Chapter II: The Weather Room. */
(function () {
  'use strict';
  var K = window.Kit, $ = K.$, esc = K.esc, fmt = K.fmt, pct = K.pct, F = K.loadFeed();
  $('rail').outerHTML = K.rail('weather');
  var P = F.posts, ALL = K.moodStats(P);
  var COL = { Excitement: '#ffd27a', Support: '#7be08a', Curiosity: '#8fc8ff', Anxiety: '#b48cff', Opposition: '#ff7f9e', Sarcasm: '#ff9f73', Plain: '#7c8598' };
  function netCol(v, a) { return K.hexA(v > 0.08 ? '#7be08a' : v < -0.08 ? '#ff7f9e' : '#ffd27a', a === undefined ? 1 : a); }
  function deg(v) { var d = Math.round(v * 40); return (d > 0 ? '+' : '') + d + '°'; }
  function days(list) { var o = []; for (var d = 0; d < F.days; d++) o.push([]); list.forEach(function (p) { o[p.day].push(p); }); return o; }
  function topFeeling(list) { var c = {}; list.forEach(function (p) { if (p.emotion !== 'Plain') c[p.emotion] = (c[p.emotion] || 0) + 1; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0] || 'Plain'; }
  $('meta').textContent = fmt(P.length) + ' posts read · ' + F.tags.length + ' fronts tracked · ' + (window.MURMUR_UPLOAD ? 'cleaned at the door' : 'data/audience_sample.csv');

  /* headline */
  var dayAll = days(P).map(K.moodStats), solid = dayAll.map(function (s, d) { return { d: d, s: s }; }).filter(function (x) { return x.s.n >= Math.min(50, Math.max(1, Math.round(P.length / F.days / 3))); });
  var storm = solid.slice().sort(function (a, b) { return a.s.net - b.s.net; })[0], sunny = solid.slice().sort(function (a, b) { return b.s.net - a.s.net; })[0];
  $('k-w').textContent = ALL.posShare + '%'; $('k-s').textContent = ALL.negShare + '%';
  $('k-st').textContent = K.dayName(F.dayStart(storm.d)); $('k-st-s').textContent = deg(storm.s.net) + ', and bring a coat';
  $('k-su').textContent = K.dayName(F.dayStart(sunny.d)); $('k-su-s').textContent = deg(sunny.s.net) + ', suspiciously pleasant';

  /* ------------------ the sky ------------------ */
  var S = { day: storm.d, front: 'all', list: P, playing: false, last: 0, stepAt: 0, net: 0, sour: 0, warm: 0, neu: 0, ctx: null, W: 0, H: 0, onscreen: true, flash: 0, drops: [], clouds: [], dirty: true };
  var rand = K.rngFrom(7);
  for (var c0 = 0; c0 < 22; c0++) S.clouds.push({ x: rand(), y: rand() * .42 + .03, s: .5 + rand() * .9, v: .004 + rand() * .01 });
  for (var d0 = 0; d0 < 300; d0++) S.drops.push({ x: rand(), y: rand(), v: .9 + rand() * .7 });
  function resize() { var f = K.fitCanvas($('scene'), $('sky')); S.ctx = f.ctx; S.W = f.W; S.H = f.H; S.dirty = true; }
  function mix(a, b, t) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }); }
  function rgb(a, al) { return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + (al === undefined ? 1 : al) + ')'; }
  function paint(now) {
    var c = S.ctx, W = S.W, H = S.H, t = Math.max(0, Math.min(1, (S.net + .45) / .9)), i;
    var top = t > .5 ? mix([66, 80, 104], [40, 116, 186], (t - .5) * 2) : mix([17, 20, 31], [66, 80, 104], t * 2), bot = t > .5 ? mix([128, 132, 142], [250, 196, 136], (t - .5) * 2) : mix([44, 48, 66], [128, 132, 142], t * 2);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgb(top)); g.addColorStop(.8, rgb(bot)); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // sun
    var sunA = Math.max(0, Math.min(1, (S.net + .28) / .5)), sx = W * .7, sy = H * (.5 - .24 * sunA), R = Math.min(W, H) * .1;
    if (sunA > .02) { var sg = c.createRadialGradient(sx, sy, R * .2, sx, sy, R * 4); sg.addColorStop(0, 'rgba(255,226,160,' + .9 * sunA + ')'); sg.addColorStop(.25, 'rgba(255,200,120,' + .28 * sunA + ')'); sg.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = sg; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,238,190,' + sunA + ')'; c.beginPath(); c.arc(sx, sy, R, 0, 6.2832); c.fill(); }
    // clouds
    var nC = Math.round(3 + (1 - S.warm / 100) * 19), shade = mix([236, 240, 247], [66, 72, 92], Math.min(1, S.sour / 45));
    for (i = 0; i < Math.min(nC, S.clouds.length); i++) {
      var k = S.clouds[i]; if (!K.reduce) { k.x += k.v * .016 * (1 + S.sour / 40); if (k.x > 1.25) k.x = -.25; }
      var x = k.x * W, y = k.y * H, r = 44 * k.s * (W < 620 ? .7 : 1);
      c.fillStyle = rgb(shade, .62);
      [[0, 0, 1], [r * .9, r * .12, .78], [-r * .9, r * .16, .72], [r * 1.65, r * .3, .5], [-r * 1.6, r * .32, .46]].forEach(function (b) { c.beginPath(); c.arc(x + b[0], y + b[1], r * b[2], 0, 6.2832); c.fill(); });
    }
    // rain
    var nD = Math.round(Math.max(0, S.sour - 14) * 9); c.strokeStyle = 'rgba(190,212,245,.5)'; c.beginPath();
    for (i = 0; i < Math.min(nD, S.drops.length); i++) { var p = S.drops[i]; if (!K.reduce) { p.y += p.v * .02; if (p.y > 1) { p.y = 0; p.x = Math.random(); } } var dx = p.x * W, dy = p.y * H; c.moveTo(dx, dy); c.lineTo(dx - 3, dy + 13); }
    c.stroke();
    // lightning
    if (S.net < -.2 && !K.reduce && Math.random() < .012) S.flash = 1;
    if (S.flash > .03) {
      c.fillStyle = 'rgba(255,255,255,' + .3 * S.flash + ')'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,250,220,' + S.flash + ')'; c.lineWidth = 2; c.beginPath(); var bx = W * (.2 + .55 * ((now / 5000) % 1)), by = H * .1; c.moveTo(bx, by); for (i = 0; i < 6; i++) { bx += (i % 2 ? 22 : -16); by += H * .09; c.lineTo(bx, by); } c.stroke(); c.lineWidth = 1; S.flash *= .86;
    }
    // hills
    [[.74, 34, '#10131c', 3.1], [.84, 24, '#090b12', 5.2]].forEach(function (h) { c.fillStyle = h[2]; c.beginPath(); c.moveTo(0, H); for (var x2 = 0; x2 <= W; x2 += 14) c.lineTo(x2, H * h[0] + Math.sin(x2 / W * h[3] * 3.14) * h[1] + Math.sin(x2 / W * 11) * 6); c.lineTo(W, H); c.fill(); });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(64, now - (S.last || now)); S.last = now; if (!S.ctx || !S.onscreen) return;
    if (S.playing && now - S.stepAt > 900) { S.stepAt = now; if (S.day >= F.days - 1) { S.playing = false; setPlay(); } else setDay(S.day + 1); }
    var st = S.target; if (st) { var e = K.reduce ? 1 : Math.min(1, dt / 420); S.net += (st.net - S.net) * e; S.sour += (st.negShare - S.sour) * e; S.warm += (st.posShare - S.warm) * e; }
    paint(now);
  }
  function setPlay() { $('play').innerHTML = S.playing ? K.PAUSE : K.PLAY; $('play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); }

  function filterList() { var v = S.front; S.list = v === 'all' ? P : v.charAt(0) === '#' ? P.filter(function (p) { return p.tag === v; }) : P.filter(function (p) { return p.platform === v; }); S.perDay = days(S.list); }
  function drawStrip() {
    var mx = Math.max.apply(null, S.perDay.map(function (l) { return l.length; })) || 1;
    $('strip').style.gridTemplateColumns = 'repeat(' + F.days + ',minmax(0,1fr))';
    $('strip').innerHTML = S.perDay.map(function (l, d) { var st = K.moodStats(l), h = l.length ? Math.max(10, 100 * l.length / mx) : 3; return '<button type="button" data-d="' + d + '" aria-pressed="' + (d === S.day) + '" title="' + K.dayName(F.dayStart(d)) + ': ' + (st.n ? K.condition(st.net) : 'no reports') + '"><i style="height:' + h + '%;background:' + (st.n ? netCol(st.net) : 'rgba(255,255,255,.1)') + '"></i></button>'; }).join('');
  }
  function setDay(d) {
    S.day = d; var l = S.perDay[d], st = K.moodStats(l); S.target = st;
    Array.prototype.forEach.call($('strip').children, function (b, i) { b.setAttribute('aria-pressed', String(i === d)); });
    $('fc-d').textContent = K.dayName(F.dayStart(d)) + ' · ' + (S.front === 'all' ? 'Whole flock' : S.front);
    $('fc-c').textContent = st.n >= K.K_MIN ? K.condition(st.net) : 'Dead calm';
    $('fc-x').textContent = st.n >= K.K_MIN ? 'Prevailing air: ' + topFeeling(l).toLowerCase() : 'Too few reports to call it.';
    $('temp').textContent = st.n >= K.K_MIN ? deg(st.net) : '–';
    $('gauges').innerHTML = st.n >= K.K_MIN ? '<span><b>' + Math.round(st.posShare) + '%</b>warm</span><span><b>' + Math.round(st.neuShare) + '%</b>even</span><span><b>' + Math.round(st.negShare) + '%</b>sour</span><span><b>' + fmt(l.length) + '</b>reports</span>' : '';
  }
  $('strip').addEventListener('click', function (e) { var b = e.target.closest('button[data-d]'); if (b) { S.playing = false; setPlay(); setDay(Number(b.getAttribute('data-d'))); } });
  $('play').addEventListener('click', function () { if (S.day >= F.days - 1) setDay(0); S.playing = !S.playing; S.stepAt = 0; setPlay(); });
  var opts = ['all'].concat(F.platforms, F.tags.slice(0, 8).map(function (t) { return t.tag; }));
  $('fronts').innerHTML = opts.map(function (o) { return '<button type="button" class="tagc" data-f="' + esc(o) + '" aria-pressed="' + (o === 'all') + '">' + (o === 'all' ? 'Whole flock' : esc(o)) + '</button>'; }).join('');
  $('fronts').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]'); if (!b) return; S.front = b.getAttribute('data-f');
    Array.prototype.forEach.call($('fronts').children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    filterList(); drawStrip();
    if (S.front.charAt(0) === '#') { var best = 0, m = -1; S.perDay.forEach(function (l, d) { if (l.length > m) { m = l.length; best = d; } }); setDay(best); } else setDay(S.day);
  });

  /* ------------------ forecast notes ------------------ */
  (function () {
    var c = {}; P.forEach(function (p) { c[p.emotion] = (c[p.emotion] || 0) + 1; });
    var feel = Object.keys(c).filter(function (k) { return k !== 'Plain'; }).sort(function (a, b) { return c[b] - c[a]; })[0] || 'Plain';
    var AIR = { Anxiety: 'Nerves are the local climate.', Excitement: 'The air is positively fizzing.', Support: 'A surprisingly civil front.', Curiosity: 'Everybody has a question.', Opposition: 'Expect objections from the west.', Sarcasm: 'The forecast is, of course, wonderful.', Plain: 'Barely a breeze of feeling.' };
    var swings = F.tags.map(function (t) { var half = Math.ceil(t.n / 2), a = K.moodStats(t.posts.slice(0, half)), b = K.moodStats(t.posts.slice(half)); return { t: t, a: a.net, b: b.net, d: b.net - a.net }; }).sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); });
    var plats = F.platforms.map(function (x) { return { x: x, s: K.moodStats(P.filter(function (p) { return p.platform === x; })) }; }).sort(function (a, b) { return b.s.net - a.s.net; });
    var hrs = []; for (var h = 0; h < 24; h++) hrs.push(K.moodStats(P.filter(function (p) { return p.hour === h; })));
    var bestH = hrs.map(function (s, i) { return { i: i, s: s }; }).filter(function (x) { return x.s.n >= Math.min(50, Math.max(1, Math.round(P.length / 72))); }).sort(function (a, b) { return b.s.net - a.s.net; })[0];
    var mc = P.filter(function (p) { return p.ref >= 0 && p.type !== 'repost' && p.mood === -1 && P[p.ref].mood === -1; }).length, mcD = P.filter(function (p) { return p.ref >= 0 && p.type !== 'repost' && P[p.ref].mood === -1 && p.mood !== null; }).length;
    K.notes($('notes'), [
      { kick: 'Sea level', fig: deg(ALL.net), unit: '', head: 'is the average mood of the whole record', text: Math.abs(ALL.net) < .08 ? 'Warm and sour very nearly cancel out. Nobody is happy about that.' : ALL.net > 0 ? 'The warm side is winning, for now.' : 'The sour side is winning, for now.' },
      { kick: 'Prevailing air', fig: pct(c[feel], P.length), unit: '%', frac: pct(c[feel], P.length), head: 'of posts carry ' + feel.toLowerCase(), text: AIR[feel], q: K.q({ emotion: feel }) },
      { kick: 'Dry wit', fig: pct(c.Sarcasm || 0, P.length), unit: '%', frac: pct(c.Sarcasm || 0, P.length), head: 'of posts lean sarcastic', text: 'A generous estimate. Sarcasm rarely files a report.', q: K.q({ emotion: 'Sarcasm' }) },
      { kick: 'Change of heart', fig: deg(swings[0].d), unit: '', head: swings[0].t.tag + ' swung this far', text: 'From ' + deg(swings[0].a) + ' at the start to ' + deg(swings[0].b) + ' by the end.', q: K.q({ tag: swings[0].t.tag }) },
      { kick: 'Mildest climate', fig: deg(plats[0].s.net), unit: '', head: 'on ' + plats[0].x, text: 'Sourest conditions are on ' + plats[plats.length - 1].x + ', at ' + deg(plats[plats.length - 1].s.net) + '.', q: K.q({ platform: plats[0].x }) },
      { kick: 'Golden hour', fig: K.pad2(bestH.i), unit: ':00 UTC', head: 'is when the crowd is kindest', text: 'Sitting at ' + deg(bestH.s.net) + '. Schedule your apology accordingly.', q: K.q({ hour: bestH.i }) },
      { kick: 'Catching', fig: pct(mc, mcD), unit: '%', frac: pct(mc, mcD), head: 'of answers to a sour post are sour too', text: 'Across all posts the rate is ' + ALL.negShare + '%.' + (pct(mc, mcD) > ALL.negShare ? ' Bad weather spreads.' : ' This crowd does not catch it.') },
      { kick: 'Worst front', fig: deg(F.tags.slice().sort(function (a, b) { return a.net - b.net; })[0].net), unit: '', head: F.tags.slice().sort(function (a, b) { return a.net - b.net; })[0].tag, text: 'Warmest of all: ' + F.tags.slice().sort(function (a, b) { return b.net - a.net; })[0].tag + '.', q: K.q({ tag: F.tags.slice().sort(function (a, b) { return a.net - b.net; })[0].tag }) }
    ], ['#ffd27a', '#b48cff', '#ff9f73', '#ff7f9e', '#7be08a', '#8fc8ff', '#62e0c0', '#ec83e0']);
  })();

  /* ------------------ barometer ------------------ */
  $('b-hits').insertAdjacentHTML('afterend', '<div id="b-parts"></div>');
  function reading() {
    var r = K.readSentence($('b-in').value), a = Math.PI * (1 - (r.score + 1) / 2), cx = 160, cy = 150, R = 118, o = '', i;
    function p(ang, rad) { return (cx + Math.cos(ang) * rad).toFixed(1) + ' ' + (cy - Math.sin(ang) * rad).toFixed(1); }
    for (i = 0; i < 40; i++) { var a0 = Math.PI * (1 - i / 40), a1 = Math.PI * (1 - (i + .85) / 40), t = i / 39, col = t < .5 ? 'rgb(255,' + Math.round(127 + 100 * t * 2) + ',' + Math.round(158 - 40 * t * 2) + ')' : 'rgb(' + Math.round(255 - 132 * (t - .5) * 2) + ',' + Math.round(227 - 3 * (t - .5) * 2) + ',' + Math.round(118 + 20 * (t - .5) * 2) + ')'; o += '<path d="M' + p(a0, R) + ' L' + p(a1, R) + '" stroke="' + col + '" stroke-width="16" fill="none"/>'; }
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * (R - 26)).toFixed(1) + '" y2="' + (cy - Math.sin(a) * (R - 26)).toFixed(1) + '" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#fff"/><text class="t f" x="28" y="172">sour</text><text class="t f" x="292" y="172" text-anchor="end">warm</text>';
    $('b-g').innerHTML = o;
    $('b-v').textContent = r.words ? K.condition(r.score * .6) : 'Waiting for weather';
    $('b-f').textContent = r.words ? r.feeling : 'Say something';
    $('b-hits').innerHTML = r.hits.map(function (h) { return '<span data-tip="' + esc(h.word) + '\nscored ' + (h.value > 0 ? '+' : '') + h.value.toFixed(1) + '" style="color:' + (h.value > 0 ? '#7be08a' : '#ff7f9e') + '">' + esc(h.word) + '</span>'; }).join('');
    var parts = K.readParts($('b-in').value), a2 = Math.abs(r.score), side = $('b-parts');
    side.innerHTML = r.words ? '<div class="statchips"><div><b>' + (r.hits.length ? (a2 >= .6 ? 'Strong' : a2 >= .35 ? 'Mild' : 'Weak') : 'None') + '</b>strength</div><div><b>' + (r.hits.length ? 'Opinion' : 'Plain fact') + '</b>kind</div><div><b>' + (r.score > 0 ? '+' : '') + r.score.toFixed(2) + '</b>score</div></div>' + (parts.length > 1 ? '<div class="chips" style="margin-top:8px">' + parts.map(function (x) { return '<span class="tagc" style="color:' + (x.r.mood === 'warm' ? '#7be08a' : x.r.mood === 'sour' ? '#ff7f9e' : '#ffd27a') + '" data-tip="Sentence reading\n' + x.r.mood + ', score ' + x.r.score.toFixed(2) + '">' + esc(x.text.slice(0, 46)) + '</span>'; }).join('') + '</div>' : '') : '';
  }
  $('b-in').addEventListener('input', reading); reading();

  /* ------------------ wheel + river ------------------ */
  var picked = null, E = K.EMOTIONS.filter(function (e) { return e !== 'Plain'; }), eCount = {}; P.forEach(function (p) { eCount[p.emotion] = (eCount[p.emotion] || 0) + 1; });
  function wheel() {
    var mx = Math.max.apply(null, E.map(function (e) { return eCount[e] || 0; })) || 1, o = '', n = E.length, r0 = 46;
    E.forEach(function (e, i) {
      var a0 = i / n * 6.2832 - 1.5708 + .05, a1 = (i + 1) / n * 6.2832 - 1.5708 - .05, r = r0 + 92 * Math.sqrt((eCount[e] || 0) / mx), m = (a0 + a1) / 2, on = picked === e;
      function pt(a, q) { return (Math.cos(a) * q).toFixed(1) + ' ' + (Math.sin(a) * q).toFixed(1); }
      o += '<path data-e="' + e + '" style="cursor:pointer" fill="' + COL[e] + '" fill-opacity="' + (picked && !on ? .25 : .85) + '" d="M' + pt(a0, r0) + 'L' + pt(a0, r) + 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + pt(a1, r) + 'L' + pt(a1, r0) + 'A' + r0 + ' ' + r0 + ' 0 0 0 ' + pt(a0, r0) + 'Z"><title>' + e + ': ' + fmt(eCount[e] || 0) + ' posts</title></path>';
      o += '<text class="t b" text-anchor="middle" x="' + (Math.cos(m) * (r + 22)).toFixed(1) + '" y="' + (Math.sin(m) * (r + 22) + 4).toFixed(1) + '">' + e + '</text><text class="t f" text-anchor="middle" x="' + (Math.cos(m) * (r + 22)).toFixed(1) + '" y="' + (Math.sin(m) * (r + 22) + 18).toFixed(1) + '">' + pct(eCount[e] || 0, P.length) + '%</text>';
    });
    $('wheel').innerHTML = o + '<text class="t d" text-anchor="middle" y="6" style="font-size:16px">' + (picked || 'feelings') + '</text>';
  }
  function river() {
    var list = picked ? [picked] : E, D = days(P), mx = 1, W = 1000, H = 262, X = function (d) { return 40 + d / (F.days - 1) * 940; }, stack = D.map(function (l) { var c = {}; l.forEach(function (p) { c[p.emotion] = (c[p.emotion] || 0) + 1; }); return c; });
    stack.forEach(function (c) { var s = 0; list.forEach(function (e) { s += c[e] || 0; }); if (s > mx) mx = s; });
    var o = '', base = D.map(function (_, d) { var s = 0; list.forEach(function (e) { s += stack[d][e] || 0; }); return H / 2 - (s / mx) * (H / 2 - 12); });
    function smooth(pts) { var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1); for (var i = 1; i < pts.length; i++) { var mxp = (pts[i - 1][0] + pts[i][0]) / 2; d += 'C' + mxp.toFixed(1) + ' ' + pts[i - 1][1].toFixed(1) + ' ' + mxp.toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1); } return d; }
    var cur = base.slice();
    list.forEach(function (e) {
      var top = cur.map(function (y, d) { return [X(d), y]; }), next = cur.map(function (y, d) { return y + (stack[d][e] || 0) / mx * (H - 24); }), bottom = next.map(function (y, d) { return [X(d), y]; }).reverse();
      var d = smooth(top) + ' L' + bottom[0][0].toFixed(1) + ' ' + bottom[0][1].toFixed(1) + smooth(bottom).replace(/^M[^C]*/, '') + ' Z';
      o += '<path d="' + d + '" fill="' + COL[e] + '" fill-opacity=".85"></path>'; cur = next;
    });
    var colW = 940 / Math.max(1, F.days - 1);
    D.forEach(function (l, d) { var bits = list.map(function (e) { return e + ': ' + (stack[d][e] || 0); }).join(', '); o += '<rect class="hit" x="' + (X(d) - colW / 2).toFixed(1) + '" y="0" width="' + colW.toFixed(1) + '" height="' + H + '"' + (l.length ? ' data-drill="' + K.q(picked ? { day: d, emotion: picked } : { day: d }) + '"' : '') + '><title>' + K.dayName(F.dayStart(d)) + '\n' + fmt(l.length) + ' posts. ' + esc(bits) + '</title></rect>'; });
    K.ticks(F.days, 6).forEach(function (d) { o += '<text class="t f" x="' + X(d) + '" y="292" text-anchor="middle">' + K.dayName(F.dayStart(d)) + '</text>'; });
    $('river').innerHTML = o; $('r-tag').textContent = picked || 'All feelings';
    $('r-l').innerHTML = E.map(function (e) { return '<span data-pick="' + e + '" style="cursor:pointer;opacity:' + (picked && picked !== e ? .4 : 1) + '"><i style="background:' + COL[e] + '"></i>' + e + '</span>'; }).join('');
  }
  $('wheel').addEventListener('click', function (e) { var p = e.target.closest('path[data-e]'); if (!p) return; var v = p.getAttribute('data-e'); pick(picked === v ? null : v); });
  function pick(v) { picked = v; wheel(); river(); var b = $('wheel-read'); b.hidden = !v; if (v) { b.textContent = 'Read every post carrying ' + v.toLowerCase(); b.setAttribute('data-drill', K.q({ emotion: v }).replace(/&amp;/g, '&')); } }
  $('r-l').addEventListener('click', function (e) { var s = e.target.closest('[data-pick]'); if (s) { var v = s.getAttribute('data-pick'); pick(picked === v ? null : v); } });

  /* ------------------ zones ------------------ */
  function zones(dim) {
    var key = function (p) { return dim === 'platform' ? p.platform : dim === 'region' ? p.voice.region : p.voice.calling; }, g = {};
    P.forEach(function (p) { var k = key(p); if (!k || p.voice.org) return; (g[k] = g[k] || { posts: [], v: {} }); g[k].posts.push(p); g[k].v[p.voice.id] = 1; });
    var names = Object.keys(g).filter(function (k) { return Object.keys(g[k].v).length >= K.K_MIN; }).sort(function (a, b) { return g[b].posts.length - g[a].posts.length; }).slice(0, 8), host = $('zones');
    host.style.gridTemplateColumns = '132px repeat(' + E.length + ',minmax(0,1fr))';
    host.innerHTML = '<div></div>' + E.map(function (e) { return '<div class="h">' + e + '</div>'; }).join('') + names.map(function (n) {
      return '<div class="l">' + esc(n.replace(/ &.*| \(.*/, '')) + '</div>' + E.map(function (e) { var v = pct(g[n].posts.filter(function (p) { return p.emotion === e; }).length, g[n].posts.length); var fld = {}; fld[dim === 'platform' ? 'platform' : dim === 'region' ? 'region' : 'calling'] = n; fld.emotion = e; fld.audience = 1; return '<div class="c" data-drill="' + K.q(fld) + '" data-tip="' + esc(n) + '\n' + v + '% carry ' + e.toLowerCase() + '" style="background:' + K.hexA(COL[e], Math.min(.95, .08 + v / 38)) + '">' + Math.round(v) + '</div>'; }).join('');
    }).join('');
  }
  K.bindTabs('z-dim', zones); zones('platform');

  /* ------------------ fronts ------------------ */
  $('cards').innerHTML = F.tags.slice(0, 12).map(function (t) {
    var half = Math.ceil(t.n / 2), a = K.moodStats(t.posts.slice(0, half)), b = K.moodStats(t.posts.slice(half)), diff = b.net - a.net, verdict = diff < -.15 ? 'Turned sour' : diff > .15 ? 'Warmed up' : 'Held steady';
    var act = t.daily.map(function (v, d) { return { v: v, d: d }; }).filter(function (x) { return x.v >= 3; }), pts = act.map(function (x, i) { return [act.length > 1 ? i / (act.length - 1) * 200 : 100, 23 - (t.moodSum[x.d] / Math.max(1, t.moodCnt[x.d])) * 20]; });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<article class="front"><h4 data-drill="' + K.q({ tag: t.tag }) + '" data-tip="' + esc(t.tag) + '\n' + fmt(t.n) + ' posts from ' + fmt(t.voices) + ' voices">' + esc(t.tag) + '</h4><div class="st">' + K.condition(t.net) + ' &middot; ' + deg(t.net) + ' &middot; ' + verdict + '</div><svg viewBox="0 0 200 46" preserveAspectRatio="none" role="img" aria-label="Mood over time"><line x1="0" x2="200" y1="23" y2="23" stroke="rgba(255,255,255,.2)" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/><path d="' + path + '" fill="none" stroke="' + netCol(t.net) + '" stroke-width="2" vector-effect="non-scaling-stroke"/>' + pts.map(function (p, i) { var d = act[i].d, m = t.moodSum[d] / Math.max(1, t.moodCnt[d]); return '<rect class="hit" x="' + (p[0] - 200 / Math.max(2, pts.length) / 2).toFixed(1) + '" y="0" width="' + (200 / Math.max(2, pts.length)).toFixed(1) + '" height="46" data-drill="' + K.q({ tag: t.tag, day: d }) + '"><title>' + K.dayName(F.dayStart(d)) + '\n' + deg(m) + ', ' + act[i].v + ' posts</title></rect>'; }).join('') + '</svg><div class="go"><a href="../swell/index.html#tag=' + encodeURIComponent(t.tag) + '">Ride it</a><a href="../atlas/index.html#tag=' + encodeURIComponent(t.tag) + '">Who wore it</a><a href="../grapevine/index.html#tag=' + encodeURIComponent(t.tag) + '">Trace it</a></div></article>';
  }).join('');

  /* ------------------ hours + depth ------------------ */
  (function () {
    var hrs = []; for (var h = 0; h < 24; h++) hrs.push(K.moodStats(P.filter(function (p) { return p.hour === h; })));
    var mx = Math.max.apply(null, hrs.map(function (s) { return Math.abs(s.net); })) || .1, mid = 118, bw = 560 / 24, o = '<line x1="34" x2="600" y1="' + mid + '" y2="' + mid + '" stroke="rgba(255,255,255,.14)"/>';
    hrs.forEach(function (s, h) { var bh = Math.abs(s.net) / mx * 96, x = 36 + h * bw; o += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (s.net > 0 ? mid - bh : mid).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + Math.max(1, bh).toFixed(1) + '" rx="3" fill="' + netCol(s.net) + '" data-drill="' + K.q({ hour: h }) + '"><title>' + K.pad2(h) + ':00 UTC\n' + deg(s.net) + ', ' + fmt(s.n) + ' posts</title></rect>'; if (h % 6 === 0) o += '<text class="t f" x="' + (x + bw / 2).toFixed(1) + '" y="244" text-anchor="middle">' + K.pad2(h) + 'h</text>'; });
    o += '<text class="t f" x="30" y="26" text-anchor="end">' + deg(mx) + '</text><text class="t f" x="30" y="218" text-anchor="end">' + deg(-mx) + '</text>';
    $('hours').innerHTML = o;
    var maxD = 6, lv = []; for (var d = 0; d <= maxD; d++) lv.push(K.moodStats(P.filter(function (p) { return (d === maxD ? p.depth >= d : p.depth === d) && p.type !== 'repost'; })));
    var X = function (i) { return 60 + i / maxD * 510; }, Y = function (v) { return 120 - v * 240; }, pts = lv.map(function (s, i) { return [X(i), Y(s.net), s]; }).filter(function (p) { return p[2].n >= K.K_MIN; });
    var q = '<line x1="50" x2="590" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(255,255,255,.14)" stroke-dasharray="2 4"/><path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="#8fc8ff" stroke-width="2"/>';
    pts.forEach(function (p, i) { q += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (3 + 9 * Math.sqrt(p[2].n / Math.max(1, lv[0].n))).toFixed(1) + '" fill="' + netCol(p[2].net) + '" data-drill="' + K.q({ depth: lv.indexOf(p[2]) === maxD ? maxD + '+' : lv.indexOf(p[2]), norepost: 1 }) + '"><title>' + (lv.indexOf(p[2]) === 0 ? 'Original posts' : 'Hop ' + lv.indexOf(p[2])) + '\n' + fmt(p[2].n) + ' posts, ' + deg(p[2].net) + '</title></circle><text class="t b" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 16).toFixed(1) + '" text-anchor="middle">' + deg(p[2].net) + '</text>'; });
    for (var j = 0; j <= maxD; j++) q += '<text class="t f" x="' + X(j) + '" y="244" text-anchor="middle">' + (j === 0 ? 'origin' : j === maxD ? maxD + '+' : j) + '</text>';
    $('depth').innerHTML = q;
  })();

  /* ------------------ naive bayes ------------------ */
  var NB = K.trainNB(P), NAME = { '1': 'Warm', '0': 'Even', '-1': 'Sour' }, NC = { '1': '#7be08a', '0': '#ffd27a', '-1': '#ff7f9e' };
  function nbRead() {
    var v = $('nb-in').value, r = NB.predict(v);
    $('nb-out').innerHTML = !v.trim() ? '<div class="empty">Say something to the clerk.</div>' : (r.known ? '' : '<div class="hint" style="margin-bottom:8px">The clerk has seen none of these words, so this is only a guess from how common each mood is.</div>') + ['1', '0', '-1'].map(function (c) { var p = Math.round(1000 * r.probs[c]) / 10; return '<div class="trow"><span class="name">' + NAME[c] + (r.label === c ? ' &larr;' : '') + '</span><span class="sbar" data-tip="' + NAME[c] + '\n' + p + '% probability"><i style="width:' + p + '%;background:' + NC[c] + '"></i></span><span class="v">' + p + '%</span></div>'; }).join('') + (r.why.length ? '<div class="chips" style="margin-top:8px">' + r.why.map(function (w) { return '<span class="tagc" style="color:' + NC[w.c] + '" data-tip="' + esc(w.word) + '\nleans ' + NAME[w.c].toLowerCase() + '">' + esc(w.word) + '</span>'; }).join('') + '</div>' : '');
  }
  $('nb-in').addEventListener('input', nbRead); nbRead();
  $('nb-score').innerHTML = F.labelled && NB.tested ? [[NB.accuracy + '%', 'on posts it never saw'], [NB.unseenWording + '%', 'on wordings it never saw'], [NB.lexicon + '%', 'word list alone'], [NB.baseline + '%', 'always guess the commonest']].map(function (x) { return '<div data-tip="' + x[1] + '"><b>' + x[0] + '</b>' + x[1] + '</div>'; }).join('') : '<div style="text-transform:none;letter-spacing:0;font-size:12px">This file has no human mood labels, so there is nothing fair to score the clerk against. It is learning the word list.</div>';

  /* ------------------ strength and subjectivity ------------------ */
  (function () {
    var read = P.filter(function (p) { return K.lexOf(p); }), B = [['Plain statement', { subj: 'fact' }], ['Weak opinion', { strength: 'weak' }], ['Mild opinion', { strength: 'mild' }], ['Strong opinion', { strength: 'strong' }]];
    var counts = B.map(function (b) { return read.filter(function (p) { var r = K.lexOf(p); return b[1].subj ? r.subj === b[1].subj : r.strength === b[1].strength; }); }), mx = Math.max.apply(null, counts.map(function (l) { return l.length; })) || 1;
    $('str').innerHTML = B.map(function (b, i) { var L = counts[i], s = K.moodStats(L.map(function (p) { var r = K.lexOf(p); return { mood: r.mood === 'warm' ? 1 : r.mood === 'sour' ? -1 : 0 }; })), w = 100 * L.length / mx; return '<div class="trow"' + (L.length ? ' data-drill="' + K.q(b[1]) + '"' : '') + ' data-tip="' + b[0] + '\n' + fmt(L.length) + ' posts, ' + pct(L.length, read.length) + '% of those read"><span class="name" style="font:italic 15px var(--display)">' + b[0] + '</span><span class="sbar" style="width:' + Math.max(1, w).toFixed(1) + '%"><i style="width:' + s.posShare + '%;background:#7be08a"></i><i style="width:' + s.neuShare + '%;background:#ffd27a"></i><i style="width:' + s.negShare + '%;background:#ff7f9e"></i></span><span class="v">' + fmt(L.length) + '</span></div>'; }).join('') + '<div class="hint" style="margin-top:10px">' + fmt(read.length) + ' of ' + fmt(P.length) + ' posts could be read.</div>';
  })();

  /* sky readout */
  $('sky').addEventListener('pointermove', function (e) { if (e.target !== $('scene')) { window.Loupe.tipOff(); return; } var st = K.moodStats(S.perDay[S.day]); $('scene').style.cursor = st.n ? 'pointer' : ''; window.Loupe.tipAt(e.clientX, e.clientY, K.dayName(F.dayStart(S.day)) + ', ' + (st.n >= K.K_MIN ? K.condition(st.net) : 'dead calm') + '\n' + st.posShare + '% warm, ' + st.negShare + '% sour, ' + fmt(st.n) + ' reports', 'Click to read the reports'); });
  $('sky').addEventListener('pointerleave', function () { window.Loupe.tipOff(); });
  $('scene').addEventListener('click', function () { var q = { day: S.day }; if (S.front !== 'all') { if (S.front.charAt(0) === '#') q.tag = S.front; else q.platform = S.front; } if (S.perDay[S.day].length) window.Loupe.open(q); });

  /* start */
  wheel(); river(); filterList(); drawStrip(); setDay(S.day);
  S.net = S.target.net; S.sour = S.target.negShare; S.warm = S.target.posShare;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { S.onscreen = en[0].isIntersecting; }).observe($('sky'));
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('sky')); else window.addEventListener('resize', resize);
  resize(); setPlay(); requestAnimationFrame(frame);
  window.__weather = S;
})();
