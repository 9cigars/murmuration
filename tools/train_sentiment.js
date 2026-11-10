// Trains the mood reader and grades it on data it never saw. The datasets are not part of this repository.
//   node --max-old-space-size=4096 tools/train_sentiment.js <folder holding s140/ and uci/>
// Sentiment140: 1.6 million tweets labelled by their emoticons, used for training and for choosing settings.
// Final exams, used once and never for tuning: Sentiment140's hand-labelled test tweets and UCI's labelled reviews.
const fs = require('fs'), path = require('path'), readline = require('readline');
const Senti = require('../core/senti.js'), Kit = require('../core/kit.js');
const DIR = process.argv[2], OUT = path.join(__dirname, '../core/senti_model.js');
const TRAIN = path.join(DIR, 's140/training.1600000.processed.noemoticon.csv'), MANUAL = path.join(DIR, 's140/testdata.manual.2009.06.14.csv'), UCI = path.join(DIR, 'uci/sentiment labelled sentences');
const LINE = /^"(\d)","[^"]*","[^"]*","[^"]*","[^"]*","(.*)"\s*$/;
const MIN_DF = 15, SIZES = [15000, 30000, 60000], EPOCHS = 4;
function h(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
async function each(fn) { const rl = readline.createInterface({ input: fs.createReadStream(TRAIN, { encoding: 'latin1' }), crlfDelay: Infinity }); let n = 0; for await (const l of rl) { const m = LINE.exec(l); if (!m) continue; fn(m[1] === '4' ? 1 : 0, m[2], n++); } return n; }
const held = n => n % 50 === 0;

function csvFields(l) { const out = [], re = /"((?:[^"]|"")*)"/g; let m; while ((m = re.exec(l))) out.push(m[1].replace(/""/g, '"')); return out; }
const write = o => fs.writeFileSync(OUT, '/* Weights for the mood reader, made by tools/train_sentiment.js. */\n(function (r) { var m = ' + JSON.stringify(o) + ';\nif (typeof module !== "undefined" && module.exports) module.exports = m; r.SENTI_MODEL = m; })(typeof window !== "undefined" ? window : globalThis);\n');

