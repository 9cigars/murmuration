/* Murmuration kit: the shared data feed and the small helpers every new chapter uses.
 * Runs in the browser and in Node, so tools/verify_data.js checks the same numbers visitors see. */
(function (root) {
  'use strict';
  var Prof = root.Profiler || (typeof require !== 'undefined' ? require('./profiler.js') : null);
  var K_MIN = 5, DAY = 86400000, MOOD = { positive: 1, neutral: 0, negative: -1 };

  function pct(n, d) { return d ? Math.round(1000 * n / d) / 10 : 0; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function hash(s) { var h = 2166136261, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) { var s = seed | 0; return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var CLOCK = { bucket: DAY, pseudo: false, base: 0 };
  function dayName(ms) {
    var d = new Date(ms).toUTCString(), s = d.slice(5, 11).replace(/^0/, '');
    if (CLOCK.pseudo) return 'Stretch ' + (Math.floor((ms - CLOCK.base) / DAY) + 1);
    if (CLOCK.bucket < DAY) return s + ', ' + d.slice(17, 22);
    if (CLOCK.bucket >= 7 * DAY) return s + " '" + d.slice(14, 16);
    return s;
  }
  function deg(v) { var x = Math.round(v * 40); return (x > 0 ? '+' : '') + x + '°'; }
  function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&amp;'); }
  function ticks(days, n) { var o = [], i; n = Math.min(n || 5, days); for (i = 0; i < n; i++) o.push(n === 1 ? 0 : Math.round(i * (days - 1) / (n - 1))); return o; }
  var TINTS = ['#78c8ff', '#7df0c3', '#ec83e0', '#8da2ff', '#ff7f9e', '#ffb454', '#d3e070', '#b48cff', '#62e0c0', '#ff9f73'];
  function fillPalette(pal, names) { names.forEach(function (n, i) { if (!pal[n]) pal[n] = TINTS[i % TINTS.length]; }); return pal; }
  function human(ms) { var h = ms / 3600000, n; if (h < 1) { n = Math.round(ms / 60000); return n + ' minute' + (n === 1 ? '' : 's'); } if (h < 48) { n = Math.round(h); return n + ' hour' + (n === 1 ? '' : 's'); } var d = h / 24; if (d < 14) { n = Math.round(d); return n + ' day' + (n === 1 ? '' : 's'); } if (d < 70) { n = Math.round(d / 7); return n + ' week' + (n === 1 ? '' : 's'); } if (d < 700) { n = Math.round(d / 30.4); return n + ' months'; } return Math.round(d / 365.25) + ' years'; }
  function spanText(F) { return F.pseudo ? 'one sequence' : F.bucket === DAY ? F.days + ' days' : human(F.tMax - F.tMin); }
  function unitNote(F) { return F.pseudo ? 'This file has no usable dates, so "days" on the charts are stretches of the file in row order.' : F.bucket === DAY ? '' : 'One "day" on the charts is ' + human(F.bucket) + ', so the whole file fits.'; }

  /* ---------------------------------- emotions ---------------------------------- */
  // Transparent wording rules, first match wins. They read all the languages in the flock.
  var EMOTION_RULES = [
    ['Sarcasm', /rarer than it should|not great/i],
    ['Opposition', /disappoint|decepcion|d[eé]cevant|entt[aä]usch|delud|مخيبة|निराश|bekaar|muy mal|not what was promised/i],
    ['Anxiety', /not sure|rushed|unclear|faltan|faltam|flou|unklar|non [eè] chiaro|غير واضح|belum jelas|haijulikani|net de[gğ]il|niejasna|oklart|不清楚|気になります|궁금|clear nahi|no est[aá] claro|thoda high|ज़्यादा|বেশি|அதிகம்|زیادہ|lenta|lente|dauerte/i],
    ['Curiosity', /\?|؟|wait karte|waiting for|quiero ver|chahiye/i],
    ['Support', /helpful|quick|r[aá]pid|freundlich|مدد|سريعة|haraka|सपोर्ट|ayud|atendimento/i],
    ['Excitement', /useful|lovely|\bnice\b|does what it says|gostei|me gusta|bonito|bello|soign|sch[oö]nes|उपयोगी|অ?কাজের|مفيد|مفید|素敵|마음에|好看|bagus|maganda|g[uü]zel|great launch|mast hai|பயனுள்ள|berguna|kapaki|faydal/i]
  ];
  var EMOTIONS = ['Excitement', 'Support', 'Curiosity', 'Anxiety', 'Opposition', 'Sarcasm', 'Plain'];
  function emotionOf(text) {
    var t = String(text || '');
    for (var i = 0; i < EMOTION_RULES.length; i++) if (EMOTION_RULES[i][1].test(t)) return EMOTION_RULES[i][0];
    return 'Plain';
  }

  /* The barometer: a small reader for any sentence somebody types. */
  var WARM = 'love loved lovely great good nice useful helpful quick amazing brilliant excellent happy glad enjoy works fast fair beautiful perfect best impressive fantastic wonderful thanks solid smooth'.split(' ');
  var SOUR = 'hate hated awful terrible bad broken slow rushed disappointed disappointing worst useless refund scam overpriced expensive annoying angry poor buggy fail failed failure waste ugly lies missing'.split(' ');
  var UNEASY = 'worried worry unsure afraid nervous concerned unclear confusing risky scared doubt'.split(' ');
  var UP = { very: 1.5, really: 1.5, so: 1.3, extremely: 2, absolutely: 1.8, totally: 1.4 };
  var NOT = { not: 1, never: 1, no: 1, nothing: 1, "can't": 1, "isn't": 1, "wasn't": 1, "don't": 1, "doesn't": 1, hardly: 1 };
  function readSentence(text) {
    var words = String(text || '').toLowerCase().match(/[\p{L}\p{N}'’]+/gu) || [], score = 0, hits = [], unease = 0;
    words.forEach(function (w, i) {
      var v = WARM.indexOf(w) >= 0 ? 1 : SOUR.indexOf(w) >= 0 ? -1 : 0;
      if (UNEASY.indexOf(w) >= 0) unease++;
      if (!v) return;
      var prev = words[i - 1] || '', pp = words[i - 2] || '', k = UP[prev] || 1;
      if (NOT[prev] || NOT[pp]) v = -v * 0.8;
      score += v * k; hits.push({ word: w, value: v });
    });
    var bang = (String(text).match(/!/g) || []).length, q = /\?/.test(text);
    var norm = Math.max(-1, Math.min(1, (score * (1 + Math.min(bang, 3) * 0.12)) / Math.max(1.5, Math.sqrt(words.length))));
    var mood = norm > 0.12 ? 'warm' : norm < -0.12 ? 'sour' : 'even';
    var feeling = /rarer than|oh great|yeah right|sure, because|wow, another|just what we needed/i.test(text) ? 'Sarcasm' : unease ? 'Anxiety' : mood === 'sour' ? 'Opposition' : q ? 'Curiosity' : mood === 'warm' ? (bang ? 'Excitement' : 'Support') : 'Plain';
    return { score: norm, mood: mood, feeling: feeling, hits: hits, words: words.length };
  }

  /* ---------------------------------- the feed ---------------------------------- */
  var TAG = /#[\p{L}\p{N}_]{2,}/u;
  /* Which readings the paper asks for: is it opinion at all (subjectivity) and how strongly is it held (strength). Sect. 6.2.1. */
  function lexOf(p) {
    if (p._lex !== undefined) return p._lex;
    if (p.lang && p.lang !== 'en') return (p._lex = null);
    var r = readSentence(p.text), a = Math.abs(r.score);
    return (p._lex = { score: r.score, mood: r.mood, subj: r.hits.length ? 'opinion' : 'fact', strength: !r.hits.length ? 'none' : a >= .6 ? 'strong' : a >= .35 ? 'mild' : 'weak' });
  }
  /* Sentence-level reading (sect. 6.2.1 "sentiment level"). */
  function readParts(text) { return (String(text || '').match(/[^.!?؟।]+[.!?؟।]*/g) || []).map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) { return { text: s, r: readSentence(s) }; }); }
  /* A small multinomial Naive Bayes over a bag of words (sect. 6.2.2), trained in the browser and tested on a held-back fifth. */
  function bag(s) { return String(s || '').toLowerCase().replace(/#[\p{L}\p{N}_]+/gu, ' ').match(/[\p{L}\p{N}'’]+/gu) || []; }
  function fitNB(items) {
    var C = ['1', '0', '-1'], counts = { '1': {}, '0': {}, '-1': {} }, totals = { '1': 0, '0': 0, '-1': 0 }, docs = { '1': 0, '0': 0, '-1': 0 }, vocab = {}, nd = 0;
    items.forEach(function (x) { docs[x.y]++; nd++; x.w.forEach(function (t) { counts[x.y][t] = (counts[x.y][t] || 0) + 1; totals[x.y]++; vocab[t] = 1; }); });
    var V = Object.keys(vocab).length || 1;
    function logs(w) { var o = {}; C.forEach(function (c) { var s = Math.log((docs[c] + 1) / (nd + 3)); w.forEach(function (t) { if (vocab[t]) s += Math.log(((counts[c][t] || 0) + 1) / (totals[c] + V)); }); o[c] = s; }); return o; }
    function best(l) { return C.slice().sort(function (a, b) { return l[b] - l[a]; })[0]; }
    return { C: C, counts: counts, totals: totals, vocab: vocab, V: V, nd: nd, logs: logs, best: best };
  }
  function scoreNB(m, test) { var right = 0; test.forEach(function (x) { if (m.best(m.logs(x.w)) === x.y) right++; }); return pct(right, test.length); }
  function trainNB(posts) {
    var all = [], C, wordings = {};
    posts.forEach(function (p) { if (p.mood === null || p.type === 'repost') return; var w = bag(p.text); if (w.length) { all.push({ w: w, y: String(p.mood), p: p, key: w.join(' ') }); wordings[all[all.length - 1].key] = 1; } });
    /* Two fair exams. Hold back a fifth of the posts, then, harder, a fifth of the distinct wordings, so no exam question was ever seen in class. */
    var test = all.filter(function (x) { return hash(x.p.id) % 5 === 0; }), M = fitNB(all.filter(function (x) { return hash(x.p.id) % 5 !== 0; }));
    var hardTest = all.filter(function (x) { return hash(x.key) % 5 === 0; }), hard = fitNB(all.filter(function (x) { return hash(x.key) % 5 !== 0; })), counts = M.counts, totals = M.totals, vocab = M.vocab, V = M.V, nd = M.nd, logs = M.logs, best = M.best; C = M.C;
    function predict(text) {
      var w = bag(text), l = logs(w), mx = Math.max(l['1'], l['0'], l['-1']), e = {}, sum = 0; C.forEach(function (c) { e[c] = Math.exp(l[c] - mx); sum += e[c]; }); C.forEach(function (c) { e[c] = e[c] / sum; });
      var why = Array.from(new Set(w)).filter(function (t) { return vocab[t] && t.length > 3 && !/^(this|that|with|from|have|were|been|about|your|their|they|them|then|than|very|just|into|what|when|will)$/.test(t); }).map(function (t) { var o = C.map(function (c) { return { c: c, v: Math.log(((counts[c][t] || 0) + 1) / (totals[c] + V)) }; }).sort(function (a, b) { return b.v - a.v; }); return { word: t, c: o[0].c, lift: o[0].v - o[1].v }; }).sort(function (a, b) { return b.lift - a.lift; }).slice(0, 6);
      return { label: best(l), probs: e, why: why, known: w.filter(function (t) { return vocab[t]; }).length, words: w.length };
    }
    var right = 0, lexR = 0, lexN = 0, bin = { '1': 0, '0': 0, '-1': 0 };
    test.forEach(function (x) { bin[x.y]++; if (best(logs(x.w)) === x.y) right++; var r = lexOf(x.p); if (r) { lexN++; if ((r.mood === 'warm' ? '1' : r.mood === 'sour' ? '-1' : '0') === x.y) lexR++; } });
    return { predict: predict, tested: test.length, trained: nd, vocab: V, wordings: Object.keys(wordings).length, unseenWording: scoreNB(hard, hardTest), accuracy: pct(right, test.length), baseline: pct(Math.max(bin['1'], bin['0'], bin['-1']), test.length), lexicon: pct(lexR, lexN), lexN: lexN };
  }

  function chooseBucket(span) {
    var d = span / DAY; if (d >= 7 && d <= 60) return DAY;
    var c = [5, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 4320, 10080, 20160, 43200, 129600, 525600], i;
    for (i = 0; i < c.length; i++) if (span / (c[i] * 60000) <= 45) return c[i] * 60000;
    return 525600 * 60000;
  }
  function feelingOf(text, up) { var e = emotionOf(text); return up && e === 'Plain' ? readSentence(text).feeling : e; }
  function parseTs(s) { var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN; }

  function buildFeed(csvText) {
    var rows = Prof.parseCSV(csvText), idx = new Map(), posts = [], voices = new Map(), up = root.MURMUR_UPLOAD || null;
    rows.forEach(function (r, i) {
      var ts = parseTs(r.timestamp), tag = String(r.text || '').match(TAG);
      idx.set(r.post_id, i);
      var v = voices.get(r.user_id);
      if (!v) { v = { id: r.user_id, platform: r.platform, org: Prof.isOrganisation(r.user_bio), region: Prof.classifyRegion(r.user_location), calling: Prof.classifyInterests(r.user_bio)[0] || null, n: 0 }; voices.set(r.user_id, v); }
      v.n++;
      posts.push({ id: r.post_id, ts: ts, platform: r.platform, voice: v, text: r.text, type: r.interaction || 'post', refId: r.ref_post_id || '', ref: -1, kids: [], tag: tag ? tag[0] : null, mood: r.sentiment in MOOD ? MOOD[r.sentiment] : null, emotion: feelingOf(r.text, up), lang: r.language || '', depth: 0, raw: r });
    });
    posts.forEach(function (p, i) { if (p.refId && idx.has(p.refId)) { p.ref = idx.get(p.refId); posts[p.ref].kids.push(i); } });
    posts.forEach(function (p) { if (p.ref >= 0) p.depth = posts[p.ref].depth + 1; });    // rows are in time order, so a parent is always done first
    var tMin = posts[0].ts, tMax = posts[0].ts;
    posts.forEach(function (p) { if (p.ts < tMin) tMin = p.ts; if (p.ts > tMax) tMax = p.ts; });
    var bucket = up ? chooseBucket(tMax - tMin) : DAY, dayZero = Math.floor(tMin / bucket), days = Math.floor(tMax / bucket) - dayZero + 1;
    CLOCK.bucket = bucket; CLOCK.pseudo = !!(up && up.pseudoTime); CLOCK.base = tMin;
    posts.forEach(function (p) { p.day = Math.floor(p.ts / bucket) - dayZero; p.hour = new Date(p.ts).getUTCHours(); });
    var tagMap = {};
    posts.forEach(function (p) { if (p.tag) (tagMap[p.tag] = tagMap[p.tag] || []).push(p); });
    var tags = Object.keys(tagMap).map(function (t) {
      var daily = new Array(days).fill(0), sum = new Array(days).fill(0), cnt = new Array(days).fill(0), v = {}, pl = {}, moodSum = 0, moodN = 0;
      tagMap[t].forEach(function (p) { daily[p.day]++; v[p.voice.id] = 1; pl[p.platform] = pl[p.platform] || p.ts; if (p.mood !== null) { sum[p.day] += p.mood; cnt[p.day]++; moodSum += p.mood; moodN++; } });
      return { tag: t, posts: tagMap[t], n: tagMap[t].length, daily: daily, moodSum: sum, moodCnt: cnt, voices: Object.keys(v).length, firstBy: pl, net: moodN ? moodSum / moodN : 0 };
    }).filter(function (t) { return t.voices >= K_MIN; }).sort(function (a, b) { return b.n - a.n; });
    var platforms = Array.from(new Set(posts.map(function (p) { return p.platform; }))).sort();
    return { rows: rows, posts: posts, voices: voices, tMin: tMin, tMax: tMax, dayZero: dayZero, days: days, tags: tags, platforms: platforms, bucket: bucket, pseudo: CLOCK.pseudo, labelled: !up || !!up.labelled, dayStart: function (d) { return (dayZero + d) * bucket; } };
  }

  function moodStats(list) {
    var pos = 0, neu = 0, neg = 0;
    list.forEach(function (p) { if (p.mood === 1) pos++; else if (p.mood === 0) neu++; else if (p.mood === -1) neg++; });
    var n = pos + neu + neg;
    return { n: n, pos: pos, neu: neu, neg: neg, net: n ? (pos - neg) / n : 0, posShare: pct(pos, n), neuShare: pct(neu, n), negShare: pct(neg, n) };
  }
  function condition(net) { return net > 0.25 ? 'Clear skies' : net > 0.08 ? 'Fair spells' : net > -0.08 ? 'Overcast' : net > -0.25 ? 'Showers' : 'Thunderstorm'; }

  /* ---------------------------------- forecasting ---------------------------------- */
  // Damped Holt smoothing, fitted only on days up to and including "upto".
  function holt(series, upto, horizon) {
    var alpha = 0.45, beta = 0.25, phi = 0.75, level = series[0], trend = 0, i;
    for (i = 1; i <= upto; i++) { var l0 = level; level = alpha * series[i] + (1 - alpha) * (level + phi * trend); trend = beta * (level - l0) + (1 - beta) * phi * trend; }
    var out = [], damp = 0;
    for (i = 1; i <= horizon; i++) { damp += Math.pow(phi, i); out.push(Math.max(0, level + damp * trend)); }
    return out;
  }
  function sumRange(a, from, to) { var s = 0; for (var i = Math.max(0, from); i <= to && i < a.length; i++) s += a[i]; return s; }

  /* How hot a trend looks on day d, using nothing after day d. */
  function pulse(daily, d) {
    var recent = sumRange(daily, d - 2, d), before = sumRange(daily, d - 5, d - 3), base = sumRange(daily, 0, d - 3) / Math.max(1, d - 2);
    var z = (recent / 3 - base) / Math.sqrt(base + 0.5);
    return { recent: recent, before: before, velocity: recent - before, z: z, total: sumRange(daily, 0, d), started: sumRange(daily, 0, d) > 0 };
  }

  /* Walk through the month, predicting 3 days ahead from each day with only earlier data. */
  function backtest(feed) {
    var model = 0, naive = 0, n = 0, picks = 0, right = 0, topRight = 0, topN = 0, randExp = 0, days = feed.days;
    for (var d = 3; d <= days - 4; d++) {
      var ranked = [];
      feed.tags.forEach(function (t) {
        var p = pulse(t.daily, d), actual = sumRange(t.daily, d + 1, d + 3), f = holt(t.daily, d, 3), pred = f[0] + f[1] + f[2];
        if (!p.started) { ranked.push({ pred: 0, actual: actual }); return; }
        model += Math.abs(pred - actual); naive += Math.abs(p.recent - actual); n++;
        if (p.z >= 1.5 && p.recent >= 3) { picks++; if (actual >= K_MIN) right++; }
        ranked.push({ pred: pred, actual: actual });
      });
      var maxA = Math.max.apply(null, ranked.map(function (x) { return x.actual; }));
      if (maxA > 0) {
        var top = ranked.slice().sort(function (a, b) { return b.pred - a.pred; })[0];
        topN++; if (top.actual === maxA) topRight++;
        randExp += ranked.filter(function (x) { return x.actual === maxA; }).length / ranked.length;
      }
    }
    return { modelMae: n ? model / n : 0, naiveMae: n ? naive / n : 0, checks: n, picks: picks, right: right, precision: pct(right, picks), topRight: topRight, topN: topN, topHit: pct(topRight, topN), chance: pct(randExp, topN) };
  }

  var api = { deg: deg, q: q, ticks: ticks, fillPalette: fillPalette, spanText: spanText, unitNote: unitNote, lexOf: lexOf, readParts: readParts, trainNB: trainNB, K_MIN: K_MIN, DAY: DAY, pct: pct, fmt: fmt, esc: esc, pad2: pad2, hexA: hexA, hash: hash, rngFrom: rngFrom, dayName: dayName, EMOTIONS: EMOTIONS, emotionOf: emotionOf, readSentence: readSentence, buildFeed: buildFeed, moodStats: moodStats, condition: condition, holt: holt, sumRange: sumRange, pulse: pulse, backtest: backtest };

  /* ---------------------------------- page helpers ---------------------------------- */
  if (typeof document !== 'undefined') {
    var CH = [['listen', 'I', 'Listen'], ['weather', 'II', 'Feel'], ['atlas', 'III', 'Know'], ['swell', 'IV', 'Trend'], ['grapevine', 'V', 'Connect']];
    api.$ = function (id) { return document.getElementById(id); };
    api.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var feedCache = null; api.loadFeed = function () { return feedCache || (feedCache = buildFeed(root.SAMPLE_AUDIENCE_CSV)); };
    api.rail = function (cur) {
      return '<nav class="rail" aria-label="Chapters"><a class="rail-label" href="../index.html">Murmuration</a>' + CH.map(function (c) { return c[0] === cur ? '<span class="step on" aria-current="page"><b>' + c[1] + '</b><span>' + c[2] + '</span></span>' : '<a class="step" href="../' + c[0] + '/index.html"><b>' + c[1] + '</b><span>' + c[2] + '</span></a>'; }).join('') + '</nav>';
    };
    api.bindTabs = function (id, fn) {
      var host = document.getElementById(id);
      host.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-v]'); if (!b) return;
        Array.prototype.forEach.call(host.querySelectorAll('button[data-v]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fn(b.getAttribute('data-v'));
      });
    };
    api.waffle = function (frac, color) {
      var on = Math.round(Math.max(0, Math.min(100, frac))), o = '<svg class="waffle" viewBox="0 0 50 50" aria-hidden="true">', i = 0, x, y;
      for (y = 9; y >= 0; y--) for (x = 0; x < 10; x++) { o += '<rect x="' + (x * 5 + .4) + '" y="' + (y * 5 + .4) + '" width="4.2" height="4.2" rx="1" fill="' + (i < on ? color : 'rgba(255,255,255,.09)') + '"/>'; i++; }
      return o + '</svg>';
    };
    api.notes = function (host, list, palette) {
      host.innerHTML = list.map(function (n, i) { var c = palette[i % palette.length]; return '<article class="note" style="--c:' + c + '"' + (n.q ? ' data-drill="' + n.q + '" data-tip="' + esc(n.kick) + '" role="button" tabindex="0"' : '') + '>' + (n.frac === null || n.frac === undefined ? '' : api.waffle(n.frac, c)) + '<div class="kick">' + esc(n.kick) + '</div><div class="fig">' + esc(n.fig) + '<small>' + esc(n.unit || '') + '</small></div><div class="head">' + esc(n.head) + '</div><p>' + esc(n.text) + '</p></article>'; }).join('');
    };
    api.spark = function (svg, values, color) {
      var mx = Math.max.apply(null, values) || 1, n = values.length, d = 'M0 30', i;
      for (i = 0; i < n; i++) d += ' L' + (i / (n - 1) * 100).toFixed(2) + ' ' + (30 - 26 * values[i] / mx).toFixed(2);
      var id = 'sg' + hash(svg.id + color);
      svg.innerHTML = '<defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".55"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + ' L100 30 Z" fill="url(#' + id + ')" stroke="' + color + '" stroke-opacity=".75" stroke-width="1" vector-effect="non-scaling-stroke"/>';
    };
    api.PLAY = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg>';
    api.PAUSE = '<svg viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" rx="1"/><rect x="8.5" y="1" width="3.5" height="12" rx="1"/></svg>';
    api.fitCanvas = function (cv, host) {
      var r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width), H = Math.round(r.height);
      cv.width = W * dpr; cv.height = H * dpr;
      var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx: ctx, W: W, H: H };
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Kit = api;
})(typeof window !== 'undefined' ? window : globalThis);
