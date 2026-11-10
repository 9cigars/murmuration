// Writes the brand demos in data/demos/: a CSV in the product's format, a .js twin so pages work when opened from
// disk, and raw/<name>_no_sentiment.csv for trying the Hugging Face step. Run: node tools/make_demos.js
// The moments are real and dated from public reporting. Every post, person and number of followers is invented.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'data', 'demos'); fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
const HEAD = ['post_id', 'platform', 'user_id', 'timestamp', 'text', 'parent_id', 'language', 'user_bio', 'user_location', 'followers', 'joined', 'interaction', 'ref_post_id', 'sentiment'];

/* ---------------- shared voice ---------------- */
const GEN = {
  pos: ["Didn't expect to like this.", '{B} cooked here.', 'Fair play to {B}.', 'Genuinely impressed.', 'This is how you do it.', 'More of this please.', 'Taking notes for our own launch.', 'Ok I take back what I said last week.'],
  neg: ['Who signed off on this?', '{B}, read the room.', 'Not buying it.', 'Hard pass.', 'Big miss.', 'Expected better from {B}.', 'Embarrassing.', 'This is why people are annoyed.'],
  neu: ['Curious how this plays out.', 'Waiting for the numbers.', 'Will reserve judgement.', 'Saving this to check back in a month.', 'Anyone have the full details?', 'Genuinely asking.']
};
const OPEN = ['ok so ', 'ngl ', 'honestly ', 'tbh ', 'Hot take: ', 'Unpopular opinion: ', 'Not gonna lie, ', 'Real question: ', 'lol ', 'So '];
const EMO = { pos: ['🔥', '👏', '😍', '🙌', '💯', '✨', '😂'], neg: ['🤦', '😬', '🙄', '👎', '💀', '😤', '😭'], neu: ['🤔', '👀', '🧐'] };
const REPLY = {
  pos: ['Exactly this.', 'Agreed, it is good.', 'Same, loved it', '100%', 'This is the take.', 'Finally someone said it', 'Glad it worked for you!'],
  neg: ['Nah, hard disagree.', 'lol no', 'Exactly, it is a mess', 'Same experience, really bad.', 'This is cope.', 'Nope.'],
  neu: ['Source?', 'Is this confirmed?', 'Wait what happened?', 'Interesting, why?', 'Where did you see this?', 'Following']
};
const FOREIGN = {
  de: { pos: ['Mutig von {B}, ehrlich gesagt.', 'Gefällt mir richtig gut.', 'Stark gemacht.'], neg: ['Wirklich enttäuschend.', 'Das versteht doch keiner.', 'Nicht überzeugt.'], neu: ['Mal sehen, wie es weitergeht.', 'Gibt es schon Details?'] },
  fr: { pos: ['Audacieux, j’aime bien.', 'Franchement réussi.', 'Bravo {B}.'], neg: ['Vraiment décevant.', 'Je n’ai rien compris.', 'Pas convaincu du tout.'], neu: ['On attend de voir la suite.', 'Quelqu’un a plus d’infos ?'] },
  es: { pos: ['Valiente, me gusta.', 'Muy bien hecho por {B}.', 'Me encanta.'], neg: ['Qué decepción.', 'No entiendo nada.', 'Para nada convencido.'], neu: ['A ver qué pasa.', '¿Alguien tiene más detalles?'] },
  it: { pos: ['Coraggioso, mi piace.', 'Fatto davvero bene.'], neg: ['Che delusione.', 'Non ci ho capito niente.'], neu: ['Vediamo come va.', 'Qualcuno ha più dettagli?'] },
  pt: { pos: ['Gostei muito, {B} acertou.', 'Ficou incrível.'], neg: ['Que decepção.', 'Não gostei nada.'], neu: ['Vamos ver no que dá.', 'Alguém tem mais detalhes?'] },
  ja: { pos: ['これはすごい、{B}やるね。', '正直かなり良い。'], neg: ['ちょっと残念。', '値段が高すぎる。'], neu: ['続報を待ちます。', '詳細はまだかな？'] },
  ko: { pos: ['진짜 잘 만들었다.', '마음에 들어요.'], neg: ['좀 실망이에요.', '너무 비싸요.'], neu: ['좀 더 지켜봐야겠어요.', '자세한 정보 있나요?'] },
  zh: { pos: ['这次做得真不错。', '很喜欢。'], neg: ['有点失望。', '太贵了。'], neu: ['再观望一下。', '有更多消息吗？'] },
  hi: { pos: ['सच में बढ़िया लगा।', 'लंबी अवधि के लिए अच्छा लगता है।', 'मज़ा आ गया।'], neg: ['बहुत निराश हूँ।', 'कीमत बहुत ज़्यादा है।', 'फिर से वही परेशानी।'], neu: ['आगे क्या होता है देखते हैं।', 'किसी को पूरी जानकारी है?'] }
};