(async () => {
  let modelObj, trainInfo;
  if (process.argv.includes('--exam')) { const old = require('../core/senti_model.js'); modelObj = { b: old.b, w: old.w }; trainInfo = old.metrics.train; } else {
  console.log('counting');
  const B = 1 << 25, ch = new Uint32Array(B);
  await each((y, t, n) => { if (!held(n)) for (const f of Senti.features(t)) ch[h(f) & (B - 1)]++; });
  console.log('collecting candidates');
  const stat = new Map(); let pos = 0, neg = 0;
  await each((y, t, n) => { if (held(n)) return; if (y) pos++; else neg++; for (const f of Senti.features(t)) { if (ch[h(f) & (B - 1)] < MIN_DF) continue; let s = stat.get(f); if (!s) stat.set(f, s = [0, 0]); s[y]++; } });
  const ranked = [...stat].filter(([, s]) => s[0] + s[1] >= MIN_DF).map(([f, s]) => { const a = s[1], b = s[0], c = pos - a, d = neg - b, N = pos + neg, e = (a * d - b * c); return [f, N * e / ((a + b) * (c + d)) * e / ((a + c) * (b + d))]; }).sort((x, y) => y[1] - x[1]).map(x => x[0]);
  console.log('candidates', ranked.length, 'train docs', pos + neg);
  const maxK = Math.max(...SIZES), rank = new Map(ranked.slice(0, maxK).map((f, i) => [f, i]));
  console.log('encoding');
  let idx = new Int32Array(1 << 26), len = 0; const off = [0], lab = [], hx = [], hy = [];
  await each((y, t, n) => { const ids = Senti.features(t).map(f => rank.get(f)).filter(v => v !== undefined); if (held(n)) { hx.push(Int32Array.from(ids)); hy.push(y); return; } if (len + ids.length > idx.length) { const b = new Int32Array(idx.length * 2); b.set(idx); idx = b; } idx.set(ids, len); len += ids.length; off.push(len); lab.push(y); });
  const D = lab.length, order = new Uint32Array(D).map((_, i) => i);
  function shuffle(seed) { const r = Kit.rngFrom(seed); for (let i = D - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; } }
  function fit(K, lambda) {
    const w = new Float32Array(K), G = new Float32Array(K).fill(1e-6); let b = 0, gb = 1e-6;
    for (let ep = 0; ep < EPOCHS; ep++) {
      shuffle(1000 + ep);
      for (let o = 0; o < D; o++) {
        const i = order[o]; let z = b;
        for (let k = off[i]; k < off[i + 1]; k++) { const f = idx[k]; if (f < K) z += w[f]; }
        const g = 1 / (1 + Math.exp(-z)) - lab[i];
        gb += g * g; b -= .1 * g / Math.sqrt(gb);
        for (let k = off[i]; k < off[i + 1]; k++) { const f = idx[k]; if (f >= K) continue; const gr = g + lambda * w[f]; G[f] += gr * gr; w[f] -= .1 * gr / Math.sqrt(G[f]); }
      }
    }
    return { w, b };
  }
  function heldAcc(m, K) { let r = 0; hx.forEach((x, i) => { let z = m.b; x.forEach(f => { if (f < K) z += m.w[f]; }); if ((z > 0 ? 1 : 0) === hy[i]) r++; }); return r / hx.length; }
  let best = null;
  for (const K of SIZES) for (const lambda of [0, 1e-5]) { const m = fit(K, lambda), a = heldAcc(m, K); console.log('K', K, 'lambda', lambda, 'held-out', (a * 100).toFixed(2)); if (!best || a > best.a + .001) best = { K, lambda, m, a }; }
  console.log('chosen', best.K, best.lambda);
  const lines = []; for (let i = 0; i < best.K; i++) { const v = Math.round(best.m.w[i] * 100) / 100; if (Math.abs(v) >= .03) lines.push(ranked[i] + ' ' + v); }
  modelObj = { b: Math.round(best.m.b * 1000) / 1000, w: lines.join('\n') };
  trainInfo = { docs: D, features: lines.length, heldOut: Math.round(best.a * 1000) / 10 };
  write(modelObj);
  }

  /* ---- the final exams, run with the code visitors get ---- */
  delete require.cache[require.resolve('../core/senti.js')]; delete require.cache[require.resolve('../core/senti_model.js')];
  const S2 = require('../core/senti.js');
  const manual = fs.readFileSync(MANUAL, 'latin1').split(/\r?\n/).filter(Boolean).map(csvFields).filter(f => f.length === 6).map(f => ({ t: f[5], y: f[0] === '4' ? 'positive' : f[0] === '0' ? 'negative' : 'neutral' }));
  const reviews = {}; ['amazon_cells', 'imdb', 'yelp'].forEach(n => { reviews[n] = fs.readFileSync(path.join(UCI, n + '_labelled.txt'), 'latin1').split(/\r?\n/).map(l => /^(.*)\t([01])\s*$/.exec(l)).filter(Boolean).map(m => ({ t: m[1], y: m[2] === '1' ? 'positive' : 'negative' })); });
  const oldRule = t => Kit.readSentence(t).score < 0 ? 'negative' : 'positive';
  function forced(list, f) { const c = { tp: 0, tn: 0, fp: 0, fn: 0 }; list.filter(x => x.y !== 'neutral').forEach(x => { const g = f(x.t), pos = x.y === 'positive'; if (g === 'positive' && pos) c.tp++; else if (g === 'negative' && !pos) c.tn++; else if (g === 'positive') c.fp++; else c.fn++; }); const n = c.tp + c.tn + c.fp + c.fn, pc = (a, b) => b ? Math.round(1000 * a / b) / 10 : 0; return { n, accuracy: pc(c.tp + c.tn, n), posPrecision: pc(c.tp, c.tp + c.fp), posRecall: pc(c.tp, c.tp + c.fn), negPrecision: pc(c.tn, c.tn + c.fn), negRecall: pc(c.tn, c.tn + c.fp), matrix: c }; }
  const newRead = t => { const r = S2.read(t); return r.p > .5 ? 'positive' : 'negative'; };
  const all = Object.values(reviews).flat();
  const three = { n: manual.length, right: manual.filter(x => S2.read(x.t).label === x.y).length, majority: Math.max(...['positive', 'negative', 'neutral'].map(c => manual.filter(x => x.y === c).length)) };
  const metrics = {
    tweets: Object.assign(forced(manual, newRead), { old: forced(manual, oldRule).accuracy }),
    reviews: Object.assign(forced(all, newRead), { old: forced(all, oldRule).accuracy }),
    byReview: Object.fromEntries(Object.entries(reviews).map(([k, v]) => [k, forced(v, newRead).accuracy])),
    three: { n: three.n, accuracy: Math.round(1000 * three.right / three.n) / 10, baseline: Math.round(1000 * three.majority / three.n) / 10 },
    train: trainInfo
  };
  modelObj.metrics = metrics; write(modelObj);
  console.log(JSON.stringify(metrics, null, 1));
  console.log('model size KB', Math.round(fs.statSync(OUT).size / 1024));
})().catch(e => { console.error(e); process.exit(1); });
