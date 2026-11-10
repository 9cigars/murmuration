/* Murmuration: the light theme.
   The dark theme is the site as written, and this file leaves it alone. In light mode every colour the site
   paints, in stylesheets, chart attributes, inline styles and canvases, passes through one translation:
   pale inks turn dark, dark panels turn white, bright hues deepen until they read on white, and gradients
   collapse to a single solid colour. Load this first, before any stylesheet. */
(function () {
  var KEY = 'murmuration-theme', root = document.documentElement, light = false;
  try { light = localStorage.getItem(KEY) === 'light'; } catch (e) { }

  /* ---- one colour ---- */
  function parse(t) {
    var m;
    if (t.charAt(0) === '#') {
      var h = t.slice(1);
      if (h.length === 3 || h.length === 4) h = h.replace(/./g, '$&$&');
      if (h.length !== 6 && h.length !== 8) return null;
      var n = parseInt(h.slice(0, 6), 16);
      return [n >> 16, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1];
    }
    if ((m = /^rgba?\(([^)]*)\)$/i.exec(t))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      if (p.length < 3 || p.some(isNaN)) return null;
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return null;
  }
  function toHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, Math.min(1, s), l];
  }
  function toRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, f = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return f.map(function (v) { return Math.round((v + m) * 255); });
  }
  function lum(rgb) { var a = rgb.map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
  function fmtC(rgb, a) { var f = Math.round(a * 1000) / 1000; return f >= 1 ? '#' + rgb.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('') : 'rgba(' + rgb.join(',') + ',' + f + ')'; }

  var OUT = {}, CACHE = new Map();
  function outKey(rgb, a) { return rgb.join(',') + ',' + (Math.round(a * 1000) / 1000); }
  function one(token) {
    var hit = CACHE.get(token); if (hit !== undefined) return hit;
    var c = parse(token), res = token;
    if (c && !OUT[outKey(c.slice(0, 3).map(Math.round), c[3])]) {
      var hsl = toHsl(c), h = hsl[0], s = hsl[1], l = hsl[2], a = c[3], rgb;
      if (s < .2 || (l > .72 && s < .5) || (l > .9 && s < .75)) {          // greys and pale inks flip over
        var ln = Math.max(.2, 1 - l); if (l >= .3 && a >= .5) ln = Math.min(ln, .42);
        if (ln > .9) { rgb = [255, 255, 255]; if (a >= .6) a = 1; }
        else { rgb = toRgb(45, .07, ln); if (a < .2) a = Math.min(1, a * 1.5); }   // inks are a soft warm charcoal, never pure black
      } else if (l < .16) { rgb = [255, 255, 255]; if (a >= .6) a = 1; }      // night-coloured panels become paper
      else if (l < .3) { rgb = toRgb(h, Math.min(.3, s * .35), .955); if (a >= .6) a = 1; }   // hover surfaces become a pale tint
      else {                                                                    // every hue is muted, then deepened until it reads on white
        var s2 = Math.min(s, .5), l2 = Math.min(l, .62); rgb = toRgb(h, s2, l2);
        while (1.05 / (lum(rgb) + .05) < 4.8 && l2 > .1) { l2 -= .01; rgb = toRgb(h, s2, l2); }
      }
      res = fmtC(rgb, a); OUT[outKey(rgb, a)] = 1;
    }
    if (CACHE.size > 30000) CACHE.clear();
    CACHE.set(token, res); return res;
  }

  /* ---- a value: gradients flatten first, then each colour token is translated ---- */
  var TOK = /url\([^)]*\)|#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g, HAS = /#[0-9a-fA-F]{3}|rgba?\(|gradient\(/i, GR = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/i;
  function splitTop(s) { var out = [], d = 0, st = 0; for (var i = 0; i < s.length; i++) { var c = s[i]; if (c === '(') d++; else if (c === ')') d--; else if (c === ',' && !d) { out.push(s.slice(st, i).trim()); st = i + 1; } } out.push(s.slice(st).trim()); return out; }
  function solidOf(args) {
    var parts = splitTop(args), i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (/^(to\s|from\s|at\s|circle|ellipse|closest|farthest|[-\d.]+(deg|turn|rad)|\d+(px|%)\s+\d+(px|%))/i.test(p)) continue;
      p = p.replace(/\s+[-\d.]+(px|%)?(\s+[-\d.]+(px|%)?)?$/, '');
      if (/^transparent$/i.test(p)) continue;
      var c = parse(p); if (c && c[3] === 0) continue;
      return p;
    }
    return 'transparent';
  }
  function flatten(v) {
    var m, guard = 0;
    while ((m = GR.exec(v)) && guard++ < 40) {
      var st = m.index + m[0].length, d = 1, i = st;
      for (; i < v.length && d; i++) { if (v[i] === '(') d++; else if (v[i] === ')') d--; }
      v = v.slice(0, m.index) + solidOf(v.slice(st, i - 1)) + v.slice(i);
    }
    return v;
  }
  function value(v) { if (!HAS.test(v)) return v; return flatten(v).replace(TOK, function (t) { return /^url/i.test(t) ? t : one(t); }); }
  function sheet(css) { return css.replace(/\{([^{}]*)\}/g, function (_, body) { return '{' + value(body) + '}'; }); }

  /* ---- stylesheets written into the page ---- */
  var SHEETS = new WeakMap();
  function doStyle(el) {
    if (el.id === 'mm-theme' || el.hasAttribute('data-theme-skip')) return;
    var cur = el.textContent, s = SHEETS.get(el);
    if (s && cur === s.m) return;
    if (!/\{/.test(cur)) return;
    var m = sheet(cur); SHEETS.set(el, { o: cur, m: m });
    if (m !== cur) el.textContent = m;
  }
  function undoStyle(el) { var s = SHEETS.get(el); if (s && el.textContent === s.m) el.textContent = s.o; }

  /* ---- colours on chart marks and inline styles ---- */
  var ATTRS = ['fill', 'stroke', 'stop-color', 'style'], STORE = new WeakMap(), HEAT = '.fgrid .c,.grid-h .c';
  function keep(el, attr, o, m) { var s = STORE.get(el); if (!s) STORE.set(el, s = {}); if (attr === 'style') { var p = s.style || (s.style = { props: {} }); p.o = o; p.m = m; o.split(';').forEach(function (d) { var i = d.indexOf(':'); if (i > 0 && HAS.test(d)) p.props[d.slice(0, i).trim()] = d.slice(i + 1).trim(); }); } else s[attr] = { o: o, m: m }; }
  function doAttr(el, attr) {
    var v = el.getAttribute(attr); if (!v || !HAS.test(v) || (el.closest && el.closest('[data-theme-skip]'))) return;
    var s = STORE.get(el), rec = s && s[attr]; if (rec && rec.m === v) return;
    var m = value(v);
    if (attr === 'style' && el.matches && el.matches(HEAT)) m = m.replace(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/g, function (_, r, g, b, x) { return 'rgba(' + r + ',' + g + ',' + b + ',' + (Math.round(Math.min(.5, x * .55) * 1000) / 1000) + ')'; });
    if (m === v) return;
    keep(el, attr, v, m); el.setAttribute(attr, m);
  }
  function doGrad(g) {
    var st = g.querySelectorAll('stop'); if (!st.length) return;
    var col = null, op = 0, i;
    for (i = 0; i < st.length; i++) { doAttr(st[i], 'stop-color'); if (col === null) col = st[i].getAttribute('stop-color'); var o = parseFloat(st[i].getAttribute('stop-opacity')); op = Math.max(op, isNaN(o) ? 1 : o); }
    for (i = 0; i < st.length; i++) {
      var s = STORE.get(st[i]) || {}; if (!s.grad) { s.grad = { c: st[i].getAttribute('stop-color'), oc: s['stop-color'] && s['stop-color'].o, op: st[i].getAttribute('stop-opacity') }; STORE.set(st[i], s); }
      st[i].setAttribute('stop-color', col); st[i].setAttribute('stop-opacity', op);
    }
  }
  function doNode(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'STYLE') return;
    var i, list = el.querySelectorAll ? el.querySelectorAll('[fill],[stroke],[style]') : [];
    ATTRS.forEach(function (a) { if (el.hasAttribute(a)) doAttr(el, a); });
    for (i = 0; i < list.length; i++) ATTRS.forEach(function (a) { if (list[i].hasAttribute(a)) doAttr(list[i], a); });
    var gs = el.querySelectorAll ? el.querySelectorAll('linearGradient,radialGradient') : [];
    for (i = 0; i < gs.length; i++) doGrad(gs[i]);
    if (/Gradient$/.test(el.nodeName)) doGrad(el);
  }
  function undoAll() {
    document.querySelectorAll('style').forEach(undoStyle);
    document.querySelectorAll('[fill],[stroke],[style],stop').forEach(function (el) {
      var s = STORE.get(el); if (!s) return;
      ['fill', 'stroke'].forEach(function (a) { if (s[a] && el.getAttribute(a) === s[a].m) el.setAttribute(a, s[a].o); });
      if (s.grad) { el.setAttribute('stop-color', s.grad.oc || s.grad.c); if (s.grad.op === null) el.removeAttribute('stop-opacity'); else el.setAttribute('stop-opacity', s.grad.op); }
      if (s.style) { if (el.getAttribute('style') === s.style.m) el.setAttribute('style', s.style.o); else Object.keys(s.style.props).forEach(function (p) { el.style.setProperty(p, s.style.props[p]); }); }
      STORE.delete(el);
    });
  }

  /* ---- watch the page while light mode is on ---- */
  var mo = new MutationObserver(function (recs) {
    if (!light) return;
    var parsing = document.readyState === 'loading';
    document.querySelectorAll('style').forEach(function (s) { if (!parsing || s.nextSibling) doStyle(s); });
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === 'attributes') { if (ATTRS.indexOf(r.attributeName) >= 0) doAttr(r.target, r.attributeName); }
      else for (var j = 0; j < r.addedNodes.length; j++) doNode(r.addedNodes[j]);
    }
  });
  mo.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', function () { if (light) { document.querySelectorAll('style').forEach(doStyle); doNode(document.documentElement); } });

  /* ---- canvases: the same translation, one setter deep ---- */
  function Flat() { this.best = null; this.alpha = -1; }
  Flat.prototype.addColorStop = function (o, c) { var p = parse(c), a = p ? p[3] : 1; if (a > this.alpha + 1e-6) { this.alpha = a; this.best = c; } };
  if (window.CanvasRenderingContext2D) {
    var P = CanvasRenderingContext2D.prototype;
    ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(P, prop); if (!d) return;
      Object.defineProperty(P, prop, { configurable: true, enumerable: true, get: d.get, set: function (v) { if (v instanceof Flat) v = v.best === null ? 'transparent' : one(v.best); else if (v instanceof String) v = String(v); else if (light && typeof v === 'string') v = one(v); d.set.call(this, v); } });
    });
    var gco = Object.getOwnPropertyDescriptor(P, 'globalCompositeOperation');
    if (gco) Object.defineProperty(P, 'globalCompositeOperation', { configurable: true, enumerable: true, get: gco.get, set: function (v) { gco.set.call(this, light && (v === 'lighter' || v === 'screen') ? 'source-over' : v); } });
    ['createLinearGradient', 'createRadialGradient', 'createConicGradient'].forEach(function (fn) { var o = P[fn]; if (o) P[fn] = function () { return light ? new Flat() : o.apply(this, arguments); }; });
  }

  /* ---- the hand-picked rules: solid surfaces, flat panels, no glow ---- */
  var L = 'html[data-theme=light] ';
  var css = ''
    + L.trim() + '{color-scheme:light;--bg:#ffffff;--ink:#37352f;--muted:#6b6a66;--faint:#73726e;--line:#e9e9e7;--glass:#ffffff;--glass2:#f7f6f3;--glow1:#ffffff;--glow2:#ffffff;--glow3:#ffffff;background:#ffffff}'
    + L + 'body{background:#ffffff}' + L + 'body:before{background:#ffffff}'
    + L + '*{text-shadow:none!important}'
    + L + '.aurora,' + L + '.kpi:before{display:none}'
    + L + '.stage:before{background-image:none}'
    + L + '.stage{background:#fff;box-shadow:none;border-color:#e9e9e7}' + L + '.kpi,' + L + '.plate,' + L + '.glass{box-shadow:none}'
    + L + '.sky-hero{background:#f7f6f3}'
    + L + '.note,' + L + '.room,' + L + '.persona,' + L + '.sec{background:#fff}'
    + L + '.hint,' + L + '.cap,' + L + '.never .lab,' + L + '.note .head,' + L + '.room p{color:#55534e}'
    + L + '.trow .name,' + L + '.never span.x{color:#55534e}'
    + L + '.sbar{background:#f1f1ef}'
    + L + '.never span.x{border-color:#e9e9e7}'
    + L + '.banner{background:#fbf3db;border-color:#f1e5bc;color:#5f4b1b}'
    + L + 'textarea.box{background:#fff}'
    + L + '.scrub input::-webkit-slider-thumb{box-shadow:none}' + L + '.scrub input::-moz-range-thumb{box-shadow:none}'
    + L + '.lp-back{background:rgba(55,53,47,.3)}' + L + '.lp-door{background:rgba(55,53,47,.42);color:#37352f}'
    + L + '.lp-tip,' + L + '.lp-drawer{background:#fff;color:#37352f;border-color:#e9e9e7}'
    + L + '.lp-tip{box-shadow:0 3px 10px rgba(55,53,47,.1)}'
    + L + '.lp-card{background:#fff;box-shadow:none}'
    + L + '.lp-dock a,' + L + '.lp-dock button{background:#fff;color:#37352f;border-color:#e9e9e7;box-shadow:none;backdrop-filter:none}' + L + '.lp-dock a:hover,' + L + '.lp-dock button:hover{background:#f7f6f3}'
    + L + '.lp-dock .go,' + L + '.lp-dock .go:hover{background:#37352f;color:#fff;border-color:transparent;filter:none}'
    + L + 'h1 em{background:var(--a,var(--teal,var(--vine,#8c6a2f)));-webkit-background-clip:text;background-clip:text}'
    + L + '.byo-drop{background:#fff}'
    + L + '.gate,' + L + '.gate b{color:#55534e}'
    + '@keyframes mm-solid{0%,100%{color:#8c6a2f}20%{color:#337ea9}40%{color:#448361}60%{color:#b4533c}80%{color:#9065b0}}'
    + L + '.hero-t h1 em{background:none;-webkit-background-clip:border-box;background-clip:border-box;-webkit-text-fill-color:currentColor;color:#8c6a2f;animation:mm-solid 15s linear infinite}'
    + '@media(prefers-reduced-motion:reduce){' + L + '.hero-t h1 em{animation:none}}'
    + '@view-transition{navigation:auto}::view-transition-old(root),::view-transition-new(root){animation-duration:.32s}';
  var tag = document.createElement('style'); tag.id = 'mm-theme'; tag.textContent = css; document.head.appendChild(tag);

  function metaScheme() { var m = document.querySelector('meta[name=color-scheme]'); if (m) m.content = light ? 'light' : 'dark'; }
  function mark() { if (light) root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme'); metaScheme(); }
  document.addEventListener('DOMContentLoaded', metaScheme);
  mark();

  function set(next) {
    next = !!next; if (next === light) return;
    light = next;
    try { localStorage.setItem(KEY, light ? 'light' : 'dark'); } catch (e) { }
    mark();
    if (light) { document.querySelectorAll('style').forEach(doStyle); doNode(document.documentElement); } else undoAll();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { light: light } }));
    window.dispatchEvent(new Event('resize'));
  }
  window.Theme = {
    get light() { return light; },
    set: set,
    toggle: function () { set(!light); },
    /* A colour chosen for light mode on purpose, painted as written. */
    keep: function (c) { return new String(c); },
    map: value
  };
})();