/* ---------------- the five moments ---------------- */
const BRANDS = [
  {
    id: 'jaguar', file: 'jaguar_rebrand', prefix: 'jag', seed: 1902, start: '2024-11-12', days: 31, posts: 3400, ppu: 2.6,
    names: ['Jaguar', 'Jag', 'JLR'], tag: '#Jaguar',
    platforms: [['X', 34], ['Reddit', 18], ['YouTube', 14], ['Instagram', 16], ['Facebook', 14], ['Telegram', 4]],
    bias: { Reddit: -.25, YouTube: -.15, X: -.1, Instagram: .15, Facebook: -.1, Telegram: 0 },
    langs: [['en', 86], ['de', 4], ['fr', 3], ['it', 3], ['es', 4]],
    locs: [['London, UK', 14, 0], ['Manchester, UK', 5, 0], ['Coventry, UK', 4, 0], ['Edinburgh, Scotland', 3, 0], ['Dublin, Ireland', 2, 0], ['Munich, Germany', 3, 1], ['Paris, France', 2, 1], ['Milan, Italy', 2, 1], ['Madrid, Spain', 2, 1], ['New York, USA', 6, -5], ['Los Angeles, California', 4, -8], ['Miami, USA', 3, -5], ['Toronto, Canada', 3, -5], ['Dubai, UAE', 2, 4], ['Mumbai, India', 2, 5.5], ['Sydney, Australia', 2, 11], ['', 26, 0]],
    bios: ['Car nut · weekend track days', 'Motoring journalist and road tester', 'Brand designer · type nerd', 'Retired engineer, E-Type owner', 'Marketing lead at a B2B firm', 'Dad, football, coffee', 'Petrolhead and photographer', 'Creative director · advertising', 'EV early adopter · tech gadgets', 'Classic car restorer', 'Student · automotive design', 'Small business owner · two Jags in the garage', 'Investor · consumer brands'],
    orgs: ['Official page for motoring news', 'Official brand account · car culture media'],
    base: 30, mood0: -.05,
    events: [{ day: 7, amp: 10, decay: .42, tone: -.5, hour: 9 }, { day: 9, amp: 3, decay: .6, tone: -.25, hour: 15 }, { day: 19, amp: 2.5, decay: .9, tone: -.3, hour: 20 }, { day: 21, amp: 7, decay: .5, tone: .2, hour: 1 }],
    topics: [
      { tag: '#CopyNothing', from: 7, peak: 7, width: 6, tail: .25, w: 3, tone: -.4, pos: ['The Copy Nothing film is bold and I am here for it.', 'Say what you want, everyone is talking about Jaguar again.', 'Finally a car brand that does not look like every other car brand.', 'The colours in that film are stunning, give the art director a raise.', 'Brave move. Heritage brands die by playing it safe.'], neg: ['A car advert with no cars in it. Genius.', 'Copy Nothing, sell nothing.', 'I watched it twice and still do not know what they are selling.', 'This feels like a perfume ad, not Jaguar.', 'My dad drove Jaguars for 30 years and he would hate this.', 'Delete ordinary? They deleted the customers.', 'Spent a fortune on a film that says nothing about the cars.'], neu: ['Has Jaguar actually said what car this is for?', 'So the new car comes in December?', 'Is this a teaser or the whole campaign?'] },
      { tag: '#JaguarLogo', from: 7, peak: 8, width: 4, tail: .1, w: 1.6, tone: -.5, pos: ['The new wordmark grows on you after a day.', 'The leaper redesign is clean, honestly.', 'Type nerd here: the mixed-case logo is clever.'], neg: ['The new logo looks like a fashion label.', 'That logo is a crime against typography.', 'They had one of the best badges in motoring and binned it.', 'JaGUar. Why.'], neu: ['Is the old leaper gone from the cars too?', 'A logo change usually means a full product reset.'] },
      { tag: '#Type00', from: 19, peak: 21, width: 4, tail: .3, w: 3, tone: .05, pos: ['Okay the Type 00 is actually beautiful.', 'That long bonnet on the Type 00 is pure Jaguar.', 'Miami Pink is a statement and I respect it.', 'Proportions on the Type 00 are mad in the best way.', 'First thing in weeks that looks like a Jaguar.'], neg: ['The Type 00 looks like a concept from 2010.', 'No rear window? Sure.', 'Pink concept, no price, no range. Cool.', 'Concept cars are easy. Show me the one I can buy.', 'Looks like a doorstop someone painted pink.'], neu: ['Type 00 is not for sale, it is a design preview.', 'Production version is supposedly coming later, we will see.', 'Revealed at Miami Art Week, which tells you who they are aiming at.'] },
      { tag: '#JaguarEV', from: 6, peak: 10, width: 12, tail: .4, w: 1.4, tone: -.2, pos: ['Going all-electric and upmarket might be the only way they survive.', 'Bentley money for a Jaguar could work if the car is special.', 'Smart to stop fighting BMW on price.'], neg: ['Pricing themselves out of their own fans.', 'No new Jaguars to buy for a year? Brutal for dealers.', 'An electric luxury brand with nothing on sale. Bold.', 'Lost me at six figures.'], neu: ['What range are they targeting?', 'Will older models still get proper servicing?', 'Interesting that sales basically pause before the relaunch.'] },
      { tag: '#BrandStrategy', from: 8, peak: 12, width: 10, tail: .5, w: 1.2, tone: -.05, pos: ['From a brand view this was a calculated reset.', 'Outrage is reach. More attention in a week than in five years.', 'Every agency I know is talking about this. That is the job done.'], neg: ['Textbook example of forgetting who your customer is.', 'The case study will be on what not to do.', 'Attention is not the same as desire.'], neu: ['Reach is up, sentiment is down. Classic trade-off.', 'Measure this in two years, not two days.'] },
      { tag: null, from: 0, w: 1.8, tone: 0, pos: ['Still think the E-Type is the most beautiful car ever made.', 'Took the old XF out this morning, still a lovely drive.', 'Jaguar dealers near me are being really decent about all this.'], neg: ['Feels like they are embarrassed by their own history.', 'Heritage is what they sell, why throw it away?', 'Waiting list for a new Jag is now forever apparently.'], neu: ['Anyone know what JLR said about the backlash?', 'Owners club meeting tonight, guess the topic.', 'Agencies will be studying this for years either way.'] }
    ]
  },
  {
    id: 'anthropic', file: 'anthropic_claude_launches', prefix: 'ant', seed: 2026, start: '2026-01-28', days: 35, posts: 3200, ppu: 2.9,
    names: ['Anthropic', 'Claude'], tag: '#Claude',
    platforms: [['X', 40], ['Reddit', 24], ['YouTube', 12], ['Facebook', 6], ['Instagram', 6], ['Telegram', 12]],
    bias: { Reddit: -.2, X: 0, YouTube: .1, Facebook: 0, Instagram: .1, Telegram: .05 },
    langs: [['en', 84], ['es', 3], ['fr', 3], ['de', 3], ['ja', 3], ['pt', 4]],
    locs: [['San Francisco, California', 12, -8], ['Seattle, USA', 4, -8], ['New York, USA', 7, -5], ['Austin, Texas', 3, -6], ['Toronto, Canada', 3, -5], ['London, UK', 7, 0], ['Berlin, Germany', 3, 1], ['Paris, France', 2, 1], ['Bengaluru, India', 6, 5.5], ['Hyderabad, India', 2, 5.5], ['Singapore', 2, 8], ['Tokyo, Japan', 3, 9], ['Sydney, Australia', 2, 11], ['Sao Paulo, Brazil', 3, -3], ['', 26, 0]],
    bios: ['Software engineer · backend, Go and Rust', 'Developer advocate · AI tools', 'Data scientist · tiny side projects', 'Founder of a two-person startup', 'Engineering manager · coffee', 'Student · computer science', 'Lawyer who codes a little', 'Product manager · B2B software', 'Tech journalist', 'Security engineer', 'Teacher · learning to code', 'Indie hacker · shipping apps', 'Investor · AI and software'],
    orgs: ['Official page for AI news', 'Official brand account · developer media'],
    base: 44, mood0: .12,
    events: [{ day: 8, amp: 8, decay: .5, tone: .3, hour: 17 }, { day: 9, amp: 2, decay: .7, tone: -.1, hour: 15 }, { day: 20, amp: 5, decay: .55, tone: .2, hour: 17 }, { day: 27, amp: 1.5, decay: .8, tone: -.25, hour: 14 }],
    topics: [
      { tag: '#ClaudeOpus', from: 7, peak: 8, width: 6, tail: .3, w: 3, tone: .25, pos: ['Opus 4.6 just refactored a 3k-line module without breaking a test.', 'Agent teams in Claude Code is the feature I did not know I needed.', 'Opus 4.6 reads the whole repo before touching anything. Huge.', 'First model that keeps track of a long migration without losing the plot.', 'The long context on Opus 4.6 is a game changer for our contract reviews.'], neg: ['Opus 4.6 is great until you hit the usage limit at lunch.', 'Cost per task is still too high for us to roll it out.', 'It confidently rewrote a function I told it not to touch.', 'Benchmarks look great, my actual tickets look the same.', 'Agent teams burned through my usage in an hour.'], neu: ['Anyone compared Opus 4.6 with the last version on real repos?', 'How do agent teams handle merge conflicts between agents?', 'Is the long context on every plan or just the API?'] },
      { tag: '#ClaudeSonnet', from: 19, peak: 20, width: 5, tail: .35, w: 2.4, tone: .2, pos: ['Sonnet 4.6 at Sonnet prices feels like a steal.', 'Swapped our default to Sonnet 4.6, latency dropped and quality held.', 'Sonnet 4.6 handles our support macros better than the big model did.'], neg: ['Sonnet 4.6 got lazier on long answers in my tests.', 'Two launches in twelve days and my evals are already stale.', 'Still invented an API that does not exist.'], neu: ['Is Sonnet 4.6 the default in the app now?', 'Waiting for independent evals before switching.', 'What is the price gap with Opus for batch jobs?'] },
      { tag: '#ClaudeCode', from: 0, peak: 9, width: 14, tail: .6, w: 2.2, tone: .15, pos: ['Claude Code wrote the tests I have been avoiding for a month.', 'My review queue is half the size since we started using Claude Code.', 'Pairing with Claude Code on a Rust port, genuinely fun.'], neg: ['Claude Code deleted my staging config. Yes I should have had a backup.', 'Too many permission prompts, it breaks my flow.', 'Juniors are shipping code they cannot explain now.'], neu: ['How are teams reviewing AI-written pull requests?', 'Anyone running Claude Code in CI?', 'Tips for keeping it inside one folder?'] },
      { tag: '#AISafety', from: 0, w: 1, tone: 0, pos: ['Respect that they publish their safety research.', 'Being boring about safety is exactly what I want from them.'], neg: ['Safety talk is great marketing.', 'Refused a perfectly normal security question. Again.'], neu: ['Interesting read on how they test models before release.', 'Where is the model card for this one?'] },
      { tag: '#AIatWork', from: 0, w: 1.4, tone: 0, pos: ['We cut onboarding doc time in half with Claude.', 'Our analysts use it for first drafts and spend the time on judgement.'], neg: ['Every vendor demo is now agents and I am tired.', 'Watching software stocks wobble on every launch day is getting old.', 'Leadership wants to replace people with this and it is not ready.'], neu: ['What is everyone seeing as actual ROI on these tools?', 'Procurement asked about data retention, anyone have the answer handy?'] },
      { tag: null, from: 0, w: 1.8, tone: .05, pos: ['The pace of releases this year is wild.', 'Claude explained my tax letter better than my accountant.', 'Using Claude to learn Spanish, surprisingly patient teacher.'], neg: ['Release fatigue is real.', 'The app logged me out twice today.', 'Usage limits on the cheaper plan are frustrating.'], neu: ['Anyone else get the app update today?', 'Which model do you all use by default?', 'Is there a changelog somewhere?'] }
    ]
  },
  {
    id: 'apple', file: 'apple_iphone_duo', prefix: 'apl', seed: 909, start: '2026-09-03', days: 59, posts: 4200, ppu: 2.7,
    names: ['Apple'], tag: '#Apple',
    platforms: [['X', 30], ['Reddit', 16], ['YouTube', 20], ['Instagram', 18], ['Facebook', 12], ['Telegram', 4]],
    bias: { Reddit: -.2, YouTube: .05, X: -.05, Instagram: .15, Facebook: 0, Telegram: 0 },
    langs: [['en', 78], ['es', 5], ['ja', 4], ['de', 3], ['fr', 3], ['pt', 3], ['ko', 2], ['zh', 2]],
    locs: [['New York, USA', 8, -5], ['San Francisco, California', 5, -8], ['Los Angeles, California', 5, -8], ['Chicago, USA', 3, -6], ['Austin, Texas', 2, -6], ['Toronto, Canada', 3, -5], ['London, UK', 6, 0], ['Berlin, Germany', 2, 1], ['Paris, France', 2, 1], ['Madrid, Spain', 2, 1], ['Mexico City, Mexico', 2, -6], ['Sao Paulo, Brazil', 2, -3], ['Tokyo, Japan', 3, 9], ['Seoul, Korea', 2, 9], ['Shanghai, China', 2, 8], ['Mumbai, India', 3, 5.5], ['Dubai, UAE', 2, 4], ['Sydney, Australia', 2, 11], ['', 28, 0]],
    bios: ['Tech reviewer · gadgets every week', 'iOS developer', 'Photographer · mostly on my phone', 'Student · design and music', 'Product designer', 'Gadget collector, regret nothing', 'Nurse · night shifts, short videos', 'Small business owner · retail', 'Gamer and streamer', 'Teacher · edtech', 'Marketing manager · consumer brands', 'Finance analyst · investing'],
    orgs: ['Official page for gadget news', 'Official brand account · tech media'],
    base: 52, mood0: .1,
    events: [{ day: 6, amp: 11, decay: .45, tone: .15, hour: 17 }, { day: 7, amp: 4, decay: .6, tone: -.1, hour: 14 }, { day: 43, amp: 5, decay: .7, tone: 0, hour: 12 }, { day: 50, amp: 6, decay: .45, tone: .1, hour: 13 }],
    topics: [
      { tag: '#iPhoneDuo', from: 0, peak: 7, width: 9, tail: .5, w: 3.4, tone: .1, pos: ['The passport shape is so much nicer to hold than the tall foldables.', 'Split View on an iPhone, finally.', 'That hinge looks premium even in the hands-on videos.', 'The Duo makes my phone look boring overnight.', 'Apple waited and it shows, this is a polished first foldable.'], neg: ['$1,999 for a first-gen foldable is a hard no.', 'Foldables have existed for years and Apple calls it new.', 'Looks thick when closed.', 'Waiting for gen 2. First-gen anything is a beta test.', 'Cannot justify it, my phone works fine.'], neu: ['Does the Duo work with MagSafe accessories?', 'What is the battery like with two screens?', 'Preorders are on the 16th, right?'] },
      { tag: '#Foldables', from: 5, peak: 8, width: 8, tail: .3, w: 1.4, tone: 0, pos: ['Fold users pretending they are not jealous of the Duo 😂', 'Apple entering foldables is good for everyone. Competition.'], neg: ['Samsung did this years ago.', 'Fold users already have split screen, nothing new here.'], neu: ['How does the crease compare with the latest Fold?', 'Curious if foldables finally go mainstream now.'] },
      { tag: '#iPhone18Pro', from: 5, peak: 7, width: 8, tail: .3, w: 1.6, tone: .05, pos: ['The 18 Pro camera samples look unreal.', 'Battery on the 18 Pro is the upgrade I actually wanted.'], neg: ['The 18 Pro looks exactly like last year.', 'Another year, another price bump.'], neu: ['Pro or Duo, which one are you getting?', 'Is the 18 Pro worth it over the 16 Pro?'] },
      { tag: '#AirPods', from: 6, peak: 7, width: 4, tail: .15, w: 1, tone: .25, pos: ['$129 AirPods with noise cancelling is the sleeper hit of the event.', 'Budget AirPods with ANC, my kids are sorted.'], neg: ['So the old ones were overpriced all along.'], neu: ['Are the $129 ones the regular AirPods line?'] },
      { tag: '#DuoPreorder', from: 42, peak: 43, width: 4, tail: .2, w: 2.4, tone: 0, pos: ['Got my preorder in a minute after it opened, delivery on day one!', 'Preorder done, the trade-in deal made it bearable.'], neg: ['The store page fell over twice, my delivery is now mid-November.', 'My colour sold out in minutes.', 'Trade-in offer for my old phone is insulting.'], neu: ['Will stores have walk-in stock?', 'What are people getting on trade-in?'] },
      { tag: '#DuoReview', from: 49, peak: 51, width: 6, tail: .5, w: 2.8, tone: .1, pos: ['Day three with the Duo and I barely open my iPad now.', 'Hinge is stiffer than expected, in a good way.', 'Battery got me through a full day of heavy use.'], neg: ['Faint crease visible under light and it bugs me.', 'Case options are terrible so far.', 'Dropped it once and already scuffed the outer screen.'], neu: ['Two weeks in, ask me anything about the Duo.', 'Still deciding whether to keep it inside the return window.'] },
      { tag: null, from: 0, w: 1.8, tone: .05, pos: ['Apple events are still my favourite tech day of the year.', 'Support at the Apple Store was genuinely great today.'], neg: ['Every year the prices creep up.', 'iOS update drained my battery again.'], neu: ['What time does the keynote start in Europe?', 'Anyone watching the event live?'] }
    ]
  },
  {
    id: 'jio', file: 'jio_ipo', prefix: 'jio', seed: 2810, start: '2026-10-06', days: 32, posts: 3800, ppu: 2.5,
    names: ['Jio', 'Reliance Jio'], tag: '#Jio',
    platforms: [['X', 32], ['Telegram', 20], ['YouTube', 15], ['Instagram', 12], ['Facebook', 11], ['Reddit', 10]],
    bias: { Telegram: .15, Reddit: -.2, X: 0, YouTube: .05, Instagram: .1, Facebook: 0 },
    langs: [['en', 54], ['en-hi', 34], ['hi', 12]],
    locs: [['Mumbai, India', 16, 5.5], ['Delhi, India', 12, 5.5], ['Bengaluru, India', 8, 5.5], ['Pune, India', 5, 5.5], ['Hyderabad, India', 5, 5.5], ['Chennai, India', 4, 5.5], ['Kolkata, India', 4, 5.5], ['Ahmedabad, India', 4, 5.5], ['Jaipur', 3, 5.5], ['Surat', 2, 5.5], ['India', 6, 5.5], ['Dubai, UAE', 2, 4], ['Singapore', 1, 8], ['London, UK', 1, 0], ['', 27, 5.5]],
    bios: ['Retail investor · long term only', 'CA student · markets and coffee', 'Chartered accountant · investing', 'Engineer by day, trader by night', 'Small business owner · electronics shop', 'Finance content creator', 'Software developer · Pune', 'Cricket, chai and charts', 'Banker · views personal', 'College student · learning investing', 'Tech enthusiast · 5G and gadgets', 'Housewife and part-time trader'],
    orgs: ['Official page for market news', 'Official brand account · business media'],
    base: 58, mood0: .1,
    events: [{ day: 9, amp: 4, decay: .6, tone: .1, hour: 6 }, { day: 15, amp: 6, decay: 1.2, tone: .15, hour: 5 }, { day: 16, amp: 5, decay: 1.2, tone: .1, hour: 5 }, { day: 17, amp: 8, decay: .9, tone: .15, hour: 6 }, { day: 20, amp: 7, decay: .8, tone: -.3, hour: 13 }, { day: 22, amp: 10, decay: .45, tone: .4, hour: 4 }],
    topics: [
      { tag: '#JioIPO', from: 0, peak: 16, width: 9, tail: .4, w: 3.2, tone: .1, pos: ['Applied for the Jio IPO from all three family accounts 🤞', 'Biggest IPO in India and the valuation still looks fair to me.', 'Jio has the users, this is a long term hold for me.'], neg: ['Valuation is too rich, nothing left on the table for retail.', 'UPI mandate failed twice while applying, so frustrating.', 'Every uncle in my family group is an IPO expert now.'], neu: ['What is the lot size for the Jio IPO?', 'Last day to apply is the 23rd, right?', 'Anyone applying in the shareholder quota?'], hx: { pos: ['Jio IPO mein apply kar diya, ab bas allotment ka wait 🙏', 'Long term ke liye Jio solid hai bhai'], neg: ['Valuation bahut zyada hai yaar, retail ke liye kuch nahi bacha', 'UPI mandate do baar fail hua, kya bakwaas hai'], neu: ['Lot size kitna hai Jio IPO ka?', 'Apply karne ki last date kab hai?'] } },
      { tag: '#JioGMP', from: 8, peak: 17, width: 6, tail: .2, w: 1.6, tone: .15, pos: ['GMP looking strong, listing gains incoming.', 'Grey market is very bullish on Jio.'], neg: ['GMP is a casino, do not apply only for that.', 'People trusting random GMP screenshots, wow.'], neu: ['Where are people even getting these GMP numbers?'], hx: { pos: ['GMP dekh ke lag raha hai listing badhiya hogi'], neg: ['GMP ke chakkar mein mat pado bhai'], neu: ['Aaj GMP kitna chal raha hai?'] } },
      { tag: '#JioAllotment', from: 19, peak: 20, width: 2, tail: .1, w: 3, tone: -.25, pos: ['GOT ALLOTMENT IN JIO 🎉🎉', 'Finally got lucky in a big IPO, one lot but I will take it.'], neg: ['Applied from 4 accounts, zero allotment. As always.', 'Retail allotment is a lottery and I never win.'], neu: ['Allotment status is out on the registrar site.', 'How do I check allotment with my PAN?'], hx: { pos: ['Allotment mil gaya bhai!! 🥳', 'Ek lot laga, khush hoon'], neg: ['Phir se allotment nahi mila 😭', '4 account se lagaya, ek bhi nahi laga'], neu: ['Allotment status kaise check kare?'] } },
      { tag: '#JioListing', from: 21, peak: 22, width: 4, tail: .35, w: 3.2, tone: .35, pos: ['A 21% listing pop is not bad at all for a giant.', 'Holding my Jio shares for the long run.', 'Listing day in the office, half the team got allotment.'], neg: ['Sold at the open and it went higher, story of my life.', 'Big listing gain, but the price is now well ahead of the business.'], neu: ['Should I book profit or hold Jio?', 'Volume on listing day was insane.'], hx: { pos: ['Listing mein 21% mil gaya, maza aa gaya', 'Hold kar raha hoon, Jio lamba chalega'], neg: ['Open pe bech diya aur fir upar chala gaya 🤦'], neu: ['Hold karu ya book karu?'] } },
      { tag: '#Jio5G', from: 0, w: 1.4, tone: -.1, pos: ['Jio 5G in my area is genuinely fast now.', 'Signal in the metro finally works.'], neg: ['Recharge prices went up and now they want my money in the IPO too.', 'Network drops every evening in my building, fix that first.'], neu: ['Will the IPO money go into 5G or AI?'], hx: { pos: ['5G speed toh mast hai Jio ka'], neg: ['Recharge mehenga kar diya aur ab IPO bhi 😒', 'Shaam ko network gayab ho jata hai'], neu: ['IPO ka paisa kahan lagayenge?'] } },
      { tag: null, from: 0, w: 1.6, tone: .05, pos: ['Reliance shareholders had a good month.', 'Markets feel alive this week.'], neg: ['Parent company holders feel ignored.', 'Too much hype, I am staying out.'], neu: ['How does this change the Reliance valuation?', 'Which broker app worked best for applying?'], hx: { pos: ['Market mein maza aa raha hai is hafte'], neg: ['Itna hype, main toh door hi rahunga'], neu: ['Kaunsa broker app sahi chala apply ke liye?'] } }
    ]
  },
  {
    id: 'zomato', file: 'zomato_eternal', prefix: 'zom', seed: 602, start: '2025-01-27', days: 33, posts: 3600, ppu: 2.4,
    names: ['Zomato', 'Eternal'], tag: '#Zomato',
    platforms: [['X', 36], ['Instagram', 20], ['Reddit', 12], ['YouTube', 10], ['Facebook', 12], ['Telegram', 10]],
    bias: { X: -.05, Instagram: .15, Reddit: -.25, YouTube: 0, Facebook: -.05, Telegram: .05 },
    langs: [['en', 52], ['en-hi', 36], ['hi', 12]],
    locs: [['Delhi, India', 15, 5.5], ['Gurugram', 5, 5.5], ['Mumbai, India', 12, 5.5], ['Bengaluru, India', 12, 5.5], ['Pune, India', 5, 5.5], ['Hyderabad, India', 5, 5.5], ['Chennai, India', 4, 5.5], ['Kolkata, India', 4, 5.5], ['Lucknow', 2, 5.5], ['India', 5, 5.5], ['Dubai, UAE', 1, 4], ['', 30, 5.5]],
    bios: ['Foodie · will travel for biryani', 'Product manager · consumer apps', 'Startup founder · quick commerce', 'Equity research · consumer tech', 'College student · hostel life', 'Home chef and food blogger', 'Delivery partner · weekends', 'Marketing at a D2C brand', 'Software engineer · Bengaluru', 'Investor · Indian startups', 'Restaurant owner · North Indian kitchen', 'Meme page admin'],
    orgs: ['Official page for startup news', 'Official brand account · food and business media'],
    base: 72, mood0: -.05,
    events: [{ day: 10, amp: 9, decay: .5, tone: -.3, hour: 11 }, { day: 11, amp: 4, decay: .7, tone: -.35, hour: 5 }, { day: 13, amp: 2, decay: .9, tone: .1, hour: 14 }, { day: 18, amp: 3, decay: 1.4, tone: .1, hour: 14 }],
    topics: [
      { tag: '#Eternal', from: 9, peak: 10, width: 6, tail: .3, w: 3.2, tone: -.15, pos: ['Eternal as a parent name makes sense with Blinkit growing so fast.', 'Smart to separate the company from the food app.', 'Honestly the name grew on me in an hour.'], neg: ['Eternal sounds like a funeral home.', 'Renaming the company instead of fixing delivery times, classic.', 'Who approved Eternal 😭'], neu: ['So the Zomato app stays Zomato?', 'The ticker changes to ETERNAL, right?'], hx: { pos: ['Naam acha hai, Blinkit ke saath sense banta hai'], neg: ['Eternal? Bhai ye kya naam hai 😂', 'Naam badalne se delivery fast nahi hogi'], neu: ['App ka naam bhi change hoga kya?'] } },
      { tag: '#ZomatoResults', from: 9, peak: 11, width: 4, tail: .2, w: 2.2, tone: -.35, pos: ['Revenue growth is still strong, the profit dip is investment.', 'Long term story is intact, buying the dip.'], neg: ['Profit down 57% and they are talking about names.', 'Stock bleeding today after the results.'], neu: ['Quick commerce spending is the real story in these numbers.', 'What is the guidance on new Blinkit stores?'], hx: { pos: ['Long term ke liye dip pe kharida'], neg: ['Profit gir gaya aur naam badal rahe hain', 'Aaj share ne rula diya'], neu: ['Share kitna gira aaj?'] } },
      { tag: '#Blinkit', from: 0, peak: 11, width: 10, tail: .6, w: 1.8, tone: .1, pos: ['Blinkit delivered in 8 minutes at midnight, witchcraft.', 'Blinkit is the real growth engine, not food.'], neg: ['Blinkit sent the wrong item again.', 'Dark stores on every street in my area, not sure how I feel.'], neu: ['Blinkit or Zepto, which is faster where you live?'], hx: { pos: ['Blinkit ne 10 min mein deliver kar diya 🔥'], neg: ['Blinkit pe har baar kuch na kuch missing hota hai'], neu: ['Tumhare area mein Blinkit fast hai ya Zepto?'] } },
      { tag: '#ZomatoDelivery', from: 0, w: 2.4, tone: -.15, pos: ['Delivery partner was so kind today.', 'Order arrived hot and early, rare win.'], neg: ['Order delayed by 50 minutes and support just sends templates.', 'Platform fee went up again?', 'Food arrived cold and the refund was denied.'], neu: ['Is Zomato Gold still worth it?', 'Anyone else seeing higher delivery fees tonight?'], hx: { pos: ['Delivery wale bhaiya ekdum time pe aaye'], neg: ['Khana thanda aaya aur refund bhi nahi diya 😤', 'Platform fee phir badh gayi kya?'], neu: ['Gold lena worth hai kya ab?'] } },
      { tag: '#ZomatoMemes', from: 9, peak: 11, width: 5, tail: .3, w: 1.4, tone: .2, pos: ['Their social team is still the funniest on the internet.', 'The Eternal memes today are elite 😂'], neg: ['Memes will not fix the app crashing at dinner time.'], neu: ['Their replies on the timeline today are wild.'], hx: { pos: ['Eternal wale memes ne din bana diya 😂'], neg: ['Memes se app crash theek nahi hoga'], neu: ['Aaj ke replies dekhe kya?'] } },
      { tag: '#ValentinesDay', from: 17, peak: 18, width: 1.5, tail: 0, w: 2, tone: .1, pos: ['Zomato saved my Valentine dinner, the cake came on time 🌹', 'Ordered for both of us and it was perfect.'], neg: ['Valentine order cancelled twenty minutes before, thanks Zomato.'], neu: ['Order numbers tonight must be huge.'], hx: { pos: ['Valentine pe cake time pe aa gaya, thank you Zomato 🌹'], neg: ['Valentine order cancel kar diya last minute 💔'], neu: ['Aaj toh order ki line lagi hogi'] } }
    ]
  }
];

