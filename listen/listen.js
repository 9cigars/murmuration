/* Chapter I: The Listening Post. */
(function () {
  'use strict';
  var K = window.Kit, $ = K.$, esc = K.esc, fmt = K.fmt, pct = K.pct, F = K.loadFeed();
  $('rail').outerHTML = K.rail('listen');
  var PAL = { X: '#78c8ff', Telegram: '#7df0c3', Instagram: '#ec83e0', Facebook: '#8da2ff', YouTube: '#ff7f9e', Reddit: '#ffb454' };
  var KIND = [['post', 'Original', '#ffb454'], ['reply', 'Reply', '#7df0c3'], ['quote', 'Quote', '#b48cff'], ['repost', 'Repost', '#78c8ff'], ['share', 'Crossing', '#ff7f9e']];
  var P = F.posts, plats = F.platforms, N = P.length, resolved = P.filter(function (p) { return p.ref >= 0; }).length;
  var byPlat = {}; plats.forEach(function (x) { byPlat[x] = P.filter(function (p) { return p.platform === x; }); });
  var hourly = new Array(24).fill(0); P.forEach(function (p) { hourly[p.hour]++; });
  var daily = new Array(F.days).fill(0); P.forEach(function (p) { daily[p.day]++; });

  /* ------------------ headline ------------------ */
  $('k-posts').textContent = fmt(N); $('k-posts-s').textContent = 'over ' + F.days + ' sleepless days';
  $('k-voices').textContent = fmt(F.voices.size); $('k-voices-s').textContent = 'names read: none';
  $('k-doors').textContent = plats.length; $('k-doors-s').textContent = 'all watched at once';
  $('k-links').textContent = fmt(resolved); $('k-links-s').textContent = pct(resolved, N) + '% of posts answer another';
  $('meta').textContent = fmt(N) + ' posts · ' + fmt(F.voices.size) + ' anonymous voices · data/audience_sample.csv';

  /* ------------------ the intake line ------------------ */
  var S = { t: 0, playing: false, dur: 15000, last: 0, ptr: 0, parts: [], cells: {}, muted: {}, gate: -1, glow: [0, 0, 0, 0], W: 0, H: 0, ctx: null, onscreen: true };
  var GATES = ['Hear', 'Stamp', 'Mask', 'Thread'], DOOR_X = 112;
  function wall() { var x0 = S.W * (S.W < 620 ? 0.6 : 0.66), x1 = S.W - 18, y0 = 62, y1 = S.H - 34; return { x0: x0, y0: y0, cw: (x1 - x0) / F.days, rh: (y1 - y0) / plats.length }; }
  function gateX(i) { var a = S.W < 620 ? 76 : DOOR_X + 30, b = S.W * (S.W < 620 ? 0.54 : 0.6); return a + (b - a) * (i + .5) / 4; }
  function laneY(i) { var w = wall(); return w.y0 + w.rh * (i + .5); }
  function resize() { var f = K.fitCanvas($('line'), $('sky')); S.W = f.W; S.H = f.H; S.ctx = f.ctx; }
  function cut() { return F.tMin + (F.tMax - F.tMin + 1) * S.t; }
  function reset() { S.parts = []; S.cells = {}; var c = cut(); S.ptr = 0; while (S.ptr < N && P[S.ptr].ts <= c) { file(P[S.ptr]); S.ptr++; } }
  function file(p) { if (S.muted[p.platform]) return; var k = plats.indexOf(p.platform) + ':' + p.day; S.cells[k] = (S.cells[k] || 0) + 1; }
  var maxCell = 1; (function () { var c = {}; P.forEach(function (p) { var k = p.platform + p.day; c[k] = (c[k] || 0) + 1; if (c[k] > maxCell) maxCell = c[k]; }); })();

  function read() {
    var c = Math.min(cut(), F.tMax), n = 0, i; for (i = 0; i < S.ptr; i++) if (!S.muted[P[i].platform]) n++;
    $('read').innerHTML = '<b>' + K.dayName(c) + ', ' + new Date(c).toUTCString().slice(17, 22) + ' UTC</b><br>' + fmt(n) + ' of ' + fmt(N) + ' filed';
  }
  function setPlay() { $('play').innerHTML = S.playing ? K.PAUSE : K.PLAY; $('play').setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); }

  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(64, now - (S.last || now)); S.last = now;
    if (!S.ctx || !S.onscreen) return;
    if (S.playing) {
      S.t = Math.min(1, S.t + dt / S.dur); $('time').value = Math.round(S.t * 1000);
      var c = cut(), spawned = 0;
      while (S.ptr < N && P[S.ptr].ts <= c) {
        var p = P[S.ptr++]; file(p);
        if (!S.muted[p.platform] && spawned++ < 24) S.parts.push({ p: p, f: 0, lane: plats.indexOf(p.platform), j: Math.random() * 16 - 8 });
      }
      if (S.t >= 1) { S.playing = false; setPlay(); }
      read();
    }
    draw(dt);
  }
  function draw(dt) {
    var c = S.ctx, W = S.W, H = S.H, w = wall(), i, compact = W < 620;
    c.clearRect(0, 0, W, H);
    // lanes and door names
    plats.forEach(function (name, l) {
      var y = laneY(l), off = S.muted[name];
      c.strokeStyle = K.hexA(PAL[name] || '#888888', off ? 0.05 : 0.16); c.beginPath(); c.moveTo(compact ? 62 : DOOR_X, y); c.lineTo(w.x0 - 8, y); c.stroke();
      c.fillStyle = off ? '#6e778c' : PAL[name] || '#888'; c.font = (compact ? '500 11px ' : '600 13px ') + 'Manrope, sans-serif'; c.textAlign = 'right';
      c.fillText(name, (compact ? 58 : DOOR_X - 8), y + 4);
    });
    // gates
    GATES.forEach(function (g, i2) {
      var x = gateX(i2), hot = S.gate === i2; S.glow[i2] *= 0.93;
      var a = 0.25 + Math.min(.75, S.glow[i2] / 12) + (hot ? .3 : 0);
      c.strokeStyle = K.hexA('#ffb454', Math.min(1, a)); c.lineWidth = hot ? 3 : 2; c.beginPath(); c.moveTo(x, w.y0 - 18); c.lineTo(x, H - 24); c.stroke(); c.lineWidth = 1;
      c.fillStyle = hot ? '#fff' : '#ffb454'; c.font = 'italic 15px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.fillText(g, x, w.y0 - 26);
    });
    // archive wall
    c.font = '500 11px Manrope, sans-serif'; c.fillStyle = '#6e778c'; c.textAlign = 'left'; c.fillText('The archive', w.x0, w.y0 - 26);
    for (var l = 0; l < plats.length; l++) for (var d = 0; d < F.days; d++) {
      var v = S.cells[l + ':' + d] || 0, col = PAL[plats[l]] || '#888888';
      c.fillStyle = v ? K.hexA(col, 0.14 + 0.86 * Math.pow(v / maxCell, 0.6)) : 'rgba(255,255,255,.035)';
      c.fillRect(w.x0 + d * w.cw + 1, w.y0 + l * w.rh + 1, Math.max(1, w.cw - 2), Math.max(1, w.rh - 2));
    }
    // posts in flight
    var startX = compact ? 62 : DOOR_X, endX = w.x0;
    S.parts = S.parts.filter(function (s) {
      s.f += dt / 900; if (s.f >= 1) return false;
      var x0 = s.f * 1.0, fx = startX + (endX - startX) * Math.min(1, x0 / .78), y = laneY(s.lane) + s.j * (1 - s.f);
      var targetX = w.x0 + s.p.day * w.cw + w.cw / 2, targetY = w.y0 + s.lane * w.rh + w.rh / 2;
      if (x0 > .78) { var u = (x0 - .78) / .22; fx = endX + (targetX - endX) * u; y = y + (targetY - y) * u; }
      GATES.forEach(function (g, gi) { if (Math.abs(gateX(gi) - fx) < 5) S.glow[gi] = Math.min(14, S.glow[gi] + .35); });
      var col = PAL[s.p.platform] || '#ffffff';
      c.fillStyle = K.hexA(col, .28); c.beginPath(); c.arc(fx, y, 5, 0, 6.2832); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(fx, y, 1.9, 0, 6.2832); c.fill();
      return true;
    });
  }

  /* gate inspector */
  var GATE_BODY = [
    function () { return ['Hear', 'Every door reports here.', plats.map(function (x) { return [x, fmt(byPlat[x].length)]; })]; },
    function () { var ok = P.filter(function (p) { return isFinite(p.ts); }).length; return ['Stamp', 'One clock, no arguments.', [['Valid times', pct(ok, N) + '%'], ['First on file', K.dayName(F.tMin)], ['Last on file', K.dayName(F.tMax)], ['Clock', 'UTC']]]; },
    function () { var anon = P.filter(function (p) { return /^anon-[0-9a-f]{16}$/.test(p.voice.id); }).length, at = P.filter(function (p) { return /(^|\s)@\w/.test(p.text); }).length, em = P.filter(function (p) { return /[\w.+-]+@[\w.-]+\.\w{2,}/.test(p.text); }).length; return ['Mask', 'Names go in. Codes come out.', [['Posts with coded author', pct(anon, N) + '%'], ['Unique codes', fmt(F.voices.size)], ['Handles left in text', fmt(at)], ['Emails left in text', fmt(em)]]]; },
    function () { var want = P.filter(function (p) { return p.refId; }).length, parents = P.filter(function (p) { return p.ref < 0 && p.kids.length; }).length; return ['Thread', 'Every echo tied to its shout.', [['Posts that react', fmt(want)], ['Links resolved', pct(resolved, want) + '%'], ['Conversations', fmt(parents)], ['Deepest chain', Math.max.apply(null, P.map(function (p) { return p.depth; })) + ' hops']]]; }
  ];
  function openGate(i) {
    S.gate = i; var box = $('inspect');
    if (i < 0) { box.hidden = true; return; }
    var g = GATE_BODY[i]();
    box.innerHTML = '<button type="button" class="x" aria-label="Close">&times;</button><h4>' + g[0] + '</h4><div class="sub">' + g[1] + '</div><div class="dl">' + g[2].map(function (r) { return '<span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b>'; }).join('') + '</div>';
    box.hidden = false;
  }
  $('inspect').addEventListener('click', function (e) { if (e.target.closest('.x')) openGate(-1); });
  $('sky').addEventListener('click', function (e) {
    if (e.target.closest('.inspect')) return;
    var r = $('sky').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hit = -1;
    GATES.forEach(function (g, i) { if (Math.abs(gateX(i) - x) < 26) hit = i; });
    if (hit >= 0) { openGate(hit === S.gate ? -1 : hit); return; }
    if (x < (S.W < 620 ? 62 : DOOR_X)) plats.forEach(function (n, l) { if (Math.abs(laneY(l) - y) < 16) toggleDoor(n); });
  });
  $('sky').addEventListener('mousemove', function (e) { var r = $('sky').getBoundingClientRect(), x = e.clientX - r.left, on = false; GATES.forEach(function (g, i) { if (Math.abs(gateX(i) - x) < 26) on = true; }); $('sky').style.cursor = on ? 'pointer' : ''; });

  function toggleDoor(n) { S.muted[n] = !S.muted[n]; drawDoors(); var c = cut(); S.cells = {}; for (var i = 0; i < N && P[i].ts <= c; i++) file(P[i]); read(); }
  function drawDoors() { $('doors').innerHTML = plats.map(function (x) { return '<button type="button" class="tagc" data-p="' + esc(x) + '" aria-pressed="' + (!S.muted[x]) + '">' + esc(x) + '</button>'; }).join(''); }
  $('doors').addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (b) toggleDoor(b.getAttribute('data-p')); });
  $('play').addEventListener('click', function () { if (S.t >= 0.999) { S.t = 0; reset(); } S.playing = !S.playing; S.last = performance.now(); setPlay(); });
  $('time').addEventListener('input', function () { S.playing = false; setPlay(); S.t = this.value / 1000; reset(); read(); });
  K.spark($('spark'), daily, '#ffb454');
  drawDoors();

  /* ------------------ field notes ------------------ */
  (function () {
    var big = plats.slice().sort(function (a, b) { return byPlat[b].length - byPlat[a].length; })[0], peakD = daily.indexOf(Math.max.apply(null, daily)), peakH = hourly.indexOf(Math.max.apply(null, hourly)), lowH = hourly.indexOf(Math.min.apply(null, hourly));
    var echoes = pct(resolved, N), counts = Array.from(F.voices.values()).map(function (v) { return v.n; }).sort(function (a, b) { return b - a; }), topN = Math.round(counts.length / 10), top = counts.slice(0, topN).reduce(function (a, b) { return a + b; }, 0);
    var noLang = P.filter(function (p) { return !p.lang; }).length, deep = Math.max.apply(null, P.map(function (p) { return p.depth; })), langs = new Set(P.map(function (p) { return p.lang; }).filter(Boolean)).size;
    K.notes($('notes'), [
      { kick: 'Busiest door', fig: pct(byPlat[big].length, N), unit: '%', frac: pct(byPlat[big].length, N), head: 'of all traffic came through ' + big, text: 'The hinges are holding, barely.' },
      { kick: 'Worst night', fig: fmt(daily[peakD]), unit: ' posts', head: 'landed on ' + K.dayName(F.dayStart(peakD)), text: 'A quiet day brings about ' + fmt(Math.round(N / F.days)) + '. The clerk asked for a raise.' },
      { kick: 'Rush hour', fig: K.pad2(peakH), unit: ':00 UTC', head: 'is when the bell rings most', text: 'Silence falls near ' + K.pad2(lowH) + ':00, when somebody finally gets to make tea.' },
      { kick: 'Second-hand', fig: Math.round(echoes), unit: '%', frac: echoes, head: 'of posts are reacting to another post', text: 'Most of this archive is people answering each other.' },
      { kick: 'Regulars', fig: pct(top, N), unit: '%', frac: pct(top, N), head: 'of posts come from the top tenth of voices', text: 'The same ' + fmt(topN) + ' faces keep turning up.' },
      { kick: 'Deepest rabbit hole', fig: deep, unit: ' hops', head: 'between a post and its furthest echo', text: 'Nobody in that chain remembers how it started.' },
      { kick: 'Babel', fig: langs, unit: ' tongues', head: 'passed through the booth', text: 'One clerk, no phrasebook.' },
      { kick: 'Smudged labels', fig: pct(noLang, N), unit: '%', frac: pct(noLang, N), head: 'of posts arrived with no language tag', text: 'We left them blank rather than guess at the desk.' }
    ], ['#ffb454', '#7df0c3', '#78c8ff', '#ff7f9e', '#b48cff', '#ffd27a', '#62e0c0', '#ff9f73']);
  })();

  /* ------------------ masking booth ------------------ */
  function maskText(s) {
    var c = { email: 0, phone: 0, handle: 0 }, out = esc(s);
    out = out.replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, function () { c.email++; return '<mark>email struck out</mark>'; });
    out = out.replace(/(^|[\s(])@[A-Za-z0-9_]{2,30}/g, function (m, a) { c.handle++; return a + '<mark>voice masked</mark>'; });
    out = out.replace(/(?<!\w)\+?\d[\d .()\/-]{7,}\d(?!\w)/g, function () { c.phone++; return '<mark>number struck out</mark>'; });
    return { html: out, c: c };
  }
  function code(s) { var a = K.hash('murmur:' + s).toString(16), b = K.hash(s + ':flock').toString(16); return 'anon-' + (a + b + '0000000000000000').slice(0, 16); }
  function runMask() {
    var v = $('mask-in').value, r = maskText(v), seen = (v.match(/@[A-Za-z0-9_]{2,30}/) || ['this author'])[0];
    $('mask-out').innerHTML = r.html || '<span style="color:var(--faint)">Nothing to hide yet.</span>';
    $('mask-stats').innerHTML = [['Emails struck', r.c.email], ['Numbers struck', r.c.phone], ['Handles masked', r.c.handle], ['Their code', '<span style="font:13px monospace">' + code(seen) + '</span>']].map(function (x) { return '<div><b>' + x[1] + '</b>' + x[0] + '</div>'; }).join('');
  }
  $('mask-in').addEventListener('input', runMask); runMask();

  /* ------------------ anatomy of a record ------------------ */
  var USES = { post_id: [1, 5], platform: [1, 2, 3, 4, 5], user_id: [1, 3, 5], timestamp: [1, 2, 3, 4, 5], text: [2, 4], interaction: [1, 3, 5], ref_post_id: [1, 2, 5], sentiment: [2, 3, 5], language: [3], followers: [3], joined: [3], user_bio: [3, 5], user_location: [3, 5] };
  var pullRand = K.rngFrom(29);
  function pull(first) {
    var pool = P.filter(function (p) { return p.ref >= 0 && p.tag; }), p = first ? pool[Math.floor(pool.length * .4)] : pool[Math.floor(pullRand() * pool.length)], r = p.raw, sealed = { user_bio: 1, user_location: 1 };
    $('fields').innerHTML = Object.keys(USES).map(function (f) {
      var val = sealed[f] ? '<b class="seal">Sealed</b>' : '<b>' + esc(r[f] || '(blank)') + '</b>';
      return '<div class="field"><span>' + f + '</span>' + val + '<div class="pips" aria-label="Read by chapters ' + USES[f].join(', ') + '">' + ['I', 'II', 'III', 'IV', 'V'].map(function (n, i) { return '<i class="' + (USES[f].indexOf(i + 1) >= 0 ? 'on' : '') + '">' + n + '</i>'; }).join('') + '</div></div>';
    }).join('');
  }
  $('pull').addEventListener('click', function () { pull(false); }); pull(true);

  /* ------------------ ledger + completeness ------------------ */
  $('ledger').innerHTML = '<thead><tr><th>Door</th><th>Posts</th><th>Voices</th><th>Per voice</th><th>Reacting</th></tr></thead><tbody>' + plats.map(function (x) {
    var L = byPlat[x], v = new Set(L.map(function (p) { return p.voice.id; })).size, re = L.filter(function (p) { return p.ref >= 0; }).length;
    return '<tr><td style="color:' + (PAL[x] || '#fff') + '">' + esc(x) + '</td><td>' + fmt(L.length) + '</td><td>' + fmt(v) + '</td><td>' + (L.length / v).toFixed(1) + '</td><td>' + Math.round(pct(re, L.length)) + '%</td></tr>';
  }).join('') + '</tbody>';
  (function () {
    var R = F.rows, want = R.filter(function (r) { return r.interaction && r.interaction !== 'post'; }), have = function (f, list) { return pct((list || R).filter(function (r) { return r[f] && String(r[f]).trim() && !/^not specified$/i.test(r[f]); }).length, (list || R).length); };
    var rows = [['Timestamp', have('timestamp')], ['Author code', have('user_id')], ['Text', have('text')], ['Mood', have('sentiment')], ['Reference (reactions)', have('ref_post_id', want)], ['Language tag', have('language')], ['Bio', have('user_bio')], ['Location', have('user_location')]];
    $('complete').innerHTML = rows.map(function (r) { return '<div class="trow"><span class="name">' + r[0] + '</span><span class="sbar"><i style="width:' + r[1] + '%;background:linear-gradient(90deg,#ffb454,#7df0c3)"></i></span><span class="v">' + r[1] + '%</span></div>'; }).join('');
  })();

  /* ------------------ wall ------------------ */
  (function () {
    var g = {}, mx = 1; P.forEach(function (p) { var k = p.day + ':' + p.hour; g[k] = (g[k] || 0) + 1; if (g[k] > mx) mx = g[k]; });
    var left = 44, top = 8, cw = (1000 - left - 6) / F.days, rh = 12.4, o = '', d, h;
    for (h = 0; h < 24; h++) { if (h % 6 === 0) o += '<text class="t f" x="36" y="' + (top + h * rh + 10) + '" text-anchor="end">' + K.pad2(h) + 'h</text>'; for (d = 0; d < F.days; d++) { var v = g[d + ':' + h] || 0; o += '<rect x="' + (left + d * cw + 1).toFixed(1) + '" y="' + (top + h * rh + 1).toFixed(1) + '" width="' + (cw - 2).toFixed(1) + '" height="' + (rh - 2) + '" rx="2" fill="' + (v ? K.hexA('#ffb454', 0.1 + 0.9 * Math.pow(v / mx, 0.65)) : 'rgba(255,255,255,.03)') + '"><title>' + K.dayName(F.dayStart(d)) + ', ' + K.pad2(h) + ':00 UTC: ' + v + ' posts</title></rect>'; } }
    for (d = 0; d < F.days; d += 5) o += '<text class="t f" x="' + (left + d * cw + cw / 2).toFixed(1) + '" y="' + (top + 24 * rh + 16) + '" text-anchor="middle">' + K.dayName(F.dayStart(d)) + '</text>';
    $('wall').innerHTML = o;
  })();

  /* ------------------ kinds + pile ------------------ */
  $('kinds-l').innerHTML = KIND.map(function (a) { return '<span><i style="background:' + a[2] + '"></i>' + a[1] + '</span>'; }).join('');
  $('kinds').innerHTML = plats.map(function (x) {
    var L = byPlat[x], segs = KIND.map(function (a) { var w = pct(L.filter(function (p) { return p.type === a[0]; }).length, L.length); return '<i style="width:' + w + '%;background:' + a[2] + '" title="' + a[1] + ': ' + w + '%"></i>'; }).join('');
    return '<div class="trow"><span class="name">' + esc(x) + '</span><span class="sbar">' + segs + '</span><span class="v">' + Math.round(pct(L.filter(function (p) { return p.type === 'post'; }).length, L.length)) + '% own</span></div>';
  }).join('');
  (function () {
    var svg = $('pile'), mx = Math.max.apply(null, plats.map(function (x) { return byPlat[x].length; })), X = function (d) { return 40 + d / (F.days - 1) * 470; }, Y = function (v) { return 266 - v / mx * 248; };
    var o = '<line x1="40" x2="510" y1="266" y2="266" stroke="rgba(255,255,255,.12)"/>', ends = [];
    [0, .5, 1].forEach(function (f) { o += '<text class="t f" x="34" y="' + (Y(mx * f) + 4) + '" text-anchor="end">' + fmt(Math.round(mx * f)) + '</text>'; });
    plats.forEach(function (x) { var c = new Array(F.days).fill(0); byPlat[x].forEach(function (p) { c[p.day]++; }); var s = 0, d = c.map(function (v, i) { s += v; return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(s).toFixed(1); }).join(' '); o += '<path d="' + d + '" fill="none" stroke="' + (PAL[x] || '#fff') + '" stroke-width="2"/>'; ends.push({ x: x, y: Y(s) }); });
    ends.sort(function (a, b) { return a.y - b.y; }); var last = -99;
    ends.forEach(function (e) { var y = Math.max(e.y + 4, last + 14); last = y; o += '<text class="t" x="518" y="' + y.toFixed(1) + '" style="fill:' + (PAL[e.x] || '#fff') + '">' + esc(e.x) + '</text>'; });
    [0, 10, 20].forEach(function (d) { o += '<text class="t f" x="' + X(d) + '" y="286" text-anchor="middle">' + K.dayName(F.dayStart(d)) + '</text>'; });
    svg.innerHTML = o;
  })();

  /* ------------------ thread ------------------ */
  function collect(i) { var out = [], st = [i]; while (st.length) { var v = st.pop(); out.push(v); P[v].kids.forEach(function (k) { st.push(k); }); } return out; }
  var roots = P.map(function (p, i) { return p.ref < 0 && p.kids.length ? i : -1; }).filter(function (i) { return i >= 0; }).map(function (i) { return { i: i, list: collect(i) }; }).sort(function (a, b) { return b.list.length - a.list.length; });
  var seenTag = {}, picks = roots.filter(function (r) { var t = P[r.i].tag || 'x' + r.i; if (seenTag[t]) return false; seenTag[t] = 1; return true; }).slice(0, 7);
  var cur = 0;
  $('thread-l').innerHTML = KIND.map(function (a) { return '<span><i style="background:' + a[2] + '"></i>' + a[1] + '</span>'; }).join('');
  function drawPicks() { $('thread-picks').innerHTML = picks.map(function (r, i) { return '<button type="button" class="tagc" data-i="' + i + '" aria-pressed="' + (i === cur) + '">' + esc(P[r.i].tag || 'Untagged thread') + ' &middot; ' + r.list.length + '</button>'; }).join(''); }
  function drawThread() {
    var r = picks[cur], list = r.list, t0 = P[r.i].ts, span = Math.max.apply(null, list.map(function (i) { return P[i].ts - t0; })) || 1, depth = Math.max.apply(null, list.map(function (i) { return P[i].depth; })) || 1;
    var X = function (t) { return 30 + Math.sqrt((t - t0) / span) * 940; }, Y = function (d) { return 26 + d / Math.max(1, depth) * 236; }, C = {}, o = '';
    KIND.forEach(function (a) { C[a[0]] = a[2]; });
    [0.05, .25, .5, 1].forEach(function (f) { var ms = span * f, x = X(t0 + ms); o += '<line x1="' + x + '" x2="' + x + '" y1="16" y2="272" stroke="rgba(255,255,255,.05)"/><text class="t f" x="' + x + '" y="292" text-anchor="middle">+' + (ms / 3600000 < 48 ? Math.round(ms / 3600000) + 'h' : Math.round(ms / 86400000) + 'd') + '</text>'; });
    list.forEach(function (i) { var p = P[i]; if (p.ref < 0) return; var q = P[p.ref], x0 = X(q.ts), y0 = Y(q.depth), x1 = X(p.ts), y1 = Y(p.depth); o += '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'C' + ((x0 + x1) / 2).toFixed(1) + ' ' + y0.toFixed(1) + ' ' + ((x0 + x1) / 2).toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + C[p.type] + '" stroke-opacity=".45"/>'; });
    list.forEach(function (i) { var p = P[i]; o += '<circle cx="' + X(p.ts).toFixed(1) + '" cy="' + Y(p.depth).toFixed(1) + '" r="' + (p.ref < 0 ? 8 : 3.6) + '" fill="' + C[p.type] + '"><title>' + esc(p.type) + ' on ' + esc(p.platform) + ', ' + K.dayName(p.ts) + '</title></circle>'; });
    $('thread').innerHTML = o;
    var pl = new Set(list.map(function (i) { return P[i].platform; })).size, v = new Set(list.map(function (i) { return P[i].voice.id; })).size;
    $('thread-stats').innerHTML = [['Posts', list.length], ['Voices', v], ['Doors', pl], ['Hops deep', depth], ['Lasted', span / 86400000 >= 1 ? (span / 86400000).toFixed(1) + ' days' : Math.round(span / 3600000) + ' hours']].map(function (x) { return '<div><b>' + x[1] + '</b>' + x[0] + '</div>'; }).join('');
  }
  $('thread-picks').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (!b) return; cur = Number(b.getAttribute('data-i')); drawPicks(); drawThread(); });
  drawPicks(); drawThread();

  /* start */
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { S.onscreen = en[0].isIntersecting; }).observe($('sky'));
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('sky')); else window.addEventListener('resize', resize);
  resize(); setPlay(); read();
  if (K.reduce) { S.t = 1; $('time').value = 1000; reset(); read(); } else { reset(); setTimeout(function () { S.playing = true; S.last = performance.now(); setPlay(); }, 500); }
  requestAnimationFrame(frame);
  window.__listen = S;
})();
