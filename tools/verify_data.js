// Checks the dataset and cross-checks every chapter's engine against a separate count of the raw file.
//   node tools/verify_data.js
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..'), csvPath = path.join(root, 'data', 'audience_sample.csv'), jsPath = path.join(root, 'data', 'audience_sample.js');
const Prof = require('../core/profiler.js'), Kit = require('../core/kit.js'), Net = require('../grapevine/network.js');
let fails = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail !== undefined ? '  (' + detail + ')' : '')); if (!ok) fails++; }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

const before = sha(csvPath); execFileSync(process.execPath, [path.join(root, 'tools', 'make_sample.js')], { stdio: 'ignore' });
check('generator reproduces the file byte for byte', sha(csvPath) === before);

const text = fs.readFileSync(csvPath, 'utf8'), rows = Prof.parseCSV(text);
const sandbox = {}; new Function('window', fs.readFileSync(jsPath, 'utf8'))(sandbox);
check('script copy matches the CSV', sandbox.SAMPLE_AUDIENCE_CSV === text.replace(/^﻿/, ''));
const COLS = 'post_id platform user_id timestamp text parent_id language user_bio user_location followers joined interaction ref_post_id sentiment'.split(' ');
check('all 14 columns present', COLS.every(c => c in rows[0]));
check('every row has the same columns', rows.every(r => Object.keys(r).length === COLS.length));
const ids = new Map(rows.map((r, i) => [r.post_id, i]));
check('post_id is unique', ids.size === rows.length, rows.length + ' rows');
const tsRe = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
check('timestamps well formed', rows.every(r => tsRe.test(r.timestamp) && !isNaN(Date.parse(r.timestamp.replace(' ', 'T') + 'Z'))));
check('rows are in time order', rows.every((r, i) => !i || rows[i - 1].timestamp <= r.timestamp), rows[0].timestamp + ' to ' + rows[rows.length - 1].timestamp);
check('sentiment values valid', rows.every(r => ['positive', 'neutral', 'negative'].includes(r.sentiment)));
check('interaction values valid', rows.every(r => ['post', 'reply', 'quote', 'repost', 'share'].includes(r.interaction)));
check('platforms valid', rows.every(r => ['X', 'Telegram', 'Instagram', 'Facebook', 'YouTube', 'Reddit'].includes(r.platform)));
check('every author is an anonymous code', rows.every(r => /^anon-[0-9a-f]{16}$/.test(r.user_id)));
check('no email in post text', !rows.some(r => /[\w.+-]+@[\w.-]+\.\w{2,}/.test(r.text)));
check('no @handle in post text', !rows.some(r => /(^|\s)@\w/.test(r.text)));
const reacts = rows.filter(r => r.interaction !== 'post');
check('originals have no reference', rows.filter(r => r.interaction === 'post').every(r => !r.ref_post_id && !r.parent_id));
check('every reaction points to a real post', reacts.every(r => ids.has(r.ref_post_id)), reacts.length + ' reactions');
check('no post reacts to the future', reacts.every(r => rows[ids.get(r.ref_post_id)].timestamp <= r.timestamp));
check('parent_id is set only on replies', rows.every(r => r.interaction === 'reply' ? r.parent_id === r.ref_post_id : !r.parent_id));
check('only shares cross platforms', reacts.every(r => r.interaction === 'share' || rows[ids.get(r.ref_post_id)].platform === r.platform));
const byUser = new Map(); rows.forEach(r => { const u = byUser.get(r.user_id) || { p: new Set(), b: new Set(), l: new Set(), f: new Set(), j: new Set() }; u.p.add(r.platform); u.b.add(r.user_bio); u.l.add(r.user_location); u.f.add(r.followers); u.j.add(r.joined); byUser.set(r.user_id, u); });
check('each voice stays on one platform with one profile', [...byUser.values()].every(u => u.p.size === 1 && u.b.size === 1 && u.l.size === 1 && u.f.size === 1 && u.j.size === 1), byUser.size + ' voices');
check('join dates precede the month', rows.every(r => r.joined < '2026-10-08'));
check('followers are positive whole numbers', rows.every(r => /^\d+$/.test(r.followers) && +r.followers > 0));
const perDay = {}; rows.forEach(r => { const d = r.timestamp.slice(0, 10); perDay[d] = (perDay[d] || 0) + 1; }); const dv = Object.values(perDay), avg = dv.reduce((a, b) => a + b, 0) / dv.length;
check('no day holds a suspicious pile-up', Math.max(...dv) < avg * 2.5, 'max ' + Math.max(...dv) + ', mean ' + Math.round(avg));

