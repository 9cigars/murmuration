/* Murmuration: the mood reader.
 * A small logistic-regression model that reads the wording of an English post and says how likely it is to be
 * positive. It was trained offline (tools/train_sentiment.js) and runs entirely in the visitor's browser.
 * Works in the browser and in Node, so the training script and the checks use exactly this code. */
(function (root) {
  'use strict';
  var NEG = { not: 1, no: 1, never: 1, nor: 1, cannot: 1, none: 1, nobody: 1, nothing: 1, neither: 1, hardly: 1, barely: 1, scarcely: 1, without: 1 };
  var STOP = /^(?:[.,;:]+|but|however|although|though)$/;
  /* Emoticons and emoji were stripped from the training data, so these few are fixed nudges rather than learned weights. */
  var GOOD = /[:;=]-?[)D\]]|\(-?[:;=]|<3|[\u{1F600}-\u{1F60D}\u{1F60E}\u{1F618}\u{1F44D}\u{1F389}\u{2764}\u{1F64C}\u{1F44F}\u{1F60A}]/gu;
  var BAD = /[:;=]-?[(\[\/\\]|\)-?[:;=]|[\u{1F620}-\u{1F62D}\u{1F44E}\u{1F621}\u{1F4A9}\u{1F61E}\u{1F622}]/gu;

  function clean(t) {
    return String(t || '').toLowerCase().replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#0?39;/g, "'").replace(/[‘’]/g, "'")
      .replace(/https?:\/\/\S+|www\.\S+/g, ' xurl ').replace(/@[a-z0-9_]+/g, ' xuser ').replace(/\[[a-z_ ]*(?:handle|email|phone|link|number)[a-z_ ]*\]/g, ' xuser ').replace(/#/g, ' ').replace(/([\p{L}])\1{2,}/gu, '$1$1');
  }
  function tokens(t) { return clean(t).match(/[\p{L}\p{N}']+|[.,;:!?]/gu) || []; }
  /* Words and word pairs. Anything within three words after a negation is marked, so "not good" is not "good". */
  function features(t) {
    var w = tokens(t), out = new Set(), left = 0, i, x, prev = null;
    for (i = 0; i < w.length; i++) {
      x = w[i];
      if (x === '!' || x === '?') { out.add(x); prev = null; continue; }
      if (STOP.test(x)) { left = 0; prev = null; if (x !== '.' && x !== ',' && x !== ';' && x !== ':') out.add(x); continue; }
      out.add(left > 0 ? 'NOT_' + x : x);
      if (prev) out.add(prev + '_' + x);
      prev = x;
      if (NEG[x] || /n't$/.test(x)) left = 3; else if (left > 0) left--;
    }
    return Array.from(out);
  }

  var M = null;
  function model() {
    if (M) return M;
    var src = root.SENTI_MODEL || (typeof require !== 'undefined' ? (function () { try { return require('./senti_model.js'); } catch (e) { return null; } })() : null);
    if (!src) return null;
    var w = new Map();
    src.w.split('\n').forEach(function (line) { var k = line.lastIndexOf(' '); if (k > 0) w.set(line.slice(0, k), parseFloat(line.slice(k + 1))); });
    return (M = { b: src.b, w: w, metrics: src.metrics || null });
  }
  function logistic(z) { return 1 / (1 + Math.exp(-z)); }
  function count(re, s) { var m = String(s || '').match(re); return m ? m.length : 0; }

  /* Is this English enough to be worth reading? Long Latin-script posts must look like the vocabulary the model knows. */
  function englishLike(t) {
    var s = String(t || ''), letters = s.match(/\p{L}/gu) || [], latin = s.match(/[a-zA-ZÀ-ɏ]/g) || [];
    if (letters.length && latin.length / letters.length < .7) return false;
    var m = model(); if (!m) return true;
    var w = tokens(s).filter(function (x) { return /\p{L}/u.test(x) && x !== 'xurl' && x !== 'xuser'; });
    if (w.length < 4) return true;
    var known = w.filter(function (x) { return m.w.has(x) || m.w.has('NOT_' + x); }).length;
    return known / w.length >= .5;
  }

  var BAND = .15;   // between 35% and 65% the model is not sure, and says neutral
  function read(text) {
    var m = model(); if (!m) return null;
    if (!englishLike(text)) return { label: null, p: .5, why: [], known: 0, english: false };
    var f = features(text), z = m.b, why = [], known = 0;
    f.forEach(function (x) { var v = m.w.get(x); if (v === undefined) return; z += v; known++; why.push({ word: x.replace(/^NOT_/, 'not ').replace(/_/g, ' '), value: v }); });
    var g = count(GOOD, text), b = count(BAD, text);
    z += 1.4 * Math.min(g, 3) - 1.4 * Math.min(b, 3);
    var p = logistic(z), sure = known > 0 || g + b > 0;
    why.sort(function (x, y) { return Math.abs(y.value) - Math.abs(x.value); });
    return { label: !sure || Math.abs(p - .5) < BAND ? 'neutral' : p > .5 ? 'positive' : 'negative', p: p, why: why.slice(0, 5), known: known, english: true };
  }

  var api = { features: features, tokens: tokens, read: read, englishLike: englishLike, BAND: BAND, get METRICS() { var m = model(); return m && m.metrics; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Senti = api;
})(typeof window !== 'undefined' ? window : globalThis);
