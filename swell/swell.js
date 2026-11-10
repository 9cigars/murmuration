/* Chapter IV: The Swell. */
(function () {
  'use strict';
  var K = window.Kit, $ = K.$, esc = K.esc, fmt = K.fmt, pct = K.pct, F = K.loadFeed();
  $('rail').outerHTML = K.rail('swell');
  var T = F.tags, P = F.posts, BT = K.backtest(F), PAL = ['#ff9270', '#59d5ff', '#ffd27a', '#7be08a', '#b48cff', '#ff7f9e', '#62e0c0', '#ec83e0', '#d3e070', '#8da2ff', '#f7a6c4', '#6fd6e8'];
  var PLAT = K.fillPalette({ X: '#59d5ff', Telegram: '#62e0c0', Instagram: '#ec83e0', Facebook: '#8da2ff', YouTube: '#ff7f9e', Reddit: '#ff9270' }, F.platforms);
  var START = Math.max(3, Math.min(11, F.days - 1)), S = { day: START, sel: null, mode: 'time', playing: false, last: 0, stepAt: 0, W: 0, H: 0, ctx: null, game: null, you: 0, bot: 0, rounds: 0, phase: 0, onscreen: true };
  $('meta').textContent = fmt(P.length) + ' posts · ' + T.length + ' trends · ' + (window.MURMUR_UPLOAD ? 'cleaned at the door' : 'data/audience_sample.csv');

  function crest(t) { var m = Math.max.apply(null, t.daily); return { h: m, d: t.daily.indexOf(m) }; }
  function firstDay(t) { return t.daily.findIndex(function (v) { return v > 0; }); }
  var fastest = T.map(function (t) { return { t: t, rise: crest(t).d - firstDay(t), c: crest(t) }; }).filter(function (x) { return x.t.n >= Math.min(30, T[0].n); }).sort(function (a, b) { return a.rise - b.rise || b.c.h - a.c.h; })[0];
  $('k-n').textContent = T.length; $('k-n-s').textContent = fmt(T.reduce(function (s, t) { return s + t.n; }, 0)) + ' posts riding them';
  $('k-b').textContent = T[0].tag; $('k-b-s').textContent = fmt(T[0].n) + ' posts, ' + T[0].voices + ' voices';
  $('k-f').textContent = fastest.t.tag; $('k-f-s').textContent = fastest.rise ? 'crested in ' + fastest.rise + ' day' + (fastest.rise === 1 ? '' : 's') : 'crested on its very first day';
  $('k-h').textContent = BT.topHit + '%'; $('k-h-s').textContent = 'picks the top wave; luck gets ' + BT.chance + '%';

  /* ------------------ sea ------------------ */
  function resize() { var f = K.fitCanvas($('sea'), $('sea').parentElement.classList.contains('hasboard') && window.innerWidth <= 860 ? $('sea') : $('sky')); S.ctx = f.ctx; S.W = f.W; S.H = f.H; }
  function area() { var wide = window.innerWidth > 860; return { x0: wide ? 124 : 96, x1: S.W - (wide ? 296 : 16), y0: 66, y1: S.H - 26 }; }
  function smoothVal(a, x) { var i = Math.floor(x), f = x - i, v0 = a[i] || 0, v1 = a[i + 1] || 0, u = f * f * (3 - 2 * f); return v0 + (v1 - v0) * u; }
  function draw(now) {
    var c = S.ctx, A = area(), W = S.W, H = S.H, n = T.length, rowH = (A.y1 - A.y0) / n, mx = Math.max.apply(null, T.map(function (t) { return crest(t).h; })), cw = (A.x1 - A.x0) / (F.days - 1), nowDay = S.day + 1 >= F.days ? F.days - 1 : S.day, reveal = S.mode === 'game' && S.game && S.game.done;
    c.clearRect(0, 0, W, H);
    var X = function (d) { return A.x0 + d * cw; };
    // fog on the future
    c.fillStyle = 'rgba(8,16,36,.45)'; if (S.mode === 'time' || !reveal) c.fillRect(X(nowDay), 0, A.x1 - X(nowDay) + 2, H);
    T.forEach(function (t, r) {
      var base = A.y0 + rowH * (r + 1), amp = rowH * 1.9, col = PAL[r % PAL.length], on = S.sel === t.tag, dim = S.sel && !on, upto = reveal ? F.days - 1 : nowDay, wob = K.reduce ? 0 : Math.sin(now / 900 + r) * 1.2;
      c.strokeStyle = 'rgba(255,255,255,.05)'; c.beginPath(); c.moveTo(A.x0, base); c.lineTo(A.x1, base); c.stroke();
      c.font = on ? 'italic 15px Fraunces, Georgia, serif' : 'italic 13px Fraunces, Georgia, serif'; c.textAlign = 'right'; c.fillStyle = dim ? 'rgba(238,241,248,.3)' : '#eef1f8'; c.fillText(t.tag, A.x0 - 8, base - 2);
      var grd = c.createLinearGradient(0, base - amp, 0, base); grd.addColorStop(0, K.hexA(col, dim ? .18 : .95)); grd.addColorStop(1, K.hexA(col, dim ? .02 : .16));
      c.beginPath(); c.moveTo(X(0), base);
      for (var x = 0; x <= upto; x += .25) { var v = smoothVal(t.daily, Math.min(x, F.days - 1)); c.lineTo(X(x), base - (Math.sqrt(v / mx) * amp) - (v > 0 ? wob : 0)); }
      c.lineTo(X(upto), base); c.closePath(); c.fillStyle = grd; c.fill();
      c.strokeStyle = K.hexA(col, dim ? .25 : 1); c.lineWidth = on ? 2 : 1.3; c.beginPath();
      for (var x2 = 0; x2 <= upto; x2 += .25) { var v2 = smoothVal(t.daily, Math.min(x2, F.days - 1)), yy = base - Math.sqrt(v2 / mx) * amp - (v2 > 0 ? wob : 0); if (x2) c.lineTo(X(x2), yy); else c.moveTo(X(x2), yy); }
      c.stroke(); c.lineWidth = 1;
      // the forecast
      if (S.mode === 'time' && nowDay < F.days - 1 && K.pulse(t.daily, nowDay).started) {
        var f = K.holt(t.daily, nowDay, 3); c.setLineDash([4, 4]); c.strokeStyle = K.hexA(col, dim ? .2 : .8); c.beginPath(); c.moveTo(X(nowDay), base - Math.sqrt(t.daily[nowDay] / mx) * amp);
        f.forEach(function (v3, i) { if (nowDay + i + 1 < F.days) c.lineTo(X(nowDay + i + 1), base - Math.sqrt(v3 / mx) * amp); }); c.stroke(); c.setLineDash([]);
      }
    });
    if (!reveal) { c.strokeStyle = '#ff9270'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(nowDay), 12); c.lineTo(X(nowDay), H - 18); c.stroke(); c.lineWidth = 1; c.fillStyle = '#ff9270'; c.font = '600 12px Manrope, sans-serif'; c.textAlign = 'center'; c.fillText(K.dayName(F.dayStart(nowDay)), X(nowDay), 20); }
    c.fillStyle = '#6e778c'; c.font = '11px Manrope, sans-serif'; c.textAlign = 'center';
    K.ticks(F.days, 5).forEach(function (d) { c.fillText(K.dayName(F.dayStart(d)), X(d), H - 8); });
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!S.ctx || !S.onscreen) return;
    if (S.playing && now - S.stepAt > 620) { S.stepAt = now; if (S.day >= F.days - 1) { S.playing = false; playUI(); } else setDay(S.day + 1); }
    draw(now);
  }
  function playUI() { var b = $('play'); if (b) { b.innerHTML = S.playing ? K.PAUSE : K.PLAY; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); } }

  function ranked(d) { return T.map(function (t) { var p = K.pulse(t.daily, d), f = K.holt(t.daily, d, 3); return { t: t, p: p, next: f[0] + f[1] + f[2] }; }).filter(function (x) { return x.p.started; }); }
  function board() {
    var host = $('board');
    if (S.mode === 'game') { renderGameBoard(); return; }
    var list = ranked(S.day).filter(function (x) { return x.p.recent > 0 || x.p.before > 0; }).sort(function (a, b) { return b.p.velocity - a.p.velocity; }).slice(0, 8);
    host.innerHTML = '<h4>Morning of ' + K.dayName(F.dayStart(S.day)) + '</h4><small>Known so far, ranked by momentum</small>' + (list.length ? list.map(function (x, i) { var up = x.p.velocity >= 0; return '<button type="button" class="rk ' + (up ? 'up' : 'down') + (S.sel === x.t.tag ? ' on' : '') + '" data-t="' + esc(x.t.tag) + '"><i>' + (i + 1) + '</i><b>' + esc(x.t.tag) + '</b><span>' + (up ? '+' : '') + x.p.velocity + '</span></button>'; }).join('') : '<div class="empty">Flat calm. Nothing on the water yet.</div>') + detail();
  }
  function detail() {
    if (!S.sel) return '<small style="margin-top:auto">Numbers are posts in the last 3 days against the 3 before. Tap a wave.</small>';
    var t = T.filter(function (x) { return x.tag === S.sel; })[0], p = K.pulse(t.daily, S.day), f = K.holt(t.daily, S.day, 3), pred = Math.round(f[0] + f[1] + f[2]), act = K.sumRange(t.daily, S.day + 1, S.day + 3), enc = encodeURIComponent(t.tag);
    return '<div style="margin-top:auto;font-size:12px;color:var(--muted)">' + (p.started ? 'Forecast next 3 days: <b style="color:var(--ink)">' + pred + '</b>. Actually: <b style="color:var(--ink)">' + act + '</b>.' : 'Not born yet.') + '<div style="display:flex;gap:10px;margin-top:5px"><a href="#" style="color:var(--a)" data-drill="' + K.q({ tag: t.tag }) + '">Read it</a><a style="color:var(--a)" href="../grapevine/index.html#tag=' + enc + '">Trace it</a><a style="color:var(--a)" href="../atlas/index.html#tag=' + enc + '">Who wore it</a></div></div>';
  }
  $('board').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-t]'); if (!b) return;
    var v = b.getAttribute('data-t');
    if (S.mode === 'game') { if (!S.game.done) guess(v); return; }
    S.sel = S.sel === v ? null : v; board();
  });
  function setDay(d) { S.day = d; var r = $('range'); if (r) r.value = d; var dl = $('read'); if (dl) dl.innerHTML = '<b>' + K.dayName(F.dayStart(d)) + '</b><br>day ' + (d + 1) + ' of ' + F.days; board(); momentum(); }

  /* tools */
  function toolTime() {
    $('hint').textContent = 'Dashed lines are the forecast. The fog hides what nobody knew yet.';
    $('tool').innerHTML = '<div class="timebar"><button type="button" class="play" id="play" aria-label="Play"></button><div class="scrub"><svg id="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"></svg><input type="range" id="range" min="3" max="' + (F.days - 1) + '" value="' + S.day + '" aria-label="Pick a morning"></div><div class="read" id="read"></div></div>';
    var tot = new Array(F.days).fill(0); T.forEach(function (t) { t.daily.forEach(function (v, i) { tot[i] += v; }); }); K.spark($('spark'), tot, '#ff9270');
    window.Loupe.scrub($('range').parentElement, function (f) { var d = Math.round(3 + f * (F.days - 4)); return 'Morning of ' + K.dayName(F.dayStart(d)) + '\nDrag here to stand on that day'; });
    $('range').addEventListener('input', function () { S.playing = false; playUI(); setDay(Number(this.value)); });
    $('play').addEventListener('click', function () { if (S.day >= F.days - 1) setDay(3); S.playing = !S.playing; S.stepAt = 0; playUI(); });
    playUI(); setDay(S.day);
  }
  var rng = K.rngFrom(77);
  function gameDays() { var o = []; for (var d = 3; d <= F.days - 4; d++) { var live = ranked(d).filter(function (x) { return x.p.recent > 0; }).length, fut = T.filter(function (t) { return K.sumRange(t.daily, d + 1, d + 3) >= 5; }).length; if (live >= 2 && fut >= 1) o.push(d); } return o; }
  var GD = gameDays(); if (!GD.length) { var gb = document.querySelector('#mode button[data-v="game"]'); if (gb) gb.hidden = true; }
  function newRound() { var d = GD[Math.floor(rng() * GD.length)]; S.day = d; S.sel = null; S.game = { day: d, list: ranked(d).filter(function (x) { return x.p.recent > 0 || x.next > 1; }), done: false }; renderGameBoard(); toolGameBar(); }
  function guess(tag) {
    var g = S.game, res = T.map(function (t) { return { t: t.tag, a: K.sumRange(t.daily, g.day + 1, g.day + 3) }; }).sort(function (a, b) { return b.a - a.a; }), best = res[0].a;
    var botPick = g.list.slice().sort(function (a, b) { return b.next - a.next; })[0].t.tag, scoreOf = function (x) { var r = res.filter(function (y) { return y.t === x; })[0]; return r ? r.a : 0; };
    g.done = true; g.pick = tag; g.bot = botPick; g.res = res; g.youA = scoreOf(tag); g.botA = scoreOf(botPick);
    if (g.youA === best) S.you++; if (g.botA === best) S.bot++; S.rounds++;
    renderGameBoard(); toolGameBar();
  }
  function renderGameBoard() {
    var g = S.game, host = $('board'); if (!g) return;
    if (!g.done) { host.innerHTML = '<h4>Morning of ' + K.dayName(F.dayStart(g.day)) + '</h4><small>Which gets the most posts in the next 3 days?</small>' + g.list.slice(0, 8).map(function (x) { return '<button type="button" class="rk" data-t="' + esc(x.t.tag) + '"><i>?</i><b>' + esc(x.t.tag) + '</b><span>' + x.p.recent + ' lately</span></button>'; }).join(''); return; }
    host.innerHTML = '<h4>The water answers</h4><small>Posts over the next 3 days</small>' + g.res.slice(0, 6).map(function (r, i) { var marks = (r.t === g.pick ? ' you' : '') + (r.t === g.bot ? ' bot' : ''); return '<div class="rk' + (i === 0 ? ' up' : '') + '"><i>' + (i + 1) + '</i><b>' + esc(r.t) + '</b><span>' + r.a + esc(marks) + '</span></div>'; }).join('');
  }
  function toolGameBar() {
    var g = S.game;
    $('hint').textContent = g && g.done ? (g.youA >= g.botA ? (g.youA === g.botA ? 'A draw. Neither of you got wet.' : 'You read the water better. The forecaster is sulking.') : 'The forecaster took that one. It is insufferable about it.') : 'Pick on the panel. You see only what was known that morning.';
    $('tool').innerHTML = '<div class="row-t"><div class="score"><span><b>' + S.you + '</b>you</span><span><b>' + S.bot + '</b>forecaster</span><span><b>' + S.rounds + '</b>rounds</span></div><button type="button" class="btn go" id="next">' + (g && g.done ? 'Next morning' : 'Skip this one') + '</button></div>';
    $('next').addEventListener('click', newRound);
  }
  K.bindTabs('mode', function (v) { S.mode = v; S.playing = false; if (v === 'game') { S.sel = null; newRound(); } else { S.game = null; S.day = START; toolTime(); } });
  function waveAt(e) { var r = $('sky').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, A = area(), row = Math.floor((y - A.y0) / ((A.y1 - A.y0) / T.length)), cw = (A.x1 - A.x0) / (F.days - 1), d = Math.round((x - A.x0) / cw); if (row < 0 || row >= T.length || x > A.x1 + cw / 2) return null; return { t: T[row], d: x < A.x0 ? -1 : Math.max(0, Math.min(F.days - 1, d)) }; }
  $('sea').addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var h = waveAt(e), L = window.Loupe; $('sea').style.cursor = h ? 'pointer' : ''; if (!h) { L.tipOff(); return; } var seen = S.mode === 'game' && S.game && S.game.done, fog = h.d > S.day && !seen; if (h.d < 0) L.tipAt(e.clientX, e.clientY, h.t.tag + '\n' + fmt(h.t.n) + ' posts from ' + fmt(h.t.voices) + ' voices', S.mode === 'game' ? '' : 'Click to pick this wave'); else if (fog) L.tipAt(e.clientX, e.clientY, h.t.tag + ', ' + K.dayName(F.dayStart(h.d)) + '\nStill in the fog. Nobody knows yet.'); else L.tipAt(e.clientX, e.clientY, h.t.tag + ', ' + K.dayName(F.dayStart(h.d)) + '\n' + h.t.daily[h.d] + ' posts', S.mode === 'game' ? '' : 'Click to pick this wave'); });
  $('sea').addEventListener('pointerleave', function () { window.Loupe.tipOff(); });
  $('sea').addEventListener('click', function (e) { if (S.mode === 'game') return; var h = waveAt(e); if (h) { S.sel = S.sel === h.t.tag ? null : h.t.tag; board(); } });

  /* ------------------ notes ------------------ */
  (function () {
    var byDay = new Array(F.days).fill(0); T.forEach(function (t) { t.daily.forEach(function (v, i) { byDay[i] += v; }); });
    var busy = byDay.indexOf(Math.max.apply(null, byDay)), wide = T.slice().sort(function (a, b) { return b.voices - a.voices; })[0], plats = T.slice().sort(function (a, b) { return Object.keys(b.firstBy).length - Object.keys(a.firstBy).length || b.n - a.n; })[0], onTrend = T.reduce(function (s, t) { return s + t.n; }, 0);
    var firsts = {}; T.forEach(function (t) { var o = Object.keys(t.firstBy).sort(function (a, b) { return t.firstBy[a] - t.firstBy[b]; })[0]; firsts[o] = (firsts[o] || 0) + 1; }); var first = Object.keys(firsts).sort(function (a, b) { return firsts[b] - firsts[a]; })[0];
    var last = T.slice().sort(function (a, b) { return b.posts[b.n - 1].ts - a.posts[a.n - 1].ts; })[0];
    K.notes($('notes'), [
      { kick: 'On the wave', fig: pct(onTrend, P.length), unit: '%', frac: pct(onTrend, P.length), head: 'of all posts are riding a trend', text: 'The rest are just out for a paddle.' },
      { kick: 'Big day', fig: fmt(byDay[busy]), unit: ' posts', head: 'on trends on ' + K.dayName(F.dayStart(busy)), text: 'Lifeguards were notified.', q: K.q({ day: busy }) },
      { kick: 'Widest crowd', fig: wide.voices, unit: ' voices', head: 'piled onto ' + wide.tag, text: 'That is ' + pct(wide.voices, F.voices.size) + '% of everyone on file.', q: K.q({ tag: wide.tag }) },
      { kick: 'Tallest crest', fig: crest(T[0]).h, unit: ' posts', head: 'in a day for ' + T[0].tag, text: 'Peaked on ' + K.dayName(F.dayStart(crest(T[0]).d)) + ', and everyone said they saw it coming.', q: K.q({ tag: T[0].tag, day: crest(T[0]).d }) },
      { kick: 'Crossed the most water', fig: Object.keys(plats.firstBy).length, unit: ' platforms', head: 'carried ' + plats.tag, text: 'It went everywhere and apologised to nobody.', q: K.q({ tag: plats.tag }) },
      { kick: 'First to hear', fig: firsts[first], unit: ' waves', head: 'broke first on ' + first, text: 'Everyone else read about it there.' },
      { kick: 'Alarm bell', fig: Math.round(BT.precision), unit: '%', frac: BT.precision, head: 'of surge alarms were followed by a real wave', text: BT.picks + ' alarms raised, ' + BT.right + ' earned.' },
      { kick: 'Still in the water', fig: K.dayName(last.posts[last.n - 1].ts), unit: '', head: last.tag + ' was the last wave still moving', text: 'Everyone else had gone in for dinner.', q: K.q({ tag: last.tag }) }
    ], ['#ff9270', '#59d5ff', '#ffd27a', '#7be08a', '#b48cff', '#ff7f9e', '#62e0c0', '#ec83e0']);
  })();

  /* ------------------ plates ------------------ */
  function momentum() {
    var list = ranked(S.day), svg = $('mm'), X0 = 56, X1 = 600, Y0 = 22, Y1 = 300, mxT = Math.max(10, Math.max.apply(null, T.map(function (t) { return t.n; }))), mxV = 10;
    list.forEach(function (x) { mxV = Math.max(mxV, Math.abs(x.p.velocity)); });
    var X = function (v) { return X0 + Math.sqrt(v / mxT) * (X1 - X0); }, Y = function (v) { return (Y0 + Y1) / 2 - v / mxV * (Y1 - Y0) / 2; }, o = '';
    o += '<line x1="' + X0 + '" x2="' + X1 + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="rgba(255,255,255,.15)"/><line x1="' + X0 + '" x2="' + X0 + '" y1="' + Y0 + '" y2="' + Y1 + '" stroke="rgba(255,255,255,.1)"/>';
    o += '<text class="t f" x="' + X1 + '" y="' + (Y0 + 8) + '" text-anchor="end">building</text><text class="t f" x="' + X1 + '" y="' + (Y1 - 4) + '" text-anchor="end">breaking</text><text class="t f" x="328" y="332" text-anchor="middle">posts so far</text><text class="t f" transform="translate(16 160) rotate(-90)" text-anchor="middle">momentum</text>';
    list.forEach(function (x) { var i = T.indexOf(x.t), r = 5 + 20 * Math.sqrt(x.t.voices / T[0].voices) * Math.min(1, x.p.total / x.t.n + .25), cx = X(x.p.total), cy = Y(x.p.velocity); o += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + PAL[i % PAL.length] + '" fill-opacity=".75" data-drill="' + K.q({ tag: x.t.tag }) + '"><title>' + esc(x.t.tag) + '\n' + x.p.total + ' posts so far, momentum ' + (x.p.velocity > 0 ? '+' : '') + x.p.velocity + '</title></circle>'; if (Math.abs(x.p.velocity) >= 5) o += '<text class="t b" x="' + cx.toFixed(1) + '" y="' + (cy - r - 4).toFixed(1) + '" text-anchor="middle" style="font-size:11px">' + esc(x.t.tag) + '</text>'; });
    svg.innerHTML = o; $('mm-tag').textContent = K.dayName(F.dayStart(S.day));
  }
  (function () {
    $('big3').innerHTML = '<div><b>' + BT.topHit + '%</b>named the top wave<em>luck manages ' + BT.chance + '%</em></div><div><b>' + BT.precision + '%</b>of alarms came true<em>' + BT.right + ' of ' + BT.picks + '</em></div><div><b>' + BT.modelMae.toFixed(1) + '</b>posts off, typically<em>over ' + fmt(BT.checks) + ' guesses</em></div>';
    var mx = Math.max(BT.modelMae, BT.naiveMae) * 1.05, row = function (y, label, v, col) { return '<text class="t" x="0" y="' + (y + 14) + '">' + label + '</text><rect x="150" y="' + y + '" width="' + (420 * v / mx).toFixed(1) + '" height="20" rx="5" fill="' + col + '"><title>' + label + '\nOff by ' + v.toFixed(1) + ' posts on average, over the next 3 days</title></rect><text class="t b" x="' + (158 + 420 * v / mx).toFixed(1) + '" y="' + (y + 15) + '">' + v.toFixed(1) + '</text>'; };
    $('errs').innerHTML = row(16, 'The forecaster', BT.modelMae, '#ff9270') + row(52, 'Assume no change', BT.naiveMae, '#6e778c') + '<text class="t f" x="150" y="100">average miss, in posts over three days (lower is better)</text>';
    var mxC = Math.max.apply(null, T.map(function (t) { return crest(t).h; })), host = $('tide');
    host.style.gridTemplateColumns = '124px repeat(' + F.days + ',minmax(0,1fr))';
    host.innerHTML = T.map(function (t, r) { return '<div class="l">' + esc(t.tag) + '</div>' + t.daily.map(function (v, d) { return '<div class="c"' + (v ? ' data-drill="' + K.q({ tag: t.tag, day: d }) + '"' : '') + ' title="' + esc(t.tag) + ', ' + K.dayName(F.dayStart(d)) + ': ' + v + ' posts"' + (v ? ' style="background:' + K.hexA(PAL[r % PAL.length], .14 + .86 * Math.pow(v / mxC, .6)) + '"' : '') + '></div>'; }).join(''); }).join('');
    $('anat').innerHTML = '<thead><tr><th>Wave</th><th>Rise</th><th>Crest</th><th>Afterlife</th><th>Posts</th></tr></thead><tbody>' + T.map(function (t) { var c = crest(t), f = firstDay(t), after = 0; for (var d = c.d + 1; d < F.days; d++) if (t.daily[d] >= c.h / 5) after = d - c.d; return '<tr data-drill="' + K.q({ tag: t.tag }) + '" tabindex="0" role="button" data-tip="' + esc(t.tag) + '"><td>' + esc(t.tag) + '</td><td>' + (c.d - f) + 'd</td><td>' + c.h + '</td><td>' + after + 'd</td><td>' + t.n + '</td></tr>'; }).join('') + '</tbody>';
    var svg = $('first'), mxD = 1, rows = T.slice(0, 10).map(function (t) { var t0 = Math.min.apply(null, Object.keys(t.firstBy).map(function (p) { return t.firstBy[p]; })); return { t: t, d: Object.keys(t.firstBy).map(function (p) { var x = (t.firstBy[p] - t0) / K.DAY; if (x > mxD) mxD = x; return { p: p, x: x }; }) }; });
    var X = function (d) { return 126 + d / mxD * 470; }, o = '';
    rows.forEach(function (r, i) { var y = 22 + i * 30; o += '<text class="t d" x="116" y="' + (y + 4) + '" text-anchor="end" style="font-size:13px">' + esc(r.t.tag) + '</text><line x1="126" x2="596" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,.06)"/>'; r.d.forEach(function (q) { o += '<circle cx="' + X(q.x).toFixed(1) + '" cy="' + y + '" r="6" fill="' + (PLAT[q.p] || '#fff') + '" fill-opacity=".85" data-drill="' + K.q({ tag: r.t.tag, platform: q.p }) + '"><title>' + esc(r.t.tag) + ' reached ' + esc(q.p) + '\n' + (q.x < .05 ? 'first' : q.x.toFixed(1) + ' days after it began') + '</title></circle>'; }); });
    [0, Math.round(mxD / 2), Math.round(mxD)].forEach(function (d) { o += '<text class="t f" x="' + X(d) + '" y="326" text-anchor="middle">+' + d + 'd</text>'; });
    svg.innerHTML = o;
    $('first-l').innerHTML = Object.keys(PLAT).map(function (p) { return '<span><i style="background:' + PLAT[p] + '"></i>' + esc(p) + '</span>'; }).join('');

    var STOP = {}; 'the this that with for and but not are was were been have has had you your our its from about into than then they them more most very just what when how who why will would could should does did can new first proper real update before after still been there here looks feels'.split(' ').forEach(function (w) { STOP[w] = 1; });
    var mid = Math.floor(F.days / 2), A = {}, B = {}, nA = 0, nB = 0;
    P.forEach(function (p) { if (p.type === 'repost' || (p.lang && p.lang !== 'en')) return; var isB = p.day >= mid; if (isB) nB++; else nA++; var seen = {}; (p.text.replace(/#\w+/g, '').toLowerCase().match(/[a-z]{4,}/g) || []).forEach(function (w) { if (STOP[w] || seen[w]) return; seen[w] = 1; if (isB) B[w] = (B[w] || 0) + 1; else A[w] = (A[w] || 0) + 1; }); });
    var words = Object.keys(Object.assign({}, A, B)).filter(function (w) { return (A[w] || 0) + (B[w] || 0) >= 15; }).map(function (w) { var a = 1000 * (A[w] || 0) / nA, b = 1000 * (B[w] || 0) / nB; return { w: w, d: b - a }; }).sort(function (x, y) { return y.d - x.d; }), show = words.slice(0, 5).concat(words.slice(-5)), mxW = Math.max.apply(null, show.map(function (x) { return Math.abs(x.d); })) || 1;
    $('words').innerHTML = show.map(function (x) { return '<div class="trow" data-drill="' + K.q({ word: x.w }) + '" data-tip="' + esc(x.w) + '\n' + (x.d > 0 ? '+' : '') + x.d.toFixed(0) + ' per 1,000 posts, second half against first"><span class="name" style="font:italic 15px var(--display)">' + esc(x.w) + '</span><span style="display:grid;grid-template-columns:1fr 1fr"><span style="display:flex;justify-content:flex-end">' + (x.d < 0 ? '<i style="display:block;height:12px;border-radius:3px 0 0 3px;background:#ff7f9e;width:' + (100 * -x.d / mxW).toFixed(0) + '%"></i>' : '') + '</span><span>' + (x.d > 0 ? '<i style="display:block;height:12px;border-radius:0 3px 3px 0;background:#7be08a;width:' + (100 * x.d / mxW).toFixed(0) + '%"></i>' : '') + '</span></span><span class="v">' + (x.d > 0 ? '+' : '') + x.d.toFixed(0) + '</span></div>'; }).join('');

    var KIND = [['post', 'Original', '#ff9270'], ['reply', 'Reply', '#7be08a'], ['quote', 'Quote', '#b48cff'], ['repost', 'Repost', '#59d5ff'], ['share', 'Crossing', '#ffd27a']];
    $('car-l').innerHTML = KIND.map(function (a) { return '<span><i style="background:' + a[2] + '"></i>' + a[1] + '</span>'; }).join('');
    $('carry').innerHTML = T.map(function (t) { var rp = pct(t.posts.filter(function (p) { return p.type === 'repost'; }).length, t.n); return '<div class="trow"><span class="name" style="font:italic 15px var(--display)">' + esc(t.tag) + '</span><span class="sbar">' + KIND.map(function (a) { var w = pct(t.posts.filter(function (p) { return p.type === a[0]; }).length, t.n); return '<i data-drill="' + K.q({ tag: t.tag, type: a[0] }) + '" style="width:' + w + '%;background:' + a[2] + '" title="' + a[1] + ': ' + w + '%"></i>'; }).join('') + '</span><span class="v">' + Math.round(rp) + '% passed</span></div>'; }).join('');
  })();

  /* start */
  var hm = /tag=([^&]+)/.exec(location.hash), wanted = hm ? decodeURIComponent(hm[1]) : null, match = T.filter(function (t) { return t.tag === wanted; })[0];
  if (match) { S.sel = match.tag; S.day = Math.min(F.days - 1, Math.max(3, crest(match).d)); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { S.onscreen = en[0].isIntersecting; }).observe($('sky'));
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('sky')); else window.addEventListener('resize', resize);
  resize(); toolTime(); requestAnimationFrame(frame);
  window.__swell = S;
})();
