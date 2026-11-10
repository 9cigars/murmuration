/* Murmuration: the flight path.
   Every page gets a rail of perches, one for each section and plate. A small bird rides the rail as you scroll.
   Click a perch, use the arrows at either end, or press J and K to move within a room. On phones the rail folds
   into a compass beside the dock. A bar at the foot of the screen names the next section and the next room.
   The show is saved for changing rooms: keep scrolling at the end of a page, or follow any room link, and a
   flock carries you through. */
(function () {
  if (window.MURMUR_EMPTY) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = '.fl{position:fixed;z-index:58;top:50%;right:max(3px,calc((100vw - 1320px)/2 - 34px));transform:translateY(-50%);width:24px;font:500 12px/1.2 var(--sans,Manrope,system-ui,sans-serif);color:var(--ink,#eef1f8)}'
    + ':where(.fl) button,:where(.fl) a{all:unset;box-sizing:border-box;cursor:pointer;display:block}'
    + '.fl-arrow{width:24px;height:24px;display:grid!important;place-items:center;border-radius:50%;color:var(--muted,#a3abbd);transition:color .15s,background .15s}.fl-arrow:hover,.fl-arrow:focus-visible{color:var(--dark-on-a,#231602);background:var(--a,#ffc266)}.fl-arrow svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + '.fl-track{position:relative;margin:6px 0}'
    + '.fl-line{position:absolute;left:50%;top:0;bottom:0;width:1px;margin-left:-.5px;background:rgba(255,255,255,.18)}.fl-fill{position:absolute;left:0;top:0;width:1px;height:100%;transform-origin:top;background:var(--a,#ffc266);transform:scaleY(0)}'
    + '.fl-s{position:absolute;left:0;width:24px;height:22px;margin-top:-11px}'
    + '.fl-dot{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px;border-radius:50%;background:#6e778c;transition:transform .18s,background .18s}.fl-s.l1 .fl-dot{width:9px;height:9px;margin:-4.5px;background:#0d0f19;border:1.5px solid var(--a,#ffc266);box-sizing:border-box}'
    + '.fl-s:hover .fl-dot,.fl-s:focus-visible .fl-dot{transform:scale(1.5);background:var(--a,#ffc266)}.fl-s[aria-current=true] .fl-dot{background:var(--a,#ffc266)}.fl-s.past.l2 .fl-dot{background:var(--a,#ffc266)}'
    + '.fl-lab{position:absolute;right:30px;top:50%;translate:10px -50%;opacity:0;visibility:hidden;white-space:nowrap;max-width:300px;overflow:hidden;text-overflow:ellipsis;padding:2px 10px;border-radius:99px;background:#10121d;border:1px solid rgba(255,255,255,.14);font-size:11.5px;color:#a3abbd;transition:opacity .16s,translate .16s,visibility .16s;transition-delay:calc(var(--i)*9ms)}.fl-s.l1 .fl-lab{font:italic 400 13.5px var(--display,Georgia,serif);color:#eef1f8}.fl-s:hover .fl-lab,.fl-s[aria-current=true] .fl-lab{color:var(--a,#ffc266);border-color:var(--a,#ffc266)}'
    + '.fl.open .fl-lab{opacity:1;visibility:visible;translate:0 -50%}'
    + '.fl-bird{position:absolute;left:50%;top:0;width:20px;height:20px;margin:-10px;pointer-events:none;fill:var(--a,#ffc266);will-change:transform}'
    + '.fl-keys{position:absolute;right:30px;top:-27px;opacity:0;visibility:hidden;white-space:nowrap;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint,#6e778c);transition:opacity .16s,visibility .16s}.fl.open .fl-keys{opacity:1;visibility:visible}.fl-keys kbd{font:inherit;padding:0 5px;border:1px solid rgba(255,255,255,.2);border-radius:4px}'
    + '.fl-compass{display:none;position:fixed;z-index:60;left:10px;bottom:10px;align-items:center;height:38px;padding:0 2px;border-radius:99px;background:#141724;border:1px solid rgba(255,255,255,.16);color:#eef1f8;font:600 12px var(--sans,Manrope,system-ui,sans-serif)}.fl-compass button{all:unset;box-sizing:border-box;cursor:pointer;display:grid;place-items:center;min-width:34px;height:34px;border-radius:99px;font-variant-numeric:tabular-nums}.fl-compass .c{padding:0 4px;color:var(--a,#ffc266)}.fl-compass svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
    + '.fl-sheet{display:none;position:fixed;z-index:61;left:10px;right:10px;bottom:56px;max-height:62vh;overflow:auto;padding:8px;border-radius:18px;background:#141724;border:1px solid rgba(255,255,255,.16);font:13px/1.3 var(--sans,Manrope,system-ui,sans-serif);color:#eef1f8}.fl-sheet.on{display:block}.fl-sheet button{all:unset;box-sizing:border-box;cursor:pointer;display:block;width:100%;padding:9px 12px;border-radius:10px}.fl-sheet button.l1{font:italic 400 16px var(--display,Georgia,serif)}.fl-sheet button.l2{padding-left:26px;color:#a3abbd}.fl-sheet button[aria-current=true]{color:var(--a,#ffc266);background:rgba(255,255,255,.07)}'
    + '@media(max-width:860px){.fl{display:none}.fl-compass{display:flex}}'
    + '.fl-sweep{position:fixed;inset:0;width:100%;height:100%;z-index:91;pointer-events:none}'
    + 'body{padding-bottom:72px}.fl-next{--ac:var(--a,var(--teal,var(--vine,#ffc266)));position:fixed;z-index:58;left:0;right:0;bottom:14px;margin-inline:auto;width:fit-content;max-width:calc(100vw - 20px);height:44px;display:flex;align-items:stretch;border-radius:99px;background:#141724;border:1px solid rgba(255,255,255,.16);color:#eef1f8;font:500 12px/1.2 var(--sans,Manrope,system-ui,sans-serif);white-space:nowrap}'
    + '.fl-go{all:unset;box-sizing:border-box;cursor:pointer;flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:9px;padding:0 15px 0 5px;border-radius:99px;transition:background .22s,color .22s}.fl-go:hover,.fl-go:focus-visible,.fl-next.ripe .fl-go{background:var(--ac);color:var(--dark-on-a,#231602)}'
    + '.fl-ring{flex:none;width:32px;height:32px;fill:none;stroke-linecap:round}.fl-ring .bg{stroke:currentColor;opacity:.2;stroke-width:2}.fl-ring .pg{stroke:var(--ac);stroke-width:2.4;transform:rotate(-90deg);transform-origin:16px 16px}.fl-go:hover .pg,.fl-go:focus-visible .pg,.fl-next.ripe .pg{stroke:currentColor}.fl-ring .ch{stroke:currentColor;stroke-width:2;stroke-linejoin:round;transform-origin:16px 16px;transition:transform .22s}.fl-next.to-room .ch{transform:rotate(-90deg)}.fl-next.to-top .ch{transform:rotate(180deg)}'
    + '.fl-t{display:flex;align-items:baseline;gap:7px;min-width:0}.fl-t small{flex:none;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.72}.fl-t b{display:block;min-width:0;max-width:280px;overflow:hidden;text-overflow:ellipsis;font:italic 400 15.5px/1.3 var(--display,Georgia,serif)}.fl-t b.swap{animation:fl-swap .3s ease-out}@keyframes fl-swap{from{opacity:0;translate:0 7px}}'
    + '.fl-go kbd{flex:none;margin-left:3px;padding:1px 6px;font:inherit;font-size:10px;letter-spacing:.04em;border:1px solid currentColor;border-radius:5px;opacity:.6}'
    + '.fl-room{flex:none;display:flex;align-items:center;gap:6px;padding:0 15px 0 11px;margin-left:2px;border-left:1px solid rgba(255,255,255,.14);color:var(--muted,#a3abbd);font-size:12px;text-decoration:none;transition:color .15s}.fl-room:hover,.fl-room:focus-visible{color:var(--ac)}.fl-room[hidden]{display:none}.fl-room span{max-width:170px;overflow:hidden;text-overflow:ellipsis}'
    + '.fl-divide,.fl-curtain{--ac:var(--a,var(--teal,var(--vine,#ffc266)))}.fl-divide{--p:0;display:flex;align-items:center;gap:14px;width:100%;height:30px;margin:56px 0 12px;color:var(--faint,#6e778c);font:600 10.5px/1 var(--sans,Manrope,system-ui,sans-serif);letter-spacing:.11em;text-transform:uppercase}.fl-divide i{flex:1;position:relative;height:1px;background:rgba(255,255,255,.17);overflow:hidden}.fl-divide i::after{content:"";position:absolute;inset:0;background:var(--ac);transform:scaleX(var(--p));transition:transform .18s}.fl-divide i:first-child::after{transform-origin:right}.fl-divide i:last-child::after{transform-origin:left}'
    + '.fl-mid{flex:none;display:flex;align-items:center;gap:0;white-space:nowrap;transition:gap .2s}.fl-mid svg{width:20px;height:20px;fill:currentColor;transform:translateY(calc(var(--p)*-5px)) scale(calc(1 + var(--p)*.4));transition:transform .18s}.fl-mid em{font-style:normal;max-width:0;opacity:0;overflow:hidden;transition:max-width .24s,opacity .2s}.fl-divide.held{color:var(--ac)}.fl-divide.held .fl-mid,.fl-divide.end .fl-mid{gap:9px}.fl-divide.held .fl-mid em,.fl-divide.end .fl-mid em{max-width:320px;opacity:1}'
    + '.fl-curtain{position:fixed;inset:0;z-index:90;display:grid;place-content:center;justify-items:center;gap:8px;padding:20px;text-align:center;background:var(--bg,#0d0f19);color:var(--ink,#eef1f8);animation:fl-up .44s cubic-bezier(.7,0,.2,1) both}@keyframes fl-up{from{transform:translateY(100%)}}.fl-curtain small{font:600 11px var(--sans,Manrope,system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:var(--ac)}.fl-curtain b{font:italic 400 clamp(38px,7vw,84px)/1.1 var(--display,Georgia,serif)}'
    + '@media(max-width:1180px){body{padding-bottom:118px}.fl-next{bottom:58px}.fl-go kbd{display:none}}@media(max-width:620px){.fl-t b{max-width:none}.fl-room span{display:none}.fl-room::before{content:"Room"}}'
    + '@media print{.fl,.fl-compass,.fl-sheet,.fl-sweep,.fl-next,.fl-divide,.fl-curtain{display:none}body{padding-bottom:0}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var CHEV_UP = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 8l4-4 4 4"/></svg>', CHEV_DOWN = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4"/></svg>';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var shown = function (e) { return !!(e && e.getClientRects().length); };
  function pageY(e) { var y = 0; while (e) { y += e.offsetTop; e = e.offsetParent; } return y; }
  function textOf(e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }

  /* ---- the perches, read from the page itself ---- */
  function collect() {
    var lastSec = null, out = [], hero = document.querySelector('.sky-hero') || document.querySelector('.hero');
    var brand = document.querySelector('.brand div');
    out.push({ el: hero, label: brand ? textOf(brand.firstChild) : document.title, lv: 1, top: true });
    document.querySelectorAll('.stage[aria-label],.section-head,.plate,.faceoff,.sec').forEach(function (e) {
      if (!shown(e)) return;
      if (e.classList.contains('stage')) out.push({ el: e, label: e.getAttribute('aria-label'), lv: 1 });
      else if (e.classList.contains('section-head')) out.push({ el: e, label: textOf(e.querySelector('h2')), lv: 1 });
      else if (e.classList.contains('plate') && e.previousElementSibling && e.previousElementSibling.classList.contains('section-head') && !e.parentElement.classList.contains('plates')) return;
      else if (e.classList.contains('sec')) { var no = textOf(e.querySelector('.no')).split('.')[0]; if (no !== lastSec) { lastSec = no; out.push({ el: e, label: no + ' \u00b7 ' + textOf(e.querySelector('h3')), lv: 2 }); } }
      else if (e.classList.contains('plate')) { var id = e.getAttribute('aria-labelledby'), h = id ? document.getElementById(id) : e.querySelector('h3'); if (h) out.push({ el: e, label: textOf(h), lv: 2 }); }
    });
    var next = document.querySelector('footer a.nx') || document.querySelector('footer a[href]');
    if (next) out.push({ link: next.getAttribute('href'), label: textOf(next).replace(/\s*[→]\s*$/, ''), lv: 1, el: document.querySelector('footer') });
    return out.filter(function (s) { return s.el && s.label; });
  }

  var pin = null;
  function pinned() { return pin && Math.abs(scrollY - pin.y) < 3; }
  var stops = [], nav, track, fill, bird, compass, count, sheet, current = -1, ys = [];
  var bar, barGo, barSmall, barName, barRing, barRoom, barRoomName, barKey = '';
  var gates = [], hold = null, holdT = 0, PULL = 260, leaving = false;
  var BIRD = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 11C7 6 4 5 1 5c2 3 4 6 9 8z"/><path d="M10 11c3-5 6-6 9-6-2 3-4 6-9 8z"/></svg>';
  function sig(a) { return a.map(function (s) { return s.label; }).join('|'); }

  function build() {
    var found = collect(); if (sig(found) === sig(stops) && nav) return;
    clearHold(); stops = found;
    document.querySelectorAll('.fl-divide').forEach(function (d) { d.remove(); });
    stops.forEach(function (s) {
      if (s.top || s.lv !== 1) return;
      var d = document.createElement('div'); d.className = 'fl-divide' + (s.link ? ' end' : ''); d.setAttribute('aria-hidden', 'true');
      d.innerHTML = s.link ? '<i></i><span class="fl-mid">' + BIRD + '<em>Keep scrolling for ' + esc(roomName(s)) + '</em></span><i></i>' : '<i></i>';
      s.el.parentNode.insertBefore(d, s.el); s.div = d;
    });
    if (nav) nav.remove(); if (compass) compass.remove(); if (sheet) sheet.remove(); if (bar) bar.remove();
    nav = document.createElement('nav'); nav.className = 'fl'; nav.setAttribute('aria-label', 'Sections on this page');
    nav.innerHTML = '<div class="fl-keys">press <kbd>J</kbd> <kbd>K</kbd> to fly</div><button type="button" class="fl-arrow" data-go="-1" aria-label="Previous section">' + CHEV_UP + '</button><div class="fl-track"><div class="fl-line"><i class="fl-fill"></i></div>'
      + stops.map(function (s, i) { return '<a class="fl-s l' + s.lv + '" href="' + (s.link ? esc(s.link) : '#') + '" data-i="' + i + '" style="--i:' + i + '" aria-label="' + esc(s.label) + '"><span class="fl-dot"></span><span class="fl-lab">' + esc(s.label) + '</span></a>'; }).join('')
      + '<svg class="fl-bird" viewBox="0 0 20 20" aria-hidden="true"><path class="w1" d="M10 11C7 6 4 5 1 5c2 3 4 6 9 8z"/><path class="w2" d="M10 11c3-5 6-6 9-6-2 3-4 6-9 8z"/></svg></div><button type="button" class="fl-arrow" data-go="1" aria-label="Next section">' + CHEV_DOWN + '</button>';
    document.body.appendChild(nav);
    track = nav.querySelector('.fl-track'); fill = nav.querySelector('.fl-fill'); bird = nav.querySelector('.fl-bird');
    compass = document.createElement('div'); compass.className = 'fl-compass';
    compass.innerHTML = '<button type="button" data-go="-1" aria-label="Previous section">' + CHEV_UP + '</button><button type="button" class="c" aria-label="All sections" aria-expanded="false"></button><button type="button" data-go="1" aria-label="Next section">' + CHEV_DOWN + '</button>';
    document.body.appendChild(compass); count = compass.querySelector('.c');
    sheet = document.createElement('div'); sheet.className = 'fl-sheet';
    sheet.innerHTML = stops.map(function (s, i) { return '<button type="button" class="l' + s.lv + '" data-i="' + i + '">' + esc(s.label) + '</button>'; }).join('');
    document.body.appendChild(sheet);
    bar = document.createElement('div'); bar.className = 'fl-next';
    bar.innerHTML = '<button type="button" class="fl-go"><svg class="fl-ring" viewBox="0 0 32 32" aria-hidden="true"><circle class="bg" cx="16" cy="16" r="13"/><circle class="pg" cx="16" cy="16" r="13" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/><path class="ch" d="M11.5 14l4.5 4.5 4.5-4.5"/></svg><span class="fl-t"><small></small><b></b></span><kbd>Space</kbd></button><a class="fl-room" hidden><span></span><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3"/></svg></a>';
    document.body.appendChild(bar);
    barGo = bar.querySelector('.fl-go'); barSmall = bar.querySelector('small'); barName = bar.querySelector('b'); barRing = bar.querySelector('.pg'); barRoom = bar.querySelector('.fl-room'); barRoomName = barRoom.querySelector('span'); barKey = '';
    barGo.addEventListener('click', goNext);
    nav.addEventListener('click', onClick); compass.addEventListener('click', onClick); sheet.addEventListener('click', onClick);
    nav.addEventListener('pointerenter', function () { nav.classList.add('open'); });
    nav.addEventListener('pointerleave', function () { nav.classList.remove('open'); });
    nav.addEventListener('focusin', function () { nav.classList.add('open'); });
    nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) nav.classList.remove('open'); });
    current = -1; layout();
  }

  function targetOf(i) {
    var s = stops[i]; if (s.top) return 0;
    var max = document.documentElement.scrollHeight - innerHeight;
    var isHead = s.el.classList.contains('section-head');
    return Math.max(0, Math.min(max, pageY(s.el) - (isHead ? 8 : 24)));
  }
  function layout() {
    if (!nav) return;
    var avail = Math.max(120, innerHeight - 230), gap = Math.max(16, Math.min(30, avail / Math.max(1, stops.length - 1))), h = gap * (stops.length - 1);
    track.style.height = h + 'px';
    nav.querySelectorAll('.fl-s').forEach(function (a, i) { a.style.top = (i * gap) + 'px'; });
    ys = stops.map(function (_, i) { return targetOf(i); });
    // The only gate is the end of the page, where the next room waits.
    var out = exitStop(); gates = out ? [{ y: document.documentElement.scrollHeight - innerHeight, end: true, out: out, div: out.div }] : [];
    spy();
  }

  /* ---- the bird rides between perches ---- */
  var ticking = false;
  function spy() {
    ticking = false; if (!nav || !ys.length) return;
    var y = scrollY, max = document.documentElement.scrollHeight - innerHeight, n = ys.length, last = n - 1, stopsOnly = n, i = 0;
    if (stops[last].link) stopsOnly = n - 1;           // the last perch leaves the page, so the bird lands one before it
    for (var k = 0; k < stopsOnly; k++) if (ys[k] <= y + 40) i = k;
    var nextY = i + 1 < stopsOnly ? ys[i + 1] : Math.max(max, ys[i] + 1), f = Math.max(0, Math.min(1, (y - ys[i]) / Math.max(1, nextY - ys[i])));
    if (i === stopsOnly - 1 || y >= max - 2) { i = stopsOnly - 1; f = 0; }
    if (pinned()) { i = pin.i; f = 0; }
    var h = track.offsetHeight, step = n > 1 ? h / (n - 1) : 0, py = (i + f) * step;
    bird.style.transform = 'translateY(' + py.toFixed(1) + 'px)';
    fill.style.transform = 'scaleY(' + (h ? (py / h).toFixed(4) : 0) + ')';
    if (i !== current) {
      current = i;
      nav.querySelectorAll('.fl-s').forEach(function (a, j) { if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); a.classList.toggle('past', j < i); });
      sheet.querySelectorAll('button').forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      count.textContent = (i + 1) + ' / ' + stopsOnly;
    }
    paintBar();
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });

  /* ---- the bar at the foot of the screen: what comes next, and how close it is ---- */
  function lastStop() { return stops[stops.length - 1].link ? stops.length - 2 : stops.length - 1; }
  function nextIndex() { var p = pinned(), base = p ? ys[pin.i] : scrollY, room = p ? 4 : 40; for (var i = 0; i <= lastStop(); i++) if (ys[i] > base + room) return i; return -1; }
  function exitStop() { var s = stops[stops.length - 1]; return s.link ? s : null; }
  function roomName(s) { return s.label.replace(/^Next:\s*/, ''); }
  function goNext() { var k = nextIndex(), out = exitStop(); if (k >= 0) flyTo(k); else if (out) leave(out); else flyTo(0); }
  function leave(s) {
    if (leaving) return;
    if (reduce) { location.href = s.link; return; }
    leaving = true;
    var c = document.createElement('div'); c.className = 'fl-curtain'; c.innerHTML = '<small>Now entering</small><b>' + esc(roomName(s)) + '</b>'; document.body.appendChild(c);
    sweep(1, 560);
    setTimeout(function () { location.href = s.link; }, 760);
  }
  addEventListener('pageshow', function () { leaving = false; document.querySelectorAll('.fl-curtain,.fl-sweep').forEach(function (c) { c.remove(); }); clearHold(); });

  /* ---- any link to another room gets the same send-off ---- */
  var PLACES = { listen: 'Data Ingestion & Timeline', weather: 'Sentiment Analysis', atlas: 'Audience Demographics', swell: 'Trend Intelligence', grapevine: 'Network & Influence Analysis', blueprint: 'Methodology', report: 'Export Report' };
  function placeOf(url) { var m = /\/(?:([a-z]+)\/)?index\.html$/.exec(url.pathname) || /\/(?:([a-z]+)\/)?$/.exec(url.pathname); if (!m) return null; return m[1] && PLACES[m[1]] ? PLACES[m[1]] : (m[1] ? null : 'The flock'); }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download') || a.closest('.fl,.fl-sheet')) return;
    var u; try { u = new URL(a.href); } catch (x) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname) return;
    if (location.protocol !== 'file:' && !u.pathname.startsWith(location.pathname.replace(/(?:[a-z]+\/)?(?:index\.html)?$/, ''))) return;
    var name = placeOf(u); if (!name) return;
    e.preventDefault(); leave({ link: a.href, label: name });
  });

  /* ---- the end of a page: it holds, and if you keep scrolling the next room opens ---- */
  function clearHold() { clearTimeout(holdT); if (!hold) return; var d = hold.g.div; if (d) { d.classList.remove('held'); d.style.setProperty('--p', 0); } hold = null; barKey = ''; paintBar(); }
  function showPull(g, pull) {
    if (!hold || hold.g !== g) { clearHold(); hold = { g: g, pull: 0, t0: performance.now() }; if (g.div) g.div.classList.add('held'); barKey = ''; }
    hold.pull = pull; if (g.div) g.div.style.setProperty('--p', Math.min(1, pull / PULL).toFixed(3)); paintBar();
  }
  function openGate(g) { clearHold(); leave(g.out); }
  function addPull(g, n) {
    showPull(g, (hold && hold.g === g ? hold.pull : 0) + n);
    clearTimeout(holdT); holdT = setTimeout(clearHold, 420);
    if (hold.pull >= PULL && performance.now() - hold.t0 >= 260) openGate(g);
  }
  function scrollsInside(t) { for (; t && t.nodeType === 1 && t !== document.body && t !== document.documentElement; t = t.parentElement) { if (t.scrollHeight > t.clientHeight + 1) { var o = getComputedStyle(t).overflowY; if ((o === 'auto' || o === 'scroll') && t.scrollTop + t.clientHeight < t.scrollHeight - 1) return true; } } return false; }
  /* A trackpad keeps sending wheel events after the fingers lift, so momentum alone must not open the next room:
     for the first moments at the end only a fresh gesture, after a pause, counts. */
  var wasAtEnd = false, arrivedAt = 0, lastWheelAt = 0, freshGesture = false;
  addEventListener('wheel', function (e) {
    if (e.defaultPrevented || e.ctrlKey || !gates.length || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (leaving) { e.preventDefault(); return; }
    var now = performance.now(), g = gates[0], atEnd = scrollY >= g.y - 1, gap = now - lastWheelAt > 260;
    lastWheelAt = now;
    if (atEnd && !wasAtEnd) { arrivedAt = now; freshGesture = false; }
    wasAtEnd = atEnd;
    if (document.querySelector('.lp-drawer.on,.lp-door.on')) return;
    var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (dy <= 0) { clearHold(); return; }
    if (!atEnd || scrollsInside(e.target)) return;
    if (gap && now !== arrivedAt) freshGesture = true;
    if (!freshGesture && now - arrivedAt < 600) return;
    e.preventDefault();
    addPull(g, Math.min(dy, 130));
  }, { passive: false });
  /* on a touch screen the page end takes the same pull: drag up past the end and let go */
  var touchFrom = null;
  addEventListener('touchstart', function () { touchFrom = null; }, { passive: true });
  addEventListener('touchmove', function (e) {
    var g = gates[gates.length - 1]; if (!g || !g.end || e.touches.length !== 1 || document.querySelector('.lp-drawer.on,.lp-door.on')) return;
    if (scrollY < g.y - 2) { touchFrom = null; if (hold) clearHold(); return; }
    var cy = e.touches[0].clientY; if (touchFrom === null) touchFrom = cy;
    var d = touchFrom - cy; if (d > 10) showPull(g, Math.min(PULL, d * 2.6)); else if (hold) clearHold();
  }, { passive: true });
  addEventListener('touchend', function () { if (hold && hold.g.end && hold.pull >= PULL) openGate(hold.g); else if (hold) clearHold(); touchFrom = null; }, { passive: true });
  function paintBar() {
    if (!bar) return;
    var k = hold ? (hold.g.end ? -1 : hold.g.i) : nextIndex(), out = exitStop(), mode = k >= 0 ? 'sec' : out ? 'room' : 'top', p = 1;
    if (hold) p = Math.min(1, hold.pull / PULL);
    else if (k >= 0) { var from = 0; for (var j = 0; j < k; j++) if (ys[j] < ys[k]) from = ys[j]; p = Math.max(0, Math.min(1, (scrollY - from) / Math.max(1, ys[k] - from))); }
    var small = hold ? 'Keep scrolling' : mode === 'sec' ? 'Next' : mode === 'room' ? 'Onward' : '', name = mode === 'sec' ? stops[k].label : mode === 'room' ? roomName(out) : 'Back to the top', key = mode + '|' + small + '|' + name;
    barRing.setAttribute('stroke-dashoffset', (100 - p * 100).toFixed(1));
    bar.classList.toggle('ripe', !!hold || mode !== 'sec' || p > .8);
    if (key === barKey) return;
    var had = barKey; barKey = key;
    bar.classList.toggle('to-room', mode === 'room'); bar.classList.toggle('to-top', mode === 'top');
    barSmall.textContent = small; barName.textContent = name; barGo.setAttribute('aria-label', (small ? small + ': ' : '') + name);
    if (had && !reduce) { barName.classList.remove('swap'); void barName.offsetWidth; barName.classList.add('swap'); }
    barRoom.hidden = mode !== 'sec' || !out;
    if (out) { barRoom.href = out.link; barRoomName.textContent = roomName(out); barRoom.setAttribute('aria-label', 'Skip to ' + roomName(out)); }
  }

  /* ---- a quick, plain glide within a room ---- */
  var glide = null;
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function stopGlide() { if (glide) { cancelAnimationFrame(glide.raf); glide = null; } }
  ['wheel', 'touchstart'].forEach(function (ev) { addEventListener(ev, stopGlide, { passive: true }); });
  function flyTo(i) {
    var s = stops[i]; if (!s) return;
    if (s.link) { leave(s); return; }
    stopGlide();
    var from = scrollY, to = targetOf(i), dist = Math.abs(to - from);
    function land() { pin = { i: i, y: scrollY }; spy(); if (s.top) return; if (!s.el.hasAttribute('tabindex')) s.el.setAttribute('tabindex', '-1'); s.el.style.outline = 'none'; s.el.focus({ preventScroll: true }); }
    if (reduce || dist < 2) { window.scrollTo({ top: to, behavior: 'instant' }); land(); return; }
    var dur = Math.min(480, 220 + dist / 12), t0 = performance.now();
    glide = { raf: 0 };
    (function frame(now) {
      if (!glide) return;
      var p = Math.min(1, (now - t0) / dur), goal = targetOf(i);
      window.scrollTo({ top: from + (goal - from) * ease(p), behavior: 'instant' });
      if (p < 1) glide.raf = requestAnimationFrame(frame); else { glide = null; land(); }
    })(t0);
  }
  function sweep(dir, dur) {
    var old = document.querySelector('.fl-sweep'); if (old) old.remove();
    var c = document.createElement('canvas'); c.className = 'fl-sweep'; document.body.appendChild(c);
    var dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight; c.width = W * dpr; c.height = H * dpr;
    var g = c.getContext('2d'); g.scale(dpr, dpr);
    var cs = getComputedStyle(document.documentElement), A = cs.getPropertyValue('--a').trim() || '#ffc266', B = cs.getPropertyValue('--b').trim() || A, n = Math.round(Math.min(70, W / 16)), birds = [], i;
    for (i = 0; i < n; i++) birds.push({ x: W * (.08 + .84 * Math.random()), lag: Math.random() * .36, off: Math.random() * 6.28, s: .7 + Math.random() * .9, col: i % 3 ? A : B });
    var t0 = performance.now(), life = dur + 280;
    (function frame(now) {
      var p = (now - t0) / life; g.clearRect(0, 0, W, H);
      if (p >= 1) { c.remove(); return; }
      birds.forEach(function (b) {
        var q = (p * 1.36 - b.lag); if (q <= 0 || q >= 1) return;
        var e = ease(q), y = dir > 0 ? -40 + e * (H + 80) : H + 40 - e * (H + 80), x = b.x + Math.sin(q * 6 + b.off) * 46 + (W / 2 - b.x) * .35 * Math.sin(q * Math.PI);
        var vx = Math.cos(q * 6 + b.off) * .55, vy = dir, m = Math.sqrt(vx * vx + vy * vy), ux = vx / m, uy = vy / m, sz = 5 * b.s;
        g.globalAlpha = Math.sin(q * Math.PI) * .95; g.fillStyle = b.col; g.beginPath(); g.moveTo(x + ux * sz * 1.4, y + uy * sz * 1.4); g.lineTo(x - ux * sz - uy * sz * .9, y - uy * sz + ux * sz * .9); g.lineTo(x - ux * sz + uy * sz * .9, y - uy * sz - ux * sz * .9); g.fill();
      });
      requestAnimationFrame(frame);
    })(t0);
  }

  function step(d) { var last = stops[stops.length - 1].link ? stops.length - 2 : stops.length - 1, p = pinned(), base = p ? ys[pin.i] : scrollY, room = p ? 4 : 40, i; if (d > 0) { for (i = 0; i <= last; i++) if (ys[i] > base + room) return flyTo(i); } else { for (i = last; i >= 0; i--) if (ys[i] < base - room) return flyTo(i); } }
  function onClick(e) {
    var go = e.target.closest('[data-go]'), s = e.target.closest('[data-i]');
    if (go) { e.preventDefault(); step(+go.getAttribute('data-go')); return; }
    if (e.target.closest('.c')) { var on = sheet.classList.toggle('on'); count.setAttribute('aria-expanded', on); return; }
    if (s) { e.preventDefault(); sheet.classList.remove('on'); count.setAttribute('aria-expanded', 'false'); flyTo(+s.getAttribute('data-i')); }
  }
  addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase(), space = e.key === ' ', arrow = e.key === 'ArrowDown' || e.key === 'PageDown'; if (!space && !arrow && k !== 'j' && k !== 'k') return;
    var t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (document.querySelector('.lp-drawer.on,.lp-door.on')) return;
    if (arrow) { var eg = gates[gates.length - 1]; if (eg && eg.end && scrollY >= eg.y - 2 && !(t && t.closest && t.closest('[role=slider],[role=tab],[role=listbox],[role=menu]'))) { e.preventDefault(); addPull(eg, 130); } return; }
    if (space) {
      if (t && t.closest && t.closest('button,a,summary,label,audio,video,[role=button],[role=slider],[role=tab],[tabindex]:not([tabindex="-1"])')) return;
      e.preventDefault(); if (e.repeat) return;
      if (e.shiftKey) step(-1); else goNext();
      return;
    }
    e.preventDefault(); step(k === 'j' ? 1 : -1);
  });
  document.addEventListener('click', function (e) { if (sheet && sheet.classList.contains('on') && !e.target.closest('.fl-sheet,.fl-compass')) { sheet.classList.remove('on'); count.setAttribute('aria-expanded', 'false'); } });

  function init() {
    build();
    var pending = 0;
    function later() { clearTimeout(pending); pending = setTimeout(function () { build(); layout(); }, 120); }
    addEventListener('resize', later);
    if ('ResizeObserver' in window) new ResizeObserver(later).observe(document.body);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.Flight = { fly: flyTo, step: step, next: goNext, get nextIndex() { return nextIndex(); }, get stops() { return stops; }, get current() { return current; } };
})();
