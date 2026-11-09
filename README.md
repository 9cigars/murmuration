# Murmuration

**How a crowd makes up its mind.**

Nobody leads a flock of starlings, and still ten thousand of them turn at once. Murmuration is an interactive audience-intelligence site that watches an online crowd do the same thing, in five rooms that all read one dataset.

| Room | Question | Things to play with |
|---|---|---|
| **I. The Listening Post** | How did it get here? | Time-lapse intake line, a masking booth that strips names from what you type, a conversation unspooled along the clock |
| **II. The Weather Room** | How does it feel? | A living sky that follows the crowd's mood, a barometer for any sentence, seven kinds of feeling |
| **III. The Audience Atlas** | Who are they? | A constellation of anonymous profiles, trend and word filters, a two-crowd face-off |
| **IV. The Swell** | What is rising? | A time machine that hides the future, a forecaster you can try to beat |
| **V. The Grapevine** | Who told whom? | A living network, trend replays, rumour simulation, cut the wires, six degrees |

The home page has one bird for every voice in the data. Move your cursor through them and be the hawk.

## Running it

It is a static site with no build step and no server code. Open `index.html`, or serve the folder with any web server.

## The data

`data/audience_sample.csv` holds 5,216 synthetic posts from 892 fictional profiles across six platforms over 30 days. **Every voice, post and quarrel is invented**, and the file can be rebuilt exactly with `node tools/make_sample.js`.

`node tools/verify_data.js` checks the file and recounts the raw data separately to confirm what each room's engine reports.

## How it works

Everything runs in the visitor's browser: PageRank, betweenness, k-core and Louvain community detection, cascade reconstruction, contagion simulation, damped Holt forecasting with an honest backtest, and transparent keyword rules for language, region, interests and feeling. Moods in the sample ship with the data. On real posts a trained model would supply them.

## Privacy by design

- Authors are one-way codes, and voices appear only under invented codenames.
- Bios and locations are read once to derive labels and are never displayed or exported.
- Groups smaller than five people are folded away.
- Gender, ethnicity, religion, politics and health are never inferred.

---

Made by Utsav.