/* ---------------- the machine ---------------- */
function make(B) {
  let s = B.seed >>> 0;
  const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const wpick = (list, w = x => x[1]) => { let tot = 0; list.forEach(x => tot += w(x)); let r = rnd() * tot; for (const x of list) { r -= w(x); if (r <= 0) return x; } return list[list.length - 1]; };
  const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / Math.sqrt(.5); };
  const gamma = k => { let x = 0; for (let i = 0; i < k; i++) x -= Math.log(1 - rnd()); return x / k; };
  const hex = n => { let o = ''; for (let i = 0; i < n; i++) o += Math.floor(rnd() * 16).toString(16); return o; };
  const sig = z => 1 / (1 + Math.exp(-z));
  const DAY = 864e5, t0 = Date.parse(B.start + 'T00:00:00Z');

  /* people: a few loud, most quiet */
  const nU = Math.round(B.posts / B.ppu), users = [];
  for (let i = 0; i < nU; i++) {
    const org = rnd() < .015, loc = wpick(B.locs), plat = wpick(B.platforms)[0], lang = wpick(B.langs)[0];
    let bio = org ? pick(B.orgs) : rnd() < .2 ? '' : pick(B.bios);
    const fol = Math.max(0, Math.round(Math.exp(4.4 + 1.75 * gauss()) * (org ? 40 : 1)));
    const first = Date.UTC(2009, 0, 1), last = t0 - 20 * 864e5, joined = new Date(first + Math.pow(rnd(), .8) * (last - first)).toISOString().slice(0, 10);
    users.push({ id: 'anon-' + hex(16), plat, lang, loc: loc[0], tz: loc[2], bio, fol, joined, w: 1 / Math.pow(i + 1, 1.05) * (org ? 3 : 1) });
  }
  for (let i = users.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [users[i].w, users[j].w] = [users[j].w, users[i].w]; }
  const cum = []; let acc = 0; users.forEach(u => { acc += u.w; cum.push(acc); });
  const anyone = () => { const r = rnd() * acc; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return users[lo]; };

  /* the shape of each day: a weekly rhythm, the moments, and noise that does not average out */
  const resp = (e, d) => d < e.day ? (d === e.day - 1 ? .12 : 0) : Math.exp(-(d - e.day) * e.decay);
  const vol = [], mood = []; let ar = 0;
  for (let d = 0; d < B.days; d++) {
    const dow = new Date(t0 + d * DAY).getUTCDay(), wk = dow === 0 || dow === 6 ? .82 : dow === 1 ? 1.08 : 1;
    let v = 1; B.events.forEach(e => { v += e.amp * resp(e, d); });
    vol.push(B.base * wk * v * gamma(5));
    ar = .62 * ar + .1 * gauss(); let m = B.mood0 + ar; B.events.forEach(e => { m += e.tone * resp(e, d) * Math.min(1, e.amp / 4); }); mood.push(m);
  }
  const scale = B.posts / vol.reduce((a, b) => a + b, 0);
  const DIURNAL = [1, .6, .35, .25, .22, .3, .6, 1.1, 1.5, 1.7, 1.6, 1.6, 1.8, 1.7, 1.5, 1.5, 1.6, 1.8, 2, 2.3, 2.5, 2.4, 2, 1.5].map((w, h) => [h, w]);
  let posts = [];
  for (let d = 0; d < B.days; d++) {
    const n = Math.max(3, Math.round(vol[d] * scale)), ev = B.events.filter(e => e.day === d)[0];
    for (let k = 0; k < n; k++) {
      const u = anyone(); let ts;
      if (ev && rnd() < .45) ts = t0 + d * DAY + (ev.hour + Math.abs(gauss()) * 2.5) * 36e5 + rnd() * 36e5;
      else { const local = wpick(DIURNAL)[0]; ts = t0 + d * DAY + ((local - u.tz + 48) % 24) * 36e5 + rnd() * 36e5; }
      ts = Math.min(ts, t0 + B.days * DAY - 1000); ts = Math.max(ts, t0);
      posts.push({ ts: Math.floor(ts / 1000) * 1000, u });
    }
  }
  posts.sort((a, b) => a.ts - b.ts);

  /* what they say */
  const live = (t, d) => d < t.from ? 0 : t.peak === undefined ? 1 : Math.max(t.tail || 0, Math.exp(-Math.abs(d - t.peak) / (t.width || 5)));
  const fill = x => x.replace(/\{B\}/g, () => pick(B.names));
  function stance(z) { const pp = sig(2.4 * z - .55), pn = sig(-2.4 * z - .55), r = rnd() * (pp + pn + .55); return r < pp ? 'pos' : r < pp + pn ? 'neg' : 'neu'; }
  function style(x, st, lang) {
    if (lang === 'en') {
      if (rnd() < .1) x = pick(OPEN) + x.charAt(0).toLowerCase() + x.slice(1);
      if (rnd() < .2) x += ' ' + fill(pick(GEN[st]));
      if (rnd() < .05) x = x.replace(/\b(\w)(\w)(\w{3,})\b/, (m, a, b, c) => a + c.charAt(0) + b + c.slice(1));   // a slip of the thumb
      if (rnd() < .26) x = x.toLowerCase();
      if (rnd() < .3) x = x.replace(/[.!]$/, '');
    }
    if (rnd() < .16) x += ' ' + pick(EMO[st]);
    return x;
  }
  function say(topic, st, lang) {
    let pool = null, code = lang;
    if (lang === 'en-hi' && topic.hx && topic.hx[st]) pool = topic.hx[st];
    else if (lang !== 'en' && lang !== 'en-hi' && FOREIGN[lang]) pool = FOREIGN[lang][st];
    if (!pool) { pool = topic[st]; code = 'en'; }
    if (!pool || !pool.length) { pool = GEN[st]; code = 'en'; }
    let x = style(fill(pick(pool)), st, code);
    if (topic.tag && rnd() < .62) x += rnd() < .5 ? ' ' + topic.tag : '\n' + topic.tag;
    if (rnd() < .12) x += ' ' + B.tag;
    if (rnd() < .03) x += ' https://t.co/' + hex(10);
    return { text: x, lang: code };
  }
  const LAB = { pos: 'positive', neg: 'negative', neu: 'neutral' }, NEXT = { pos: ['neu', 'neg'], neg: ['neu', 'pos'], neu: ['pos', 'neg'] };
  const rows = [], recent = [];
  posts.forEach((p, i) => {
    const d = Math.floor((p.ts - t0) / DAY), u = p.u;
    while (recent.length && recent[0].ts < p.ts - 40 * 36e5) recent.shift();
    let kind = 'post', ref = null;
    const r = rnd();
    if (recent.length > 8) { if (r < .23) kind = 'reply'; else if (r < .29) kind = 'quote'; else if (r < .41) kind = 'repost'; else if (r < .43) kind = 'share'; }
    if (kind !== 'post') {
      let best = null, bw = 0, tot = 0; const cand = recent.length > 300 ? recent.slice(-300) : recent;
      const ws = cand.map(c => { const w = Math.pow(1 + c.kids, 1.25) * Math.pow(c.u.fol + 40, .45) * Math.exp(-(p.ts - c.ts) / (14 * 36e5)); tot += w; return w; });
      let x = rnd() * tot; for (let k = 0; k < cand.length; k++) { x -= ws[k]; if (x <= 0) { best = cand[k]; break; } } ref = best || cand[cand.length - 1];
      if (ref.u === u) { kind = 'post'; ref = null; }
    }
    let row;
    if (kind === 'repost' || kind === 'share') {
      row = { text: ref.text, lang: ref.lang, st: ref.st, label: ref.label, topic: ref.topic };
    } else {
      const topic = kind === 'post' || rnd() < .5 ? wpick(B.topics, t => t.w * live(t, d)) : ref.topic;
      const z = (ref && rnd() < .55 ? ({ pos: .7, neg: -.7, neu: 0 })[ref.st] : 0) + (topic.tone || 0) + mood[d] + (B.bias[u.plat] || 0) + .3 * gauss();
      const st = stance(z);
      let said;
      if (kind === 'reply' && rnd() < .42) said = { text: style(pick(REPLY[st]), st, 'en'), lang: 'en' };
      else said = say(topic, st, u.lang);
      if (kind === 'quote' && said.lang === 'en' && rnd() < .3) said.text = pick(['This. ', 'Read this ', 'Lol ', 'Exactly ']) + said.text;
      /* people label messily: a few calls go the other way */
      let label = st; if (rnd() < .07) label = pick(NEXT[st]);
      row = { text: said.text, lang: said.lang, st, label, topic };
    }
    const plat = kind === 'share' ? pick(B.platforms.filter(x => x[0] !== ref.u.plat))[0] : u.plat;
    const out = { post_id: B.prefix + '-' + String(i + 1).padStart(5, '0'), platform: plat, user_id: u.id, timestamp: new Date(p.ts).toISOString().replace('T', ' ').slice(0, 19), text: row.text, parent_id: kind === 'reply' ? ref.post_id : '', language: rnd() < .04 ? '' : row.lang, user_bio: u.bio, user_location: u.loc, followers: u.fol, joined: u.joined, interaction: kind, ref_post_id: ref ? ref.post_id : '', sentiment: LAB[row.label] };
    rows.push(out);
    if (ref) ref.kids++;
    recent.push({ post_id: out.post_id, ts: p.ts, u, text: row.text, lang: row.lang, st: row.st, label: row.label, topic: row.topic, kids: 0 });
  });
  return rows;
}

