/* The Murmuration landing page: the flock, the five rooms and the rumour trail. */
(function () {
  'use strict';
  if (window.MURMUR_EMPTY) return;
  var K = window.Kit, $ = K.$, esc = K.esc, fmt = K.fmt, pct = K.pct, F = K.loadFeed(), P = F.posts;
  $('rail').outerHTML = K.rail('home').replace(/\.\.\//g, '');
  var ALL = K.moodStats(P), V = Array.from(F.voices.values());
  var ROOMS = [
    { id: 'listen', n: 'I', name: 'The Listening Post', q: 'How did it get here?', c: '#ffb454', line: 'Every door, four checkpoints and a clerk who shreds your name on arrival.' },
    { id: 'weather', n: 'II', name: 'The Weather Room', q: 'How does it feel?', c: '#8fc8ff', line: 'The crowd&rsquo;s mood, delivered by a forecaster who has stopped being surprised.' },
    { id: 'atlas', n: 'III', name: 'The Audience Atlas', q: 'Who are they?', c: '#35d0c0', line: 'A field guide to the people behind the posts, with their names politely removed.' },
    { id: 'swell', n: 'IV', name: 'The Swell', q: 'What is rising?', c: '#ff9270', line: 'Roll back to any morning and bet against a machine that cannot peek.' },
    { id: 'grapevine', n: 'V', name: 'The Grapevine', q: 'Who told whom?', c: '#a3de76', line: 'Follow a whisper across the crowd, or cut the wires and watch it fall apart.' }
  ];
  var links = P.filter(function (p) { return p.ref >= 0; }).length;

  var UP = window.MURMUR_UPLOAD;
  $('stats').innerHTML = [['Voices in the flock', fmt(V.length), UP ? 'names left at the door' : 'every one invented', '#ffc266', 'href="atlas/index.html"'], ['Posts on file', fmt(P.length), 'over ' + K.spanText(F), '#ffb454', 'data-drill="label=Everything%20on%20file" data-tip="Every post on file"'], ['Threads tied', fmt(links), pct(links, P.length) + '% answer another', '#a3de76', 'data-drill="reacting=1" data-tip="Posts answering another post"'], ['Rumours tracked', F.tags.length, fmt(F.tags.reduce(function (s, t) { return s + t.n; }, 0)) + ' posts carry one', '#ff9270', 'href="swell/index.html"'], ['Doors watched', F.platforms.length, 'one archive', '#8fc8ff', 'href="listen/index.html"']].map(function (x) { var tag = /^href/.test(x[4]) ? 'a' : 'div'; return '<' + tag + ' class="kpi" ' + x[4] + ' style="--c:' + x[3] + '"><span>' + x[0] + '</span><strong>' + x[1] + '</strong><small>' + x[2] + '</small></' + tag + '>'; }).join('');
  $('data-line').textContent = fmt(P.length) + ' posts, ' + fmt(V.length) + ' voices, ' + K.spanText(F) + ' and ' + F.platforms.length + ' platforms, in a single CSV that all five rooms read.';

  /* ------------- room glyphs ------------- */
  var TIP = { listen: 'Posts per day\nThe archive filling up.', weather: 'Mood per day\nAbove the line is warm, below is sour.', atlas: 'One dot per kind of voice\nStep inside for the constellation.', swell: 'The five biggest trends\nEach ridge is a wave of posts.', grapevine: 'Who answers whom\nEvery line is a thread.' };
  var daily = new Array(F.days).fill(0), net = []; P.forEach(function (p) { daily[p.day]++; });
  for (var d = 0; d < F.days; d++) net.push(K.moodStats(P.filter(function (p) { return p.day === d; })).net);
  function glyph(id, c) {
    var o = '<svg viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true" data-tip="' + esc(TIP[id]) + '">', mx, i;
    if (id === 'listen') { mx = Math.max.apply(null, daily); daily.forEach(function (v, j) { o += '<rect x="' + (j * 200 / F.days + 1).toFixed(1) + '" y="' + (44 - v / mx * 42).toFixed(1) + '" width="' + (200 / F.days - 2).toFixed(1) + '" height="' + (v / mx * 42).toFixed(1) + '" fill="' + c + '" opacity=".8"/>'; }); }
    if (id === 'weather') { o += '<line x1="0" x2="200" y1="22" y2="22" stroke="rgba(255,255,255,.2)" vector-effect="non-scaling-stroke"/><path d="' + net.map(function (v, j) { return (j ? 'L' : 'M') + (j * 200 / (F.days - 1)).toFixed(1) + ' ' + (22 - v * 70).toFixed(1); }).join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2" vector-effect="non-scaling-stroke"/>'; }
    if (id === 'atlas') { var r = K.rngFrom(3); for (i = 0; i < 60; i++) { var a = i * 2.4, q = 2.4 * Math.sqrt(i); o += '<circle cx="' + (100 + Math.cos(a) * q * 3).toFixed(1) + '" cy="' + (22 + Math.sin(a) * q).toFixed(1) + '" r="1.1" fill="' + c + '" opacity="' + (.5 + r() * .5).toFixed(2) + '"/>'; } }
    if (id === 'swell') { F.tags.slice(0, 5).forEach(function (t, j) { var m = Math.max.apply(null, t.daily); o += '<path d="M0 44' + t.daily.map(function (v, x) { return ' L' + (x * 200 / (F.days - 1)).toFixed(1) + ' ' + (44 - v / m * (40 - j * 3)).toFixed(1); }).join('') + ' L200 44Z" fill="' + c + '" opacity=".32"/>'; }); }
    if (id === 'grapevine') { var s = K.rngFrom(11), pts = []; for (i = 0; i < 26; i++) pts.push([s() * 200, s() * 44]); pts.forEach(function (p, j) { if (j) o += '<line x1="' + pts[j - 1][0].toFixed(1) + '" y1="' + pts[j - 1][1].toFixed(1) + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '" stroke="' + c + '" stroke-opacity=".4" vector-effect="non-scaling-stroke"/>'; }); pts.forEach(function (p) { o += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="1.5" fill="' + c + '"/>'; }); }
    return o + '</svg>';
  }
  var metric = { listen: '<b>' + F.platforms.length + ' doors</b>, ' + fmt(P.length) + ' posts', weather: '<b>' + ALL.posShare + '% warm</b>, ' + ALL.negShare + '% sour', atlas: '<b>' + fmt(V.filter(function (v) { return !v.org; }).length) + ' people</b> mapped', swell: '<b>' + F.tags.length + ' waves</b> on the chart', grapevine: '<b>' + fmt(links) + ' threads</b> traced' };
  $('rooms').innerHTML = ROOMS.map(function (r) { return '<a class="room" href="' + r.id + '/index.html" style="--c:' + r.c + '"><span class="n">' + r.n + '</span><h3>' + r.name + '</h3><span class="q">' + r.q + '</span><p>' + r.line + '</p>' + glyph(r.id, r.c) + '<span class="m">' + metric[r.id] + '</span></a>'; }).join('');

  /* ------------- the rumour trail ------------- */
  var cur = F.tags[0].tag;
  function deg(v) { var x = Math.round(v * 40); return (x > 0 ? '+' : '') + x + '°'; }
  function mode(o) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0]; }
  function trail() {
    var t = F.tags.filter(function (x) { return x.tag === cur; })[0], enc = encodeURIComponent(t.tag), first = Object.keys(t.firstBy).sort(function (a, b) { return t.firstBy[a] - t.firstBy[b]; })[0];
    var seen = {}, reg = {}, cal = {};
    t.posts.forEach(function (p) { if (seen[p.voice.id]) return; seen[p.voice.id] = 1; if (p.voice.org) return; if (p.voice.region) reg[p.voice.region] = (reg[p.voice.region] || 0) + 1; if (p.voice.calling) cal[p.voice.calling] = (cal[p.voice.calling] || 0) + 1; });
    var m = Math.max.apply(null, t.daily), peak = t.daily.indexOf(m), depth = Math.max.apply(null, t.posts.map(function (p) { return p.depth; })), cross = t.posts.filter(function (p) { return p.type === 'share'; }).length, half = Math.ceil(t.n / 2), a = K.moodStats(t.posts.slice(0, half)).net, b = K.moodStats(t.posts.slice(half)).net;
    var S = [
      [ROOMS[0], fmt(t.n), 'posts filed under it', 'First heard on ' + esc(first) + ', ' + K.dayName(t.posts[0].ts) + '.', 'listen/index.html'],
      [ROOMS[1], deg(t.net), K.condition(t.net), b - a < -.15 ? 'It started warmer than it ended.' : b - a > .15 ? 'It warmed up as it went.' : 'The mood barely moved.', 'weather/index.html'],
      [ROOMS[2], fmt(t.voices), 'voices wore it', 'Mostly ' + esc((mode(cal) || 'unknown').replace(/ &.*/, '')) + ', in ' + esc(mode(reg) || 'parts unknown') + '.', 'atlas/index.html#tag=' + enc],
      [ROOMS[3], m, 'posts at the crest', 'Broke on ' + K.dayName(F.dayStart(peak)) + '.', 'swell/index.html#tag=' + enc],
      [ROOMS[4], depth, 'hops at its deepest', cross + ' crossing' + (cross === 1 ? '' : 's') + ' between platforms.', 'grapevine/index.html#tag=' + enc]
    ];
    $('trail').innerHTML = S.map(function (s) { return '<a class="stop" href="' + s[4] + '" style="--c:' + s[0].c + '"><span class="k">' + s[0].n + '</span><div class="v">' + s[1] + '</div><div class="l">' + s[2] + '</div><div class="s">' + s[3] + '</div></a>'; }).join('');
    Array.prototype.forEach.call($('trail-tags').children, function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-t') === cur)); });
  }
  $('trail-tags').innerHTML = F.tags.map(function (t) { return '<button type="button" class="tagc" data-t="' + esc(t.tag) + '" aria-pressed="false">' + esc(t.tag) + '</button>'; }).join('');
  $('trail-tags').addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (b) { cur = b.getAttribute('data-t'); trail(); } });
  trail();

  /* ------------- the flock ------------- */
  var PL = K.fillPalette({ X: '#bfe3ff', Telegram: '#9df0d6', Instagram: '#f5a8ea', Facebook: '#b6c3ff', YouTube: '#ffa3b8', Reddit: '#ffd08a' }, F.platforms);
  var MC = { warm: '#a9f0a0', even: '#fff0c4', sour: '#ff8ea6' }, RC = { 'North America': '#bfe3ff', Europe: '#9df0d6', 'South Asia': '#ffd08a', 'Latin America': '#ffa3b8', 'East Asia & Pacific': '#d4b8ff', 'Middle East & Africa': '#c9e38a' };
  var moodOf = {}; (function () { var s = {}; P.forEach(function (p) { if (p.mood === null) return; s[p.voice.id] = (s[p.voice.id] || 0) + p.mood; }); V.forEach(function (v) { var x = s[v.id] || 0; moodOf[v.id] = x > 0 ? 'warm' : x < 0 ? 'sour' : 'even'; }); })();
  var FLOCK_MAX = 1500, BV = V.length > FLOCK_MAX ? V.filter(function (_, i) { return i % Math.ceil(V.length / FLOCK_MAX) === 0; }) : V;
  var cv = $('flock'), host = cv.parentElement, B = { W: 0, H: 0, ctx: null, by: 'platform', mode: 'one', mouse: null, on: true }, N = BV.length, x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N), rnd = K.rngFrom(5);
  function keyOf(v) { return B.by === 'platform' ? v.platform : B.by === 'mood' ? moodOf[v.id] : (v.region || 'Elsewhere'); }
  function colOf(v) { return B.by === 'platform' ? PL[v.platform] : B.by === 'mood' ? MC[moodOf[v.id]] : (RC[v.region] || '#e5e0ea'); }
  var groupIdx = [], groups = [];
  function regroup() { var names = Array.from(new Set(BV.map(keyOf))).sort(); groups = names; groupIdx = BV.map(function (v) { return names.indexOf(keyOf(v)); }); colours = BV.map(colOf); }
  var colours = [];
  function resize() { var f = K.fitCanvas(cv, host); B.ctx = f.ctx; B.W = f.W; B.H = f.H; }
  resize();
  for (var i0 = 0; i0 < N; i0++) { x[i0] = B.W * (.35 + rnd() * .4); y[i0] = B.H * (.15 + rnd() * .4); var a0 = rnd() * 6.28; vx[i0] = Math.cos(a0) * 2; vy[i0] = Math.sin(a0) * 2; }
  regroup();
  function step(t) {
    var W = B.W, H = B.H, cell = 46, grid = new Map(), i, j;
    for (i = 0; i < N; i++) { var k = Math.floor(x[i] / cell) * 2048 + Math.floor(y[i] / cell); var g = grid.get(k); if (g) g.push(i); else grid.set(k, [i]); }
    var mode2 = B.mode === 'split';
    var cxMain = W * (.56 + .28 * Math.sin(t * .00031)), cyMain = H * (.28 + .1 * Math.sin(t * .00047 + 1));
    for (i = 0; i < N; i++) {
      var cx = Math.floor(x[i] / cell), cy = Math.floor(y[i] / cell), sx = 0, sy = 0, ax = 0, ay = 0, n = 0, px = 0, py = 0;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var list = grid.get((cx + dx) * 2048 + cy + dy); if (!list) continue;
        for (j = 0; j < list.length; j++) {
          var o = list[j]; if (o === i) continue;
          if (mode2 && groupIdx[o] !== groupIdx[i]) continue;
          var ex = x[i] - x[o], ey = y[i] - y[o], d2 = ex * ex + ey * ey;
          if (d2 > 2100) continue;
          if (d2 < 150 && d2 > 0) { sx += ex / d2; sy += ey / d2; }
          ax += vx[o]; ay += vy[o]; px += x[o]; py += y[o]; n++;
        }
      }
      var fx = sx * 5 + (Math.random() - .5) * .34, fy = sy * 5 + (Math.random() - .5) * .34;
      if (n) { fx += (ax / n - vx[i]) * .05 + (px / n - x[i]) * .0009; fy += (ay / n - vy[i]) * .05 + (py / n - y[i]) * .0009; }
      var tx = cxMain, ty = cyMain;
      if (mode2) { var a = groupIdx[i] / groups.length * 6.2832 + t * .00012; tx = W * (.5 + .34 * Math.cos(a)); ty = H * (.27 + .12 * Math.sin(a)); }
      fx += (tx - x[i]) * .00014; fy += (ty - y[i]) * .00014;
      if (B.mouse) { var hx = x[i] - B.mouse.x, hy = y[i] - B.mouse.y, h2 = hx * hx + hy * hy; if (h2 < 19000 && h2 > 1) { var f = 34 / h2 * Math.sqrt(h2) / 14 * 3; fx += hx / Math.sqrt(h2) * f; fy += hy / Math.sqrt(h2) * f; } }
      vx[i] += fx; vy[i] += fy;
      var sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]), mx = 3.6, mn = 1.5;
      if (sp > mx) { vx[i] *= mx / sp; vy[i] *= mx / sp; } else if (sp < mn && sp > 0) { vx[i] *= mn / sp; vy[i] *= mn / sp; }
    }
    for (i = 0; i < N; i++) { x[i] += vx[i]; y[i] += vy[i]; if (x[i] < -30) x[i] = W + 30; if (x[i] > W + 30) x[i] = -30; if (y[i] < 74) vy[i] += .3; if (y[i] > H * (W < 620 ? .4 : .5)) vy[i] -= .42; }
  }
  function paint() {
    var c = B.ctx, i; c.clearRect(0, 0, B.W, B.H);
    for (i = 0; i < N; i++) {
      var s = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) || 1, ux = vx[i] / s, uy = vy[i] / s;
      c.fillStyle = colours[i]; c.beginPath(); c.moveTo(x[i] + ux * 4.4, y[i] + uy * 4.4); c.lineTo(x[i] - ux * 2.6 - uy * 2.2, y[i] - uy * 2.6 + ux * 2.2); c.lineTo(x[i] - ux * 2.6 + uy * 2.2, y[i] - uy * 2.6 - ux * 2.2); c.fill();
    }
  }
  function frame(t) { requestAnimationFrame(frame); if (!B.on) return; step(t); paint(); }
  host.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); B.mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  host.addEventListener('pointerleave', function () { B.mouse = null; window.Loupe.tipOff(); });
  function birdAt(e) { var r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, reach = e.type === 'click' ? 60 : 26, best = -1, bd = reach * reach, i; for (i = 0; i < N; i++) { var a = x[i] - px, b = y[i] - py, s = a * a + b * b; if (s < bd) { bd = s; best = i; } } return best; }
  cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var i = birdAt(e); if (i < 0) { window.Loupe.tipOff(); return; } var v = BV[i]; window.Loupe.tipAt(e.clientX, e.clientY, 'A ' + moodOf[v.id] + ' voice on ' + v.platform + '\n' + v.n + ' post' + (v.n === 1 ? '' : 's') + (v.region ? ', ' + v.region : ''), 'Click to read this bird'); });
  cv.addEventListener('click', function (e) { var i = birdAt(e); if (i >= 0) window.Loupe.open({ voice: BV[i].id, label: 'One bird' }); });
  K.bindTabs('flock-by', function (v) { B.by = v; regroup(); $('flock-note').textContent = v === 'mood' ? 'Green birds run warm, rose birds run sour.' : v === 'region' ? 'Each colour is a corner of the world. Pale birds did not say where.' : 'Each colour is a platform. Be the hawk.'; });
  K.bindTabs('flock-mode', function (v) { B.mode = v; });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { B.on = en[0].isIntersecting; }).observe(host);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);
  if (K.reduce) { for (var w = 0; w < 200; w++) step(w * 16); paint(); B.on = false; } else requestAnimationFrame(frame);
  window.__flock = B;
})();
