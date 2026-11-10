/* The Door: takes any CSV a visitor brings, cleans it the way Batrinca & Treleaven (2015, sect. 5)
 * say it should be cleaned, and rewrites it into the one shape every room reads.
 * Nothing here talks to a server. Runs in the browser and in Node, so it can be tested. */
(function (root) {
  'use strict';
  var Kit = root.Kit || (typeof require !== 'undefined' ? require('./kit.js') : null);
  var COLS = ['post_id', 'platform', 'user_id', 'timestamp', 'text', 'parent_id', 'language', 'user_bio', 'user_location', 'followers', 'joined', 'interaction', 'ref_post_id', 'sentiment'];
  var MIN_ROWS = 20, MIN_VOICES = 5, MAX_ROWS = 20000, TEXT_CAP = 600;
  var KEY_CSV = 'murmuration.upload.csv', KEY_META = 'murmuration.upload.meta';

  /* -------------------------------- reading the table -------------------------------- */
  function detectDelimiter(text) {
    var sample = text.slice(0, 20000), best = ',', top = -1;
    [',', ';', '\t', '|'].forEach(function (d) {
      var counts = [], n = 0, inQ = false, i, c;
      for (i = 0; i < sample.length && counts.length < 25; i++) {
        c = sample[i];
        if (c === '"') inQ = !inQ;
        else if (!inQ && c === d) n++;
        else if (!inQ && c === '\n') { counts.push(n); n = 0; }
      }
      if (n) counts.push(n);
      if (!counts.length || !counts[0]) return;
      var same = counts.filter(function (x) { return x === counts[0]; }).length / counts.length, score = same * counts[0];
      if (score > top) { top = score; best = d; }
    });
    return best;
  }
  function splitRows(text, d) {
    var rows = [], row = [], f = '', inQ = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inQ = false; } else f += c; }
      else if (c === '"' && f === '') inQ = true;
      else if (c === d) { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || (r[0] || '').trim() !== ''; });
  }
  function normHead(h) { return String(h || '').trim().toLowerCase().replace(/[\s.\-\/]+/g, '_').replace(/[^\w]/g, ''); }

  var SYN = {
    text: /^(text|full_?text|tweet|tweet_?text|content|body|message|msg|post|post_?text|post_?content|caption|comment|comment_?text|review|review_?text|selftext|clean_?text|status|status_?text)$/,
    timestamp: /^(timestamp|time_?stamp|time|date|date_?time|created|created_?at|created_?time|created_?utc|posted|posted_?at|post_?date|post_?time|published|published_?at|publish_?time|tweet_?created|tweet_?date)$/,
    user_id: /^(user_?id|user|user_?name|screen_?name|user_?screen_?name|author|author_?id|author_?name|handle|account|from_?user|owner|profile_?name|name)$/,
    post_id: /^(post_?id|id|id_?str|tweet_?id|status_?id|message_?id|comment_?id|uid)$/,
    ref_post_id: /^(ref_?post_?id|parent_?id|parent|in_?reply_?to|in_?reply_?to_?status_?id|in_?reply_?to_?tweet_?id|reply_?to|replied_?to|referenced_?tweet_?id|retweeted_?status_?id|retweet_?of|quoted_?status_?id|link_?id)$/,
    platform: /^(platform|source_?platform|network|social_?network|site|channel|medium)$/,
    sentiment: /^(sentiment|sentiment_?label|sentiment_?score|airline_?sentiment|label|polarity|target|mood|stars|rating)$/,
    interaction: /^(interaction|interaction_?type|type|post_?type|kind|action|tweet_?type)$/,
    language: /^(language|lang|locale)$/,
    user_bio: /^(user_?bio|bio|user_?description|author_?description|description|about|profile)$/,
    user_location: /^(user_?location|location|author_?location|place|city|country|geo)$/,
    followers: /^(followers|followers_?count|user_?followers|user_?followers_?count|follower_?count|subscribers)$/,
    joined: /^(joined|join_?date|user_?created|user_?created_?at|account_?created|account_?created_?at|member_?since|user_?joined)$/
  };
  var FIELDS = ['text', 'timestamp', 'user_id', 'post_id', 'ref_post_id', 'platform', 'sentiment', 'interaction', 'language', 'user_bio', 'user_location', 'followers', 'joined'];

  function parseTable(rawText) {
    var text = String(rawText || '').replace(/^﻿/, ''), delim = detectDelimiter(text), rows = splitRows(text, delim);
    if (!rows.length) return { error: 'That file is empty.' };
    var first = rows[0], known = first.filter(function (h) { var n = normHead(h); return FIELDS.some(function (f) { return SYN[f].test(n); }); }).length;
    var looksData = !known && first.some(function (c) { return String(c).length > 40 || /^\d{4,}$/.test(String(c).trim()); });
    var headers = looksData ? first.map(function (_, i) { return 'column ' + (i + 1); }) : first.map(function (h, i) { return String(h).trim() || 'column ' + (i + 1); });
    var body = (looksData ? rows : rows.slice(1)).map(function (r) { return headers.map(function (_, i) { return r[i] === undefined ? '' : r[i]; }); });
    return { headers: headers, rows: body, delim: delim, headerless: looksData };
  }
  function column(t, i, n) { var o = [], step = Math.max(1, Math.floor(t.rows.length / (n || 400))), j; for (j = 0; j < t.rows.length && o.length < (n || 400); j += step) o.push(String(t.rows[j][i] || '').trim()); return o; }

  function guessMap(t) {
    var map = {}, used = {}, norm = t.headers.map(normHead);
    FIELDS.forEach(function (f) { for (var i = 0; i < norm.length; i++) if (!used[i] && SYN[f].test(norm[i])) { map[f] = i; used[i] = 1; break; } });
    function free() { return t.headers.map(function (_, i) { return i; }).filter(function (i) { return !used[i]; }); }
    if (map.timestamp === undefined) {
      var bestT = -1, rate = .6;
      free().forEach(function (i) { var c = column(t, i, 200).filter(Boolean), ok = c.filter(function (v) { return !/^\d{1,8}$/.test(v) && isFinite(parseDate(v, 'dmy')); }).length / Math.max(1, c.length); if (ok > rate) { rate = ok; bestT = i; } });
      if (bestT >= 0) { map.timestamp = bestT; used[bestT] = 1; }
    }
    if (map.text === undefined) {
      var bestX = -1, len = 12;
      free().forEach(function (i) { var c = column(t, i, 200), m = c.reduce(function (s, v) { return s + v.length; }, 0) / Math.max(1, c.length), spaced = c.filter(function (v) { return /\s/.test(v); }).length / Math.max(1, c.length); if (spaced > .4 && m > len) { len = m; bestX = i; } });
      if (bestX >= 0) { map.text = bestX; used[bestX] = 1; }
    }
    if (map.sentiment === undefined && t.headerless) free().forEach(function (i) { if (map.sentiment === undefined && sentimentReader(column(t, i, 400)).known) { map.sentiment = i; used[i] = 1; } });
    if (map.user_id === undefined && t.headerless) { var bu = -1, dv = 0; free().forEach(function (i) { var c = column(t, i, 400).filter(Boolean), s = new Set(c).size / Math.max(1, c.length); if (c.length && c.every(function (v) { return /^@?[\w.]{2,40}$/.test(v); }) && !c.every(function (v) { return /^\d+$/.test(v); }) && s > dv && s < 1.01 && new Set(c).size > 5) { dv = s; bu = i; } }); if (bu >= 0) { map.user_id = bu; used[bu] = 1; } }
    return map;
  }

  /* -------------------------------- dates -------------------------------- */
  var MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  var TZ = { utc: 0, gmt: 0, z: 0, est: -5, edt: -4, cst: -6, cdt: -5, mst: -7, mdt: -6, pst: -8, pdt: -7, bst: 1, cet: 1, cest: 2, ist: 5.5 };
  function zone(z) { if (!z) return 0; var k = z.toLowerCase(); if (k in TZ) return TZ[k]; var m = /^([+-])(\d{2}):?(\d{2})$/.exec(z); return m ? (m[1] === '-' ? -1 : 1) * (+m[2] + +m[3] / 60) : 0; }
  function makeUtc(y, mo, d, h, mi, s, ap, z) {
    h = +h || 0; if (ap) { var pm = /p/i.test(ap); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    if (mo < 0 || mo > 11 || d < 1 || d > 31 || h > 23 || (+mi || 0) > 59 || (+s || 0) > 60) return NaN;
    var t = Date.UTC(y, mo, d, h, +mi || 0, +s || 0) - zone(z) * 3600000, c = new Date(Date.UTC(y, mo, d));
    return c.getUTCDate() === d ? t : NaN;
  }
  function family(s) { s = String(s).trim(); if (/^\d{9,13}(\.\d+)?$/.test(s)) return 'epoch'; if (/^\d{4}[-\/.]/.test(s)) return 'year-first'; if (/^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/.test(s)) return 'slashed'; return 'written'; }
  var CLOCK = '(?:[T\\s,]+(\\d{1,2}):(\\d{2})(?::(\\d{2}))?(?:\\.\\d+)?\\s*(am|pm)?\\s*(Z|UTC|GMT|[A-Z]{3}|[+-]\\d{2}:?\\d{2})?)?\\s*$';
  var RE_Y = new RegExp('^(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})' + CLOCK, 'i'), RE_S = new RegExp('^(\\d{1,2})[-\\/.](\\d{1,2})[-\\/.](\\d{2,4})' + CLOCK, 'i');
  function parseDate(raw, order) {
    var s = String(raw || '').trim(), m, t;
    if (!s) return NaN;
    if (/^\d{9,13}(\.\d+)?$/.test(s)) { t = +s; if (t < 1e11) t *= 1000; return sane(t); }
    if ((m = RE_Y.exec(s))) return sane(makeUtc(+m[1], +m[2] - 1, +m[3], m[4], m[5], m[6], m[7], m[8]));
    if ((m = RE_S.exec(s))) {
      var a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000;
      var dayFirst = a > 12 ? true : b > 12 ? false : order !== 'mdy';
      return sane(makeUtc(y, (dayFirst ? b : a) - 1, dayFirst ? a : b, m[4], m[5], m[6], m[7], m[8]));
    }
    if ((m = /^[A-Za-z]{3},?\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+([A-Za-z]{3}|[+-]\d{4})\s+(\d{4})$/.exec(s))) return sane(makeUtc(+m[7], MON[m[1].toLowerCase()], +m[2], m[3], m[4], m[5], '', m[6]));
    t = Date.parse(s);
    if (isNaN(t)) return NaN;
    return sane(/(z|gmt|utc|[+-]\d{2}:?\d{2})\s*$/i.test(s) ? t : t - new Date(t).getTimezoneOffset() * 60000);
  }
  function sane(t) { if (!isFinite(t)) return NaN; var y = new Date(t).getUTCFullYear(); return y >= 1995 && y <= 2100 ? t : NaN; }
  function stamp(t) { return new Date(t).toISOString().slice(0, 19).replace('T', ' '); }
  function dateOrder(values) { var dmy = 0, mdy = 0; values.forEach(function (v) { var m = RE_S.exec(v); if (!m) return; if (+m[1] > 12) dmy++; if (+m[2] > 12) mdy++; }); return { order: dmy && !mdy ? 'dmy' : mdy && !dmy ? 'mdy' : 'dmy', ambiguous: !dmy && !mdy && values.some(function (v) { return RE_S.test(v); }), mixed: !!(dmy && mdy) }; }

  /* -------------------------------- moods -------------------------------- */
  var POS = /^(pos|positive|good|great|joy|happy|happiness|love|favou?rable|\+|bullish)$/i, NEG = /^(neg|negative|bad|anger|angry|sad|sadness|fear|disgust|hate|unfavou?rable|-|bearish|worry)$/i, NEU = /^(neu|neut|neutral|none|mixed|ok|okay|surprise|irrelevant|0)$/i;
  function sentimentReader(values) {
    var v = values.filter(Boolean), nums = v.filter(function (x) { return x !== '' && isFinite(+x); });
    if (!v.length) return { known: false, read: function () { return ''; } };
    if (nums.length / v.length > .95) {
      var n = nums.map(Number), lo = Math.min.apply(null, n), hi = Math.max.apply(null, n), d = new Set(n), ints = n.every(function (x) { return x === Math.round(x); }), rule = null;
      if (ints && lo >= 0 && hi === 4 && Array.from(d).every(function (x) { return x === 0 || x === 2 || x === 4; })) rule = function (x) { return x === 4 ? 'positive' : x === 0 ? 'negative' : 'neutral'; };
      else if (ints && lo === -1 && hi === 1) rule = function (x) { return x > 0 ? 'positive' : x < 0 ? 'negative' : 'neutral'; };
      else if (ints && lo === 0 && hi === 1) rule = function (x) { return x ? 'positive' : 'negative'; };
      else if (ints && lo >= 1 && hi <= 5 && hi >= 3) rule = function (x) { return x >= 4 ? 'positive' : x <= 2 ? 'negative' : 'neutral'; };
      else if (lo >= 0 && hi <= 1 && !ints) rule = function (x) { return x > .6 ? 'positive' : x < .4 ? 'negative' : 'neutral'; };
      else if (lo >= -1 && hi <= 1 && !ints) rule = function (x) { return x > .05 ? 'positive' : x < -.05 ? 'negative' : 'neutral'; };
      if (!rule) return { known: false, read: function () { return ''; } };
      return { known: true, read: function (x) { return x === '' || !isFinite(+x) ? '' : rule(+x); } };
    }
    var word = function (x) { x = String(x).trim(); return POS.test(x) ? 'positive' : NEG.test(x) ? 'negative' : NEU.test(x) ? 'neutral' : ''; }, hits = v.filter(function (x) { return word(x); }).length;
    return hits / v.length > .6 ? { known: true, read: word } : { known: false, read: function () { return ''; } };
  }
  function readMood(text) { var r = Kit.readSentence(text); return r.mood === 'warm' ? 'positive' : r.mood === 'sour' ? 'negative' : 'neutral'; }

  /* -------------------------------- cleaning -------------------------------- */
  function salted() { var s = Math.floor(Math.random() * 4294967295).toString(36); return function (v) { var a = Kit.hash(s + ':' + v).toString(16), b = Kit.hash(v + ':' + s + ':flock').toString(16); return 'anon-' + (('00000000' + a).slice(-8) + ('00000000' + b).slice(-8)); }; }
  function scrub(t, r) {
    var before = t, out = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
    out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
    if (out !== before) r.inconsistent.whitespace++;
    out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g, function () { r.masked.emails++; return '[email]'; });
    out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, function () { r.masked.links++; return '[link]'; });
    out = out.replace(/(^|[^\w@])@[A-Za-z0-9_.]{2,30}/g, function (m, a) { r.masked.handles++; return a + '[voice]'; });
    out = out.replace(/(?<![\w#])\+?\d[\d ().\/-]{7,}\d(?!\w)/g, function () { r.masked.numbers++; return '[number]'; });
    return out.length > TEXT_CAP ? out.slice(0, TEXT_CAP) + '…' : out;
  }
  function plain(s, cap) { return String(s || '').replace(/[<>"'`&\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, cap); }
  function count(s) { var m = /^\s*([\d.,]+)\s*([kmb])?\s*$/i.exec(String(s || '')); if (!m) return NaN; var v = parseFloat(m[1].replace(/,/g, '')); if (!isFinite(v)) return NaN; return Math.round(v * ({ k: 1e3, m: 1e6, b: 1e9 }[(m[2] || '').toLowerCase()] || 1)); }
  function kind(v) { v = String(v || '').trim().toLowerCase(); if (!v) return ''; if (/retweet|^rt$|repost|forward/.test(v)) return 'repost'; if (/quote/.test(v)) return 'quote'; if (/reply|comment|answer|response/.test(v)) return 'reply'; if (/share|cross/.test(v)) return 'share'; if (/post|tweet|original|status|message/.test(v)) return 'post'; return ''; }
  var STOP = {}; ('that this with have from they will your about would there their what when which been were more than them then some could into just like also only over such very much many most other these those because after before where while being does doing should still here make made want need know think really going good great people time today https http voice link email number dont cant didnt thats youre').split(' ').forEach(function (w) { STOP[w] = 1; });

  function blankReport(name) { return { name: name || 'your file', sourceRows: 0, kept: 0, delim: ',', fields: {}, missing: { text: 0, time: 0, author: 0 }, incorrect: { dates: 0, refs: 0, followers: 0 }, inconsistent: { dateStyles: 0, moodLabels: 0, platformCase: 0, whitespace: 0 }, duplicates: 0, masked: { emails: 0, handles: 0, numbers: 0, links: 0 }, moods: 'file', moodsRead: 0, labelled: true, inferredLinks: 0, topics: 'hashtags', pseudoTime: false, noAuthors: false, sampled: 0, ambiguousDates: false, notes: [] }; }

  function ingest(t, map, opts) {
    opts = opts || {};
    var r = blankReport(plain(opts.name, 80)), hasT = map.timestamp !== undefined, hasU = map.user_id !== undefined, hasS = map.sentiment !== undefined, hash = opts.keepIds ? function (v) { return v; } : salted(), max = opts.max || MAX_ROWS;
    if (map.text === undefined) return { error: 'Tell the door which column holds the words.' };
    r.delim = t.delim; r.sourceRows = t.rows.length; t.headers.forEach(function () { }); FIELDS.forEach(function (f) { if (map[f] !== undefined) r.fields[f] = t.headers[map[f]]; });
    var src = t.rows, get = function (row, f) { return map[f] === undefined ? '' : String(row[map[f]] === undefined ? '' : row[map[f]]).trim(); };
    if (src.length > max) { var step = src.length / max, thin = []; for (var q = 0; q < max; q++) thin.push(src[Math.floor(q * step)]); r.sampled = src.length - thin.length; src = thin; }

    /* dates */
    var dateVals = hasT ? src.map(function (x) { return get(x, 'timestamp'); }) : [], auto = dateOrder(dateVals), order = opts.dateOrder && opts.dateOrder !== 'auto' ? opts.dateOrder : auto.order;
    r.ambiguousDates = auto.ambiguous && (!opts.dateOrder || opts.dateOrder === 'auto');
    var parsed = dateVals.map(function (v) { return parseDate(v, order); }), good = parsed.filter(isFinite), tSpan = good.length ? Math.max.apply(null, good.slice(0, 120000)) - Math.min.apply(null, good.slice(0, 120000)) : 0;
    var useTime = hasT && good.length / Math.max(1, src.length) >= .5 && tSpan >= 3600000;
    r.pseudoTime = !useTime;
    if (useTime) { var fam = {}; dateVals.forEach(function (v) { if (v) { var f = family(v); fam[f] = (fam[f] || 0) + 1; } }); var fs = Object.keys(fam).sort(function (a, b) { return fam[b] - fam[a]; }); r.inconsistent.dateStyles = fs.slice(1).reduce(function (s, f) { return s + fam[f]; }, 0); }

    /* moods */
    var moodRead = sentimentReader(hasS ? src.map(function (x) { return get(x, 'sentiment'); }).filter(Boolean).slice(0, 5000) : []);
    var platCase = {}; if (map.platform !== undefined) src.forEach(function (x) { var p = get(x, 'platform'); if (p) { var k = p.toLowerCase(); platCase[k] = platCase[k] || {}; platCase[k][p] = (platCase[k][p] || 0) + 1; } });
    var platName = {}; Object.keys(platCase).forEach(function (k) { var c = platCase[k], names = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }); platName[k] = plain(names[0], 28); names.slice(1).forEach(function (n) { r.inconsistent.platformCase += c[n]; }); });

    var out = [], seen = new Set();
    src.forEach(function (row, i) {
      var rawText = get(row, 'text'), rawId = get(row, 'post_id'), rawUser = get(row, 'user_id');
      if (!rawText) { r.missing.text++; return; }
      var key = rawId || rawUser + '|' + rawText + '|' + (dateVals[i] || '');
      if ((rawId || hasU) && seen.has(key)) { r.duplicates++; return; }
      seen.add(key);
      var ts = useTime ? parsed[i] : NaN;
      if (useTime && !isFinite(ts)) { if (dateVals[i]) r.incorrect.dates++; else r.missing.time++; return; }
      if (hasU && !rawUser) r.missing.author++;
      var text = scrub(rawText, r);
      if (!text) { r.missing.text++; return; }
      out.push({ i: i, ts: ts, rawId: rawId, rawUser: rawUser.replace(/^@/, '').toLowerCase(), rawText: rawText, row: row, text: text });
    });
    if (out.length < MIN_ROWS) return { error: 'After cleaning, only ' + out.length + ' usable posts were left. The rooms need at least ' + MIN_ROWS + '.' };
    if (useTime) out.sort(function (a, b) { return a.ts - b.ts || a.i - b.i; });
    else { var b0 = Date.UTC(2020, 0, 1), span = 30 * 86400000; out.forEach(function (o, n) { o.ts = b0 + Math.floor(n / out.length * span); }); }
    r.noAuthors = !hasU;

    /* rewrite */
    var idx = new Map(); out.forEach(function (o, n) { if (o.rawId && !idx.has(o.rawId)) idx.set(o.rawId, n); });
    var lastBy = new Map(), result = [], fillMood = 0, fileMood = 0;
    out.forEach(function (o, n) {
      var row = o.row, refRaw = get(row, 'ref_post_id'), refN = -1, type = kind(get(row, 'interaction'));
      if (refRaw && refRaw !== '0' && refRaw !== '-1' && !/^(nan|null|none)$/i.test(refRaw)) { var hit = idx.get(refRaw); if (hit !== undefined && hit < n) refN = hit; else r.incorrect.refs++; }
      var men = /^\s*(RT\s*:?\s*)?@([A-Za-z0-9_.]{2,30})/.exec(o.rawText);
      if (refN < 0 && men && hasU) { var who = lastBy.get(men[2].toLowerCase()); if (who !== undefined) { refN = who; r.inferredLinks++; if (!type || type === 'post') type = men[1] ? 'repost' : 'reply'; } }
      if (!type) type = men && men[1] ? 'repost' : refN >= 0 ? 'reply' : 'post';
      if (refN < 0 && type !== 'post' && type !== 'repost' && !men) type = 'post';
      if (o.rawUser) lastBy.set(o.rawUser, n);
      var rawSent = get(row, 'sentiment'), mood = moodRead.known ? moodRead.read(rawSent) : '';
      if (mood && rawSent !== mood) r.inconsistent.moodLabels++;
      if (mood) fileMood++; else { mood = readMood(o.text); fillMood++; }
      var fr = get(row, 'followers'), fc = count(fr); if (fr && !isFinite(fc)) r.incorrect.followers++;
      var jr = parseDate(get(row, 'joined'), order), pk = get(row, 'platform').toLowerCase();
      result.push({ post_id: 'p-' + (n + 1), platform: platName[pk] || plain(opts.platform, 28) || 'Your file', user_id: hash(o.rawUser || 'row:' + n), timestamp: stamp(o.ts), text: o.text, parent_id: '', language: get(row, 'language').toLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 8), user_bio: plain(get(row, 'user_bio'), 300), user_location: plain(get(row, 'user_location'), 120), followers: isFinite(fc) ? String(fc) : '', joined: isFinite(jr) ? stamp(jr).slice(0, 10) : '', interaction: type, ref_post_id: refN >= 0 ? 'p-' + (refN + 1) : '', sentiment: mood });
    });
    r.moodsRead = fillMood; r.labelled = moodRead.known && fileMood / Math.max(1, result.length) >= .8; r.moods = !moodRead.known ? 'words' : fillMood ? 'both' : 'file';
    var voices = new Set(result.map(function (x) { return x.user_id; })).size;
    if (voices < MIN_VOICES) return { error: 'Only ' + voices + ' different authors were found. Groups smaller than five are never shown here, so the rooms need at least ' + MIN_VOICES + '.' };

    /* topics, when a file has no usable hashtags */
    var TAG = /#[\p{L}\p{N}_]{2,}/u, byTag = {};
    result.forEach(function (x) { var m = x.text.match(TAG); if (m) (byTag[m[0]] = byTag[m[0]] || new Set()).add(x.user_id); });
    if (Object.keys(byTag).filter(function (k) { return byTag[k].size >= 5; }).length < 3) {
      var words = {};
      result.forEach(function (x) { var s = {}; (x.text.toLowerCase().match(/\p{L}{4,}/gu) || []).forEach(function (w) { if (STOP[w] || s[w]) return; s[w] = 1; (words[w] = words[w] || new Set()).add(x.user_id); }); });
      var cap = voices * .6, top = Object.keys(words).filter(function (w) { return words[w].size >= 5 && words[w].size <= Math.max(5, cap); }).sort(function (a, b) { return words[b].size - words[a].size || (a < b ? -1 : 1); }).slice(0, 10);
      if (top.length) {
        r.topics = 'derived';
        result.forEach(function (x) { if (TAG.test(x.text)) return; var low = ' ' + x.text.toLowerCase().replace(/[^\p{L}]+/gu, ' ') + ' ', w = top.filter(function (k) { return low.indexOf(' ' + k + ' ') >= 0; })[0]; if (w) x.text += ' #' + w; });
      }
      var again = {}; result.forEach(function (x) { var m = x.text.match(TAG); if (m) (again[m[0]] = again[m[0]] || new Set()).add(x.user_id); });
      if (!Object.keys(again).some(function (k) { return again[k].size >= 5; })) { r.topics = 'everything'; result.forEach(function (x) { if (!TAG.test(x.text)) x.text += ' #everything'; }); }
    }
    r.kept = result.length; r.voices = voices;
    if (r.sampled) r.notes.push('Your file was large, so every room reads an evenly spaced sample of ' + Kit.fmt(result.length) + ' rows. Some threads may be cut.');
    if (r.pseudoTime) r.notes.push(hasT ? 'The date column could not be trusted, so the time charts follow row order. Read them as sequence, not calendar.' : 'No date column, so the time charts follow row order. Read them as sequence, not calendar.');
    if (r.noAuthors) r.notes.push('No author column, so every row counts as its own voice.');
    if (r.moods === 'words') r.notes.push('No usable mood labels, so a word list scored every post. It reads English best.');
    if (r.moods === 'both') r.notes.push(Kit.fmt(fillMood) + ' posts had no mood label and were scored by the word list.');
    if (r.topics === 'derived') r.notes.push('Too few shared hashtags, so the commonest words stand in as topics.');
    if (r.topics === 'everything') r.notes.push('No shared hashtags or common words, so everything is filed under one topic.');
    if (r.inferredLinks) r.notes.push(Kit.fmt(r.inferredLinks) + ' conversation links were inferred from @mentions at the start of posts.');
    if (r.ambiguousDates) r.notes.push('Dates such as 04/05/2024 could be read two ways. They were read day first. Change that under Date order if it is wrong.');
    if (auto.mixed) r.notes.push('Your dates mix day-first and month-first styles, so some could be misread.');
    return { rows: result, report: r };
  }

  function toCSV(rows) { var q = function (v) { v = String(v === undefined ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }; return COLS.join(',') + '\n' + rows.map(function (x) { return COLS.map(function (c) { return q(x[c]); }).join(','); }).join('\n') + '\n'; }

  /* The same inspection, run over the demo flock so the Listening Post can report on it too. */
  function audit(rows) {
    var head = COLS.slice(), t = { headers: head, delim: ',', rows: rows.map(function (o) { return head.map(function (c) { return o[c] === undefined ? '' : o[c]; }); }) }, map = {};
    FIELDS.forEach(function (f) { if (f !== 'ref_post_id') map[f] = head.indexOf(f); }); map.ref_post_id = head.indexOf('ref_post_id');
    var res = ingest(t, map, { name: 'The Murmuration flock', keepIds: true, max: 1e9 });
    return res.report || blankReport('The Murmuration flock');
  }

  /* A plain summary anyone can open in a spreadsheet. */
  function summaryCSV(F, report) {
    var out = [['section', 'name', 'metric', 'value']], M = Kit.moodStats(F.posts), push = function (a, b, c, d) { out.push([a, b, c, d]); };
    push('file', report ? report.name : 'demo', 'posts', F.posts.length); push('file', '', 'voices', F.voices.size); push('file', '', 'spans', Kit.spanText(F)); push('mood', 'all', 'warm_pct', M.posShare); push('mood', 'all', 'even_pct', M.neuShare); push('mood', 'all', 'sour_pct', M.negShare); push('mood', 'all', 'net', M.net.toFixed(3));
    if (report) { push('cleaning', 'missing', 'no_text', report.missing.text); push('cleaning', 'missing', 'no_time', report.missing.time); push('cleaning', 'incorrect', 'bad_dates', report.incorrect.dates); push('cleaning', 'incorrect', 'dangling_links', report.incorrect.refs); push('cleaning', 'inconsistent', 'other_date_styles', report.inconsistent.dateStyles); push('cleaning', 'duplicates', 'removed', report.duplicates); push('privacy', 'masked', 'handles', report.masked.handles); push('privacy', 'masked', 'emails', report.masked.emails); }
    F.platforms.forEach(function (p) { var L = F.posts.filter(function (x) { return x.platform === p; }), s = Kit.moodStats(L); push('platform', p, 'posts', L.length); push('platform', p, 'net_mood', s.net.toFixed(3)); });
    F.tags.forEach(function (t) { push('trend', t.tag, 'posts', t.n); push('trend', t.tag, 'voices', t.voices); push('trend', t.tag, 'net_mood', t.net.toFixed(3)); });
    for (var d = 0; d < F.days; d++) { var day = F.posts.filter(function (p) { return p.day === d; }), st = Kit.moodStats(day); push('timeline', Kit.dayName(F.dayStart(d)), 'posts', day.length); push('timeline', Kit.dayName(F.dayStart(d)), 'net_mood', st.net.toFixed(3)); }
    return out.map(function (r) { return r.map(function (v) { v = String(v); if (/^[=+\-@]/.test(v) && !/^-?[\d.]+$/.test(v)) v = "'" + v; return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n') + '\n';
  }

  /* -------------------------------- keeping it between rooms -------------------------------- */
  function save(rows, report) {
    var list = rows, tries = 0;
    while (tries++ < 8) {
      try { localStorage.setItem(KEY_CSV, toCSV(list)); report.kept = list.length; localStorage.setItem(KEY_META, JSON.stringify(report)); return { ok: true, rows: list.length }; }
      catch (e) {
        try { localStorage.removeItem(KEY_CSV); } catch (e2) { return { ok: false }; }
        if (list.length < 40) return { ok: false };
        var cut = Math.floor(list.length * .7), step = list.length / cut, thin = []; for (var i = 0; i < cut; i++) thin.push(list[Math.floor(i * step)]);
        report.notes = report.notes.filter(function (n) { return !/browser could only hold/.test(n); }); report.notes.push('This browser could only hold ' + Kit.fmt(cut) + ' rows between pages, so the file was thinned evenly. Reference links to removed rows are lost.');
        var keep = new Set(thin.map(function (x) { return x.post_id; })); thin.forEach(function (x) { if (x.ref_post_id && !keep.has(x.ref_post_id)) x.ref_post_id = ''; }); list = thin;
      }
    }
    return { ok: false };
  }
  function load() { try { var c = localStorage.getItem(KEY_CSV), m = localStorage.getItem(KEY_META); return c && m ? { csv: c, report: JSON.parse(m) } : null; } catch (e) { return null; } }
  function forget() { try { localStorage.removeItem(KEY_CSV); localStorage.removeItem(KEY_META); } catch (e) { } }

  var api = { COLS: COLS, FIELDS: FIELDS, MIN_ROWS: MIN_ROWS, MIN_VOICES: MIN_VOICES, MAX_ROWS: MAX_ROWS, parseTable: parseTable, guessMap: guessMap, parseDate: parseDate, sentimentReader: sentimentReader, ingest: ingest, toCSV: toCSV, audit: audit, summaryCSV: summaryCSV, save: save, load: load, forget: forget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Door = api;
  if (typeof document !== 'undefined') { var got = load(); if (got) { root.SAMPLE_AUDIENCE_CSV = got.csv; root.MURMUR_UPLOAD = got.report; } }
})(typeof window !== 'undefined' ? window : globalThis);