const q = v => { v = String(v === undefined || v === null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
for (const B of BRANDS) {
  const rows = make(B), cols = HEAD, raw = HEAD.filter(c => c !== 'sentiment');
  const csv = cols.join(',') + '\n' + rows.map(r => cols.map(c => q(r[c])).join(',')).join('\n') + '\n';
  const rcsv = raw.join(',') + '\n' + rows.map(r => raw.map(c => q(r[c])).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT, B.file + '.csv'), csv);
  fs.writeFileSync(path.join(OUT, 'raw', B.file + '_no_sentiment.csv'), rcsv);
  fs.writeFileSync(path.join(OUT, B.file + '.js'), '// Made by tools/make_demos.js. Invented posts about a real, dated moment. Same content as ' + B.file + '.csv.\nwindow.SAMPLE_AUDIENCE_CSV = ' + JSON.stringify(csv) + ';\n');
  const c = { positive: 0, neutral: 0, negative: 0 }; rows.forEach(r => c[r.sentiment]++);
  const k = {}; rows.forEach(r => k[r.interaction] = (k[r.interaction] || 0) + 1);
  console.log(B.id.padEnd(10), rows.length, 'posts', new Set(rows.map(r => r.user_id)).size, 'voices', rows[0].timestamp.slice(0, 10), '->', rows[rows.length - 1].timestamp.slice(0, 10), JSON.stringify(c), JSON.stringify(k), Math.round(csv.length / 1024) + 'KB');
}