/* independent recounts against each engine */
const raw = { posts: rows.length, voices: byUser.size, pos: rows.filter(r => r.sentiment === 'positive').length, neg: rows.filter(r => r.sentiment === 'negative').length, reacts: reacts.length };
const orgs = new Set(rows.filter(r => /official campaign account/i.test(r.user_bio)).map(r => r.user_id));
const F = Kit.buildFeed(text), M = Kit.moodStats(F.posts);
check('feed: posts and voices', F.posts.length === raw.posts && F.voices.size === raw.voices, raw.posts + ' / ' + raw.voices);
check('feed: mood counts', M.pos === raw.pos && M.neg === raw.neg, raw.pos + ' warm, ' + raw.neg + ' sour');
check('feed: links resolved', F.posts.filter(p => p.ref >= 0).length === raw.reacts, raw.reacts);
const tagRaw = {}; rows.forEach(r => { const m = r.text.match(/#[A-Za-z0-9_]{2,}/); if (m) tagRaw[m[0]] = (tagRaw[m[0]] || 0) + 1; });
check('feed: every trend total matches', F.tags.every(t => t.n === tagRaw[t.tag] && t.daily.reduce((a, b) => a + b, 0) === t.n), F.tags.length + ' trends');
const bt = Kit.backtest(F); check('forecaster never exceeds logic bounds', bt.topHit >= 0 && bt.topHit <= 100 && bt.right <= bt.picks, 'hit ' + bt.topHit + '%, chance ' + bt.chance + '%');
const ag = Prof.aggregate(Prof.buildProfiles(rows), 5);
check('atlas: audience excludes brand accounts', ag.audience === raw.voices - orgs.size && ag.organisations === orgs.size, ag.audience + ' + ' + orgs.size);
check('atlas: mood totals exclude only brand posts', ag.moods[0] === rows.filter(r => r.sentiment === 'positive' && !orgs.has(r.user_id)).length);
check('atlas: no group smaller than 5 is shown exactly', ['language', 'region', 'age'].every(k => ag[k].items.every(i => i.grouped || i.n >= 5)));
const G = Net.build(rows, Prof), selfRefs = reacts.filter(r => rows[ids.get(r.ref_post_id)].user_id === r.user_id).length;
check('grapevine: exchanges equal reactions minus self-replies', G.stats.interactions === raw.reacts - selfRefs, G.stats.interactions + ' (' + selfRefs + ' self)');
check('grapevine: voices never carry a raw id', G.nodes.every(n => !('uid' in n) && !('bio' in n) && !('loc' in n)));
check('grapevine: every codename is unique', new Set(G.nodes.map(n => n.name)).size === G.nodes.length);
check('grapevine: communities cover connected voices', G.comms.reduce((s, c) => s + c.size, 0) <= G.stats.voices, G.comms.length + ' circles');
check('grapevine: PageRank sums to one', Math.abs(G.nodes.reduce((s, n) => s + n.pr, 0) - 1) < 1e-6);
console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
fs.writeFileSync(path.join(root, 'tools', '.expected.json'), JSON.stringify({ posts: raw.posts, voices: raw.voices, audience: ag.audience, threads: G.stats.threads, connected: G.stats.voices, reacts: raw.reacts, tags: F.tags.length, warm: M.posShare, sour: M.negShare, hit: bt.topHit }));
process.exit(fails ? 1 : 0);
