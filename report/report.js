/* Murmuration: the report builder.
   Reads the same feed as every room and writes it up plainly: what changed against the period before, what to do
   about it, and how far to trust it. A change is only called a change when it is bigger than chance would explain. */
(function () {
  if (window.MURMUR_EMPTY) return;
  var K = window.Kit, F = K.loadFeed(), UP = window.MURMUR_UPLOAD || null, esc = K.esc, fmt = K.fmt, $ = K.$;
  $('rail').outerHTML = K.rail('report');
  var P = F.posts, KEY = 'murmuration-report';

  /* ---------------- settings ---------------- */
  var PARTS = [['glance', 'The short version'], ['changed', 'What changed'], ['todo', 'What to do'], ['trend', 'Mood and volume over time'], ['platforms', 'Platforms'], ['topics', 'Topics'], ['feelings', 'Feelings'], ['regions', 'Regions'], ['posts', 'Posts worth reading'], ['trust', 'How far to trust this']];
  var S = { title: 'Audience report', client: '', author: '', span: 0, tag: '', plats: {}, parts: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); ['title', 'client', 'author'].forEach(function (k) { if (typeof saved[k] === 'string') S[k] = saved[k].slice(0, 80); }); } catch (e) { }
  function remember() { try { localStorage.setItem(KEY, JSON.stringify({ title: S.title, client: S.client, author: S.author })); } catch (e) { } }
  PARTS.forEach(function (p) { S.parts[p[0]] = true; });
  F.platforms.forEach(function (p) { S.plats[p] = true; });

  function spans() {
    var d = F.days, out = [];
    if (F.bucket === K.DAY && !F.pseudo) [7, 14].forEach(function (n) { if (d >= n * 2) out.push({ n: n, label: 'Last ' + n + ' days, against the ' + n + ' before' }); });
    else { [[4, 'quarter'], [2, 'half']].forEach(function (x) { var n = Math.max(1, Math.ceil(d / x[0])); if (d >= n * 2) out.push({ n: n, label: 'Latest ' + x[1] + ' of the file, against the ' + x[1] + ' before' }); }); }
    out.push({ n: 0, label: 'The whole file, no comparison' });
    return out;
  }
  var SP = spans(); S.span = SP[0].n;

  $('f-title').value = S.title; $('f-client').value = S.client; $('f-author').value = S.author;
  $('f-span').innerHTML = SP.map(function (s) { return '<option value="' + s.n + '">' + esc(s.label) + '</option>'; }).join('');
  $('f-tag').innerHTML = '<option value="">All topics</option>' + F.tags.slice(0, 60).map(function (t) { return '<option value="' + esc(t.tag) + '">' + esc(t.tag) + '</option>'; }).join('');
  $('f-plats').innerHTML = F.platforms.map(function (p) { return '<button type="button" aria-pressed="true" data-p="' + esc(p) + '">' + esc(p) + '</button>'; }).join('');
  $('f-parts').innerHTML = PARTS.map(function (p) { return '<label class="tick"><input type="checkbox" checked data-part="' + p[0] + '">' + p[1] + '</label>'; }).join('');

  [['f-title', 'title'], ['f-client', 'client'], ['f-author', 'author']].forEach(function (x) { $(x[0]).addEventListener('input', function (e) { S[x[1]] = e.target.value; remember(); render(); }); });
  $('f-span').addEventListener('change', function (e) { S.span = +e.target.value; render(); });
  $('f-tag').addEventListener('change', function (e) { S.tag = e.target.value; render(); });
  $('f-plats').addEventListener('click', function (e) { var b = e.target.closest('[data-p]'); if (!b) return; var p = b.getAttribute('data-p'), on = b.getAttribute('aria-pressed') !== 'true'; if (!on && Object.keys(S.plats).filter(function (k) { return S.plats[k]; }).length === 1) return; S.plats[p] = on; b.setAttribute('aria-pressed', String(on)); render(); });
  $('f-parts').addEventListener('change', function (e) { var c = e.target.getAttribute('data-part'); if (c) { S.parts[c] = e.target.checked; render(); } });

  /* ---------------- the arithmetic ---------------- */
  function points(m) { return Math.round(m.net * 100); }
  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }
  function netSE(m) { if (!m.n) return Infinity; var p = m.pos / m.n, q = m.neg / m.n; return Math.sqrt(Math.max(0, p + q - (p - q) * (p - q)) / m.n); }
  function moved(a, b) { return a.n >= 30 && b.n >= 30 && Math.abs(a.net - b.net) > 1.96 * Math.sqrt(netSE(a) * netSE(a) + netSE(b) * netSE(b)); }
  function volumeMoved(a, b) { return Math.max(a, b) >= 30 && Math.abs(a - b) > 1.96 * Math.sqrt(a + b); }
  function shareMoved(x1, n1, x2, n2) { if (n1 < 30 || n2 < 30) return false; var p = (x1 + x2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se > 0 && Math.abs(x1 / n1 - x2 / n2) > 1.96 * se; }
  function pctChange(a, b) { return b ? Math.round((a - b) / b * 100) : 0; }

  function groupBy(list, key) { var o = {}; list.forEach(function (p) { var k = key(p); if (k) (o[k] = o[k] || []).push(p); }); return o; }
  function voiceCount(list) { return new Set(list.map(function (p) { return p.voice.id; })).size; }
  function groups(cur, prev, key) {
    var a = groupBy(cur, key), b = groupBy(prev, key);
    return Object.keys(a).filter(function (k) { return voiceCount(a[k]) >= K.K_MIN; }).map(function (k) { return { name: k, list: a[k], n: a[k].length, pn: (b[k] || []).length, m: K.moodStats(a[k]), pm: K.moodStats(b[k] || []) }; }).sort(function (x, y) { return y.n - x.n; });
  }

  function analyse() {
    var last = F.days - 1, n = S.span, base = P.filter(function (p) { return S.plats[p.platform] && (!S.tag || p.tag === S.tag); });
    var a = n ? Math.max(0, last - n + 1) : 0, pa = n ? Math.max(0, a - n) : 0, pb = a - 1;
    var cur = base.filter(function (p) { return p.day >= a; }), prev = n ? base.filter(function (p) { return p.day >= pa && p.day <= pb; }) : [];
    var R = { base: base, cur: cur, prev: prev, a: a, b: last, pa: pa, pb: pb, compare: !!n, m: K.moodStats(cur), pm: K.moodStats(prev), voices: voiceCount(cur), pvoices: voiceCount(prev) };
    R.tooFew = R.voices < K.K_MIN;
    R.plats = groups(cur, prev, function (p) { return p.platform; });
    R.topics = groups(cur, prev, function (p) { return p.tag; });
    R.regions = groups(cur, prev, function (p) { return p.voice.region; });
    R.feel = K.EMOTIONS.filter(function (e) { return e !== 'Plain'; }).map(function (e) { var x = cur.filter(function (p) { return p.emotion === e; }).length, y = prev.filter(function (p) { return p.emotion === e; }).length; return { name: e, n: x, pn: y, share: K.pct(x, cur.length), pshare: K.pct(y, prev.length) }; });
    judge(R);
    return R;
  }

  /* What changed, and what a sensible person might do about it. Fixed rules, every one tied to a number. */
  function judge(R) {
    var ch = [], todo = [], m = R.m, pm = R.pm, negAll = m.neg;
    var drivers = R.topics.filter(function (t) { return t.m.neg > 0; }).sort(function (x, y) { return y.m.neg - x.m.neg; });
    var driver = drivers[0] && negAll >= 10 && drivers[0].m.neg / negAll >= .15 ? drivers[0] : null;
    var moodShift = 0, volShift = 0;
    if (R.compare && R.prev.length) {
      if (moved(m, pm)) { moodShift = m.net > pm.net ? 1 : -1; ch.push({ tone: moodShift, head: 'Mood ' + (moodShift > 0 ? 'rose ' : 'fell ') + Math.abs(points(m) - points(pm)) + ' points', body: 'Net mood went from ' + signed(points(pm)) + ' to ' + signed(points(m)) + '.' }); }
      else ch.push({ tone: 0, head: 'Mood held steady', body: 'Net mood is ' + signed(points(m)) + ' against ' + signed(points(pm)) + ' before, a gap small enough to be chance.' });
      if (volumeMoved(R.cur.length, R.prev.length)) { volShift = R.cur.length > R.prev.length ? 1 : -1; ch.push({ tone: 0, head: 'Volume ' + (volShift > 0 ? 'rose ' : 'fell ') + Math.abs(pctChange(R.cur.length, R.prev.length)) + '%', body: fmt(R.cur.length) + ' posts against ' + fmt(R.prev.length) + ' in the period before.' }); }
      else ch.push({ tone: 0, head: 'Volume held steady', body: fmt(R.cur.length) + ' posts against ' + fmt(R.prev.length) + ' before.' });
      var hurt = R.plats.filter(function (g) { return moved(g.m, g.pm) && g.m.net < g.pm.net; }).sort(function (x, y) { return (x.m.net - x.pm.net) - (y.m.net - y.pm.net); })[0];
      var helped = R.plats.filter(function (g) { return moved(g.m, g.pm) && g.m.net > g.pm.net; }).sort(function (x, y) { return (y.m.net - y.pm.net) - (x.m.net - x.pm.net); })[0];
      if (hurt) ch.push({ tone: -1, head: hurt.name + ' soured', body: 'Net mood there went from ' + signed(points(hurt.pm)) + ' to ' + signed(points(hurt.m)) + ' on ' + fmt(hurt.n) + ' posts.' });
      if (helped) ch.push({ tone: 1, head: helped.name + ' warmed', body: 'Net mood there went from ' + signed(points(helped.pm)) + ' to ' + signed(points(helped.m)) + ' on ' + fmt(helped.n) + ' posts.' });
      var rising = R.topics.filter(function (t) { return t.n > t.pn && t.n >= 5 && volumeMoved(t.n, t.pn); }).sort(function (x, y) { return (y.n - y.pn) - (x.n - x.pn); })[0];
      if (rising) ch.push({ tone: 0, head: rising.name + ' is rising', body: fmt(rising.n) + ' posts against ' + fmt(rising.pn) + ' before. Net mood on it is ' + signed(points(rising.m)) + '.' });
      R.feel.filter(function (e) { return (e.name === 'Opposition' || e.name === 'Anxiety') && shareMoved(e.n, R.cur.length, e.pn, R.prev.length) && e.share > e.pshare; }).forEach(function (e) { ch.push({ tone: -1, head: e.name + ' is up', body: e.share + '% of posts, up from ' + e.pshare + '%.' }); });
      if (moodShift < 0 && driver) todo.push({ what: 'Answer ' + driver.name + ' first', why: 'It carries ' + K.pct(driver.m.neg, negAll) + '% of this period’s negative posts while mood is falling.' });
      if (hurt) todo.push({ what: 'Put extra attention on ' + hurt.name, why: 'It is where mood dropped most, by ' + Math.abs(points(hurt.m) - points(hurt.pm)) + ' points.' });
      if (rising) { if (rising.m.net < -0.05) todo.push({ what: 'Prepare a response on ' + rising.name, why: 'It is growing and leans negative, at ' + signed(points(rising.m)) + ' net.' }); else if (rising.m.net > 0.05) todo.push({ what: 'Build on ' + rising.name + ' while it is rising', why: 'It is growing and leans positive, at ' + signed(points(rising.m)) + ' net.' }); else todo.push({ what: 'Watch ' + rising.name, why: 'It is growing, but opinion on it has not settled.' }); }
      if (volShift > 0 && moodShift >= 0 && !rising) todo.push({ what: 'Find out what brought the extra attention', why: 'Volume rose ' + Math.abs(pctChange(R.cur.length, R.prev.length)) + '% without hurting mood, which is worth repeating.' });
      if (volShift < 0) todo.push({ what: 'Check whether a campaign or event has ended', why: 'Volume fell ' + Math.abs(pctChange(R.cur.length, R.prev.length)) + '%.' });
      if (moodShift > 0) todo.push({ what: 'Note what went right this period', why: 'Mood rose ' + Math.abs(points(m) - points(pm)) + ' points, so the cause is worth finding and keeping.' });
    } else {
      ch.push({ tone: 0, head: 'No comparison chosen', body: 'This report covers the whole file, so it describes the period and cannot show change.' });
      var sour = R.plats.filter(function (g) { return g.n >= 30; }).sort(function (x, y) { return x.m.net - y.m.net; })[0];
      if (sour && R.plats.length > 1) todo.push({ what: 'Look closely at ' + sour.name, why: 'It has the lowest net mood of any platform, at ' + signed(points(sour.m)) + '.' });
    }
    if (driver && !todo.some(function (t) { return t.what.indexOf(driver.name) >= 0; })) todo.push({ what: 'Review the complaints on ' + driver.name, why: 'It is the largest single source of negative posts, at ' + K.pct(driver.m.neg, negAll) + '%.' });
    if (!todo.length) todo.push({ what: 'No action needed this period', why: 'Nothing moved beyond normal variation, so keep the current plan and check again next period.' });
    R.changed = ch.sort(function (x, y) { return (x.tone === -1 ? 0 : x.tone === 1 ? 1 : 2) - (y.tone === -1 ? 0 : y.tone === 1 ? 1 : 2); });
    R.todo = todo.slice(0, 4);
    var first = moodShift ? 'Mood ' + (moodShift > 0 ? 'rose' : 'fell') + ' from ' + signed(points(pm)) + ' to ' + signed(points(m)) : R.compare && R.prev.length ? 'Mood held steady at ' + signed(points(m)) : 'Net mood across the file is ' + signed(points(m));
    var second = volShift ? ', while volume ' + (volShift > 0 ? 'rose ' : 'fell ') + Math.abs(pctChange(R.cur.length, R.prev.length)) + '%' : R.compare && R.prev.length ? ' on steady volume' : ' across ' + fmt(R.cur.length) + ' posts';
    var third = moodShift < 0 && driver ? ', and ' + driver.name + ' is the biggest source of complaints.' : '.';
    R.short = first + second + third;
  }

  /* ---------------- the sheet ---------------- */
  var C = { ink: '#1a2332', mute: '#566176', line: '#dde2ea', band: '#e9f0f7', band2: '#f4f6f9', acc: '#1f5f8b', pos: '#1a7f5a', neg: '#b3362b', mid: '#8a94a6' };
  var CSS = '.rp{box-sizing:border-box;width:100%;max-width:794px;padding:44px 48px;background:#fff;color:' + C.ink + ';font:13px/1.55 Manrope,"Segoe UI",system-ui,sans-serif;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.rp *{box-sizing:border-box}.rp h1{margin:0;font:400 34px/1.15 Fraunces,Georgia,serif;letter-spacing:-.01em;color:' + C.ink + ';background:none;-webkit-text-fill-color:currentColor}.rp h2{margin:0 0 10px;padding-bottom:6px;border-bottom:1px solid ' + C.line + ';font:600 14px/1.3 Manrope,"Segoe UI",system-ui,sans-serif;color:' + C.ink + '}'
    + '.rp-meta{margin:6px 0 0;color:' + C.mute + ';font-size:12px}.rp-head{padding-bottom:16px;border-bottom:2px solid ' + C.ink + '}.rp section{margin-top:22px;break-inside:avoid}.rp section.long{break-inside:auto}.rp section.long tr{break-inside:avoid}'
    + '.rp-short{margin:0 0 12px;font:400 19px/1.35 Fraunces,Georgia,serif;color:' + C.ink + '}.rp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rp-kpi{padding:10px 12px;border:1px solid ' + C.line + ';border-radius:6px}.rp-kpi>span{display:block;font-size:10.5px;color:' + C.mute + '}.rp-kpi b{display:block;font:500 22px/1.25 Manrope,"Segoe UI",system-ui,sans-serif;font-variant-numeric:tabular-nums}.rp-kpi small{font-size:10.5px;color:' + C.mute + '}'
    + '.rp-list{list-style:none;margin:0;padding:0}.rp-list li{display:grid;grid-template-columns:14px minmax(0,1fr);gap:6px;padding:6px 0;border-bottom:1px solid ' + C.band2 + '}.rp-list i{width:9px;height:9px;margin-top:5px;border-radius:50%}.rp-list b{font-weight:600}.rp-list span{display:block;color:' + C.mute + '}'
    + '.rp-do{counter-reset:d;list-style:none;margin:0;padding:0}.rp-do li{counter-increment:d;display:grid;grid-template-columns:24px minmax(0,1fr);gap:6px;padding:6px 0}.rp-do li:before{content:counter(d);display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:' + C.acc + ';color:#fff;font-size:11px;font-weight:700}.rp-do b{font-weight:600}.rp-do span{display:block;color:' + C.mute + '}.rp-fine{margin:8px 0 0;font-size:11px;color:' + C.mute + '}'
    + '.rp table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}.rp th,.rp td{padding:6px 8px;text-align:right;border-bottom:1px solid ' + C.band2 + '}.rp th{font-size:10.5px;font-weight:600;color:' + C.mute + ';border-bottom:1px solid ' + C.line + '}.rp th:first-child,.rp td:first-child{text-align:left}.rp .up{color:' + C.pos + '}.rp .down{color:' + C.neg + '}'
    + '.rp svg{display:block;width:100%;height:auto}.rp-bar{display:grid;grid-template-columns:120px minmax(0,1fr) 92px;align-items:center;gap:8px;padding:3px 0;font-size:12px}.rp-bar div{height:12px;background:' + C.band2 + ';border-radius:2px}.rp-bar i{display:block;height:100%;border-radius:2px;background:' + C.acc + '}.rp-bar em{font-style:normal;text-align:right;color:' + C.mute + ';font-variant-numeric:tabular-nums}'
    + '.rp-posts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rp-post{padding:10px 12px;border:1px solid ' + C.line + ';border-left-width:3px;border-radius:4px;break-inside:avoid}.rp-post p{margin:0 0 4px;overflow-wrap:anywhere}.rp-post small{color:' + C.mute + ';font-size:10.5px}'
    + '.rp-empty{padding:30px 0;text-align:center;color:' + C.mute + '}.rp-foot{margin-top:24px;padding-top:8px;border-top:1px solid ' + C.line + ';display:flex;justify-content:space-between;gap:12px;font-size:10.5px;color:' + C.mute + '}'
    + '@media(max-width:640px){.rp{padding:24px 18px}.rp-kpis,.rp-posts{grid-template-columns:repeat(2,minmax(0,1fr))}.rp-bar{grid-template-columns:86px minmax(0,1fr) 78px}.rp-posts{grid-template-columns:1fr}.rp h1{font-size:27px}}';
  var PRINT = '@page{size:A4;margin:14mm}@media print{html,body{background:#fff!important}body:before{display:none!important}body>*:not(#print-root){display:none!important}#print-root{display:block!important}#print-root .rp{max-width:none;padding:0;border-radius:0}}';
  var sheetCss = document.createElement('style'); sheetCss.setAttribute('data-theme-skip', '1'); sheetCss.textContent = CSS + PRINT; document.head.appendChild(sheetCss);

  function periodText(R) { var f = function (d) { return K.dayName(F.dayStart(d)); }; return f(R.a) + ' to ' + f(R.b); }
  function arrow(d, unit) { var cls = d > 0 ? 'up' : d < 0 ? 'down' : ''; return '<span class="' + cls + '">' + signed(d) + (unit || '') + '</span>'; }
  function kpi(l, v, s) { return '<div class="rp-kpi"><span>' + l + '</span><b>' + v + '</b><small>' + s + '</small></div>'; }

  function chart(R) {
    var W = 720, H = 230, L = 34, RR = 8, top = 12, h1 = 130, y2 = 164, h2 = 38, days = F.days, x = function (d) { return L + (days > 1 ? d / (days - 1) : 0) * (W - L - RR); }, bw = Math.max(1, (W - L - RR) / Math.max(days, 1) - 1);
    var nets = [], vol = [], i; for (i = 0; i < days; i++) nets.push({ pos: 0, neg: 0, n: 0 }), vol.push(0);
    R.base.forEach(function (p) { vol[p.day]++; if (p.mood === null) return; var d = nets[p.day]; d.n++; if (p.mood > 0) d.pos++; else if (p.mood < 0) d.neg++; });
    var maxV = Math.max.apply(null, vol) || 1, vals = nets.map(function (d) { return d.n >= 3 ? (d.pos - d.neg) / d.n : null; }), mx = Math.max.apply(null, vals.map(function (v) { return v === null ? 0 : Math.abs(v); }).concat([.2])), Y = function (v) { return top + h1 / 2 - v / mx * h1 / 2; };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Net mood per period with volume bars beneath">';
    if (R.compare && R.prev.length) o += '<rect x="' + x(R.pa).toFixed(1) + '" y="' + top + '" width="' + Math.max(0, x(R.pb + 1 > days - 1 ? days - 1 : R.pb + 1) - x(R.pa)).toFixed(1) + '" height="' + (y2 + h2 - top) + '" fill="' + C.band2 + '"/>';
    o += '<rect x="' + x(R.a).toFixed(1) + '" y="' + top + '" width="' + Math.max(bw, x(R.b) - x(R.a)).toFixed(1) + '" height="' + (y2 + h2 - top) + '" fill="' + C.band + '"/>';
    [mx, 0, -mx].forEach(function (v) { o += '<line x1="' + L + '" x2="' + (W - RR) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + (v ? C.line : C.mid) + '" stroke-width="1"/><text x="' + (L - 5) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="' + C.mute + '">' + signed(Math.round(v * 100)) + '</text>'; });
    var d = '', pen = false; vals.forEach(function (v, k) { if (v === null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(k).toFixed(1) + ' ' + Y(v).toFixed(1); pen = true; });
    o += '<path d="' + d + '" fill="none" stroke="' + C.acc + '" stroke-width="2" stroke-linejoin="round"/>';
    vol.forEach(function (v, k) { var b = v / maxV * h2; if (b) o += '<rect x="' + (x(k) - bw / 2).toFixed(1) + '" y="' + (y2 + h2 - b).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + b.toFixed(1) + '" fill="' + C.mid + '"/>'; });
    K.ticks(days, 6).forEach(function (t) { o += '<text x="' + x(t).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="' + C.mute + '">' + esc(K.dayName(F.dayStart(t))) + '</text>'; });
    return o + '</svg><p class="rp-fine">Line: net mood, positive share minus negative share, in points. Bars: posts. Dark band: this period.' + (R.compare && R.prev.length ? ' Pale band: the period before.' : '') + '</p>';
  }
  function table(R, rows, name) {
    return '<table><thead><tr><th>' + name + '</th><th>Posts</th>' + (R.compare ? '<th>Change</th>' : '') + '<th>Net mood</th>' + (R.compare ? '<th>Mood change</th>' : '') + '</tr></thead><tbody>' + rows.map(function (g) { var dv = g.n - g.pn, dm = points(g.m) - points(g.pm), sure = moved(g.m, g.pm); return '<tr><td>' + esc(g.name) + '</td><td>' + fmt(g.n) + '</td>' + (R.compare ? '<td>' + arrow(dv) + '</td>' : '') + '<td>' + signed(points(g.m)) + '</td>' + (R.compare ? '<td>' + (sure ? arrow(dm) : '<span title="within normal variation">about the same</span>') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>';
  }
  function bars(rows, maxOf) { var mx = Math.max.apply(null, rows.map(maxOf).concat([1])); return rows.map(function (r) { return '<div class="rp-bar"><span>' + esc(r.name) + '</span><div><i style="width:' + (maxOf(r) / mx * 100).toFixed(1) + '%"></i></div><em>' + r.txt + '</em></div>'; }).join(''); }
  function postsBlock(R) {
    var ranked = R.cur.filter(function (p) { return p.type !== 'repost' && p.mood !== null; }).slice().sort(function (a, b) { return b.kids.length - a.kids.length || a.id.localeCompare(b.id); });
    var pick = ranked.filter(function (p) { return p.mood < 0; }).slice(0, 2).concat(ranked.filter(function (p) { return p.mood > 0; }).slice(0, 2));
    if (!pick.length) return '<p class="rp-fine">No labelled posts in this selection.</p>';
    return '<div class="rp-posts">' + pick.map(function (p) { return '<div class="rp-post" style="border-left-color:' + (p.mood < 0 ? C.neg : C.pos) + '"><p>' + esc(p.text) + '</p><small>' + esc(p.platform) + ' &middot; ' + esc(K.dayName(F.dayStart(p.day))) + ' &middot; ' + p.kids.length + ' direct repl' + (p.kids.length === 1 ? 'y' : 'ies') + '</small></div>'; }).join('') + '</div>';
  }
  function trustText(R) {
    var S2 = window.Senti && window.Senti.METRICS, out = [];
    if (!UP) { S2 = null; out.push('This report uses the demo “' + window.MURMUR_DEMO.name + '”. Every post and person in it is invented, so treat it as a demonstration.'); }
    else if (UP.moods === 'file') out.push('Mood comes from the labels in the uploaded file.');
    else if (UP.moodSource) { var HM = window.Hub && window.Hub.METRICS; out.push('The sentiment column was added by a Hugging Face model (' + UP.moodSource.model.split('/')[1] + '), running in this browser, for ' + fmt(UP.moodSource.read) + ' posts.' + (HM ? ' On hand-labelled text it had never seen, it told positive from negative correctly ' + HM.tweets.accuracy + '% of the time on ' + fmt(HM.tweets.n) + ' tweets and ' + HM.reviews.accuracy + '% on ' + fmt(HM.reviews.n) + ' reviews.' : '')); S2 = null; }
    else out.push('Mood ' + (UP.moods === 'both' ? 'comes partly from the uploaded file and is otherwise' : 'is') + ' estimated from the wording of each post.');
    if (S2) out.push('The wording model was tested on text people labelled by hand, which it had never seen. It told positive from negative correctly ' + S2.tweets.accuracy + '% of the time on ' + fmt(S2.tweets.n) + ' tweets and ' + S2.reviews.accuracy + '% on ' + fmt(S2.reviews.n) + ' reviews. It reads English only and can miss sarcasm.');
    out.push('A change is reported only when it is larger than chance would explain, at the 95% level. Groups with fewer than ' + K.K_MIN + ' people are left out. The suggested actions come from fixed rules and need a person’s judgement.');
    var other = R.cur.filter(function (p) { return p.lang && p.lang !== 'en'; }).length;
    if (other) out.push(K.pct(other, R.cur.length) + '% of these posts are not in English.');
    return out;
  }

  var LAST = null;
  function buildHtml() {
    var R = LAST = analyse(), by = [S.client && 'Prepared for ' + S.client, S.author && 'Prepared by ' + S.author].filter(Boolean).join(' · '), scope = [S.tag, Object.keys(S.plats).filter(function (k) { return S.plats[k]; }).length === F.platforms.length ? 'all platforms' : Object.keys(S.plats).filter(function (k) { return S.plats[k]; }).join(', ')].filter(Boolean).join(', ');
    var h = '<article class="rp"><header class="rp-head"><h1>' + esc(S.title || 'Audience report') + '</h1><p class="rp-meta">' + esc(periodText(R)) + ' &middot; ' + esc(scope) + (by ? '<br>' + esc(by) : '') + '</p></header>';
    if (R.tooFew) return h + '<div class="rp-empty">This selection has fewer than ' + K.K_MIN + ' people in it, so nothing is shown. Widen the period, topic or platforms.</div></article>';
    var on = S.parts, cmp = R.compare && R.prev.length;
    if (on.glance) h += '<section><p class="rp-short">' + esc(R.short) + '</p><div class="rp-kpis">' + kpi('Posts', fmt(R.cur.length), cmp ? arrow(pctChange(R.cur.length, R.prev.length), '%') + ' vs before' : 'in this period') + kpi('People', fmt(R.voices), cmp ? fmt(R.pvoices) + ' before' : 'distinct authors') + kpi('Net mood', signed(points(R.m)), cmp ? signed(points(R.pm)) + ' before' : 'positive minus negative') + kpi('Negative posts', R.m.negShare + '%', cmp ? R.pm.negShare + '% before' : 'of labelled posts') + '</div></section>';
    if (on.changed) h += '<section><h2>What changed</h2><ul class="rp-list">' + R.changed.map(function (c) { return '<li><i style="background:' + (c.tone < 0 ? C.neg : c.tone > 0 ? C.pos : C.mid) + '"></i><div><b>' + esc(c.head) + '</b><span>' + esc(c.body) + '</span></div></li>'; }).join('') + '</ul></section>';
    if (on.todo) h += '<section><h2>What to do</h2><ol class="rp-do">' + R.todo.map(function (t) { return '<li><div><b>' + esc(t.what) + '</b><span>' + esc(t.why) + '</span></div></li>'; }).join('') + '</ol></section>';
    if (on.trend) h += '<section><h2>Mood and volume over time</h2>' + chart(R) + '</section>';
    if (on.platforms && R.plats.length) h += '<section class="long"><h2>Platforms</h2>' + table(R, R.plats, 'Platform') + '</section>';
    if (on.topics && R.topics.length) h += '<section class="long"><h2>Topics</h2>' + table(R, R.topics.slice(0, 10), 'Topic') + '</section>';
    if (on.feelings) h += '<section><h2>Feelings</h2>' + bars(R.feel.map(function (e) { return { name: e.name, v: e.share, txt: e.share + '%' + (cmp ? ' (was ' + e.pshare + '%)' : '') }; }), function (r) { return r.v; }) + '</section>';
    if (on.regions && R.regions.length) h += '<section><h2>Regions</h2>' + bars(R.regions.slice(0, 8).map(function (g) { return { name: g.name, v: g.n, txt: fmt(g.n) + ' posts' }; }), function (r) { return r.v; }) + '</section>';
    if (on.posts) h += '<section><h2>Posts worth reading</h2>' + postsBlock(R) + '</section>';
    if (on.trust) h += '<section><h2>How far to trust this</h2><ul class="rp-list">' + trustText(R).map(function (t) { return '<li><i style="background:' + C.mid + '"></i><div>' + esc(t) + '</div></li>'; }).join('') + '</ul></section>';
    return h + '<div class="rp-foot"><span>Made with Murmuration</span><span>' + (UP ? 'Source: uploaded file' : 'Source: invented sample data') + '</span></div></article>';
  }
  function render() { var html = buildHtml(); $('preview').innerHTML = html; $('print-root').innerHTML = html; }
  $('preview').setAttribute('data-theme-skip', '1');
  render();

  /* ---------------- getting it out ---------------- */
  function note(t) { $('note').textContent = t; }
  function slug() { return (S.title || 'report').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 50) || 'report'; }
  $('do-pdf').addEventListener('click', function () { var t = document.title; document.title = slug(); note('In the print window, choose Save as PDF as the destination.'); window.print(); document.title = t; });
  $('do-file').addEventListener('click', function () {
    var doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(S.title || 'Audience report') + '</title><link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{margin:0;padding:24px 12px;background:#eef0f4;display:flex;justify-content:center}@media print{@page{size:A4;margin:14mm}body{padding:0;background:#fff;display:block}.rp{max-width:none!important;padding:0!important}}' + CSS + '</style></head><body>' + buildHtml() + '</body></html>';
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([doc], { type: 'text/html' })); a.href = url; a.download = slug() + '.html'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000); note('Saved. Anyone can open that file without Murmuration.');
  });
  function summaryText() {
    var R = LAST; if (R.tooFew) return 'Too few people in this selection to report on.';
    return [S.title || 'Audience report', periodText(R), '', R.short, '', 'What changed:'].concat(R.changed.map(function (c) { return '- ' + c.head + '. ' + c.body; }), ['', 'What to do:'], R.todo.map(function (t, i) { return (i + 1) + '. ' + t.what + '. ' + t.why; })).join('\n');
  }
  $('do-copy').addEventListener('click', function () {
    var t = summaryText(), done = function () { note('Summary copied. Paste it into an email or chat.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
    function fallback() { var x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = '0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); done(); } catch (e) { note('Copying was blocked by this browser.'); } x.remove(); }
  });
  window.Report = { analyse: analyse, get last() { return LAST; }, summary: summaryText, state: S };
})();
