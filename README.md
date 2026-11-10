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

The home page has one bird for every voice in the data. Move your cursor through them and be the hawk, or click one to read what it said.

Hover a chart for its numbers, and click a mark to open the real posts behind it. Charts of model results, such as the Grapevine's breaking point, give the readout only.

Reach the end of a page and it holds at a divide. Keep scrolling and a flock carries you into the next room. Inside a room, scrolling stays plain and quick. A bar at the foot of every page names what comes next, and clicking it or pressing the space bar goes there too. Every page also has a flight path on its right edge: click a perch, use its arrows, or press J and K. On phones it folds into a compass by the dock. The Light button switches to a solid, gradient-free theme and the site remembers the choice.

## Bring your own CSV

Every page has a **Bring your CSV** button. Any file with a column of text works, split by commas, semicolons, tabs or pipes, with or without a header row. The door guesses the columns and lets you correct them, cleans the file, then rebuilds all five rooms around it.

- Dates, authors, moods, hashtags and reply links make the rooms richer, and each has a fallback when missing. Every fallback is stated on the report.
- Authors become one-way codes. Handles, emails, phone numbers and links are struck from the text.
- Files stay in the visitor's browser, up to 20,000 rows, until they choose to forget them.

## The research behind it

The site is built against Batrinca & Treleaven (2015), *Social media analytics: a survey of techniques, tools and platforms*, AI & Society 30, 89-116. The [Blueprint](blueprint/index.html) page lists each part of the paper, what the site does about it, and what it leaves out, with live figures.

## Running it

It is a static site with no build step and no server code. Open `index.html`, or serve the folder with any web server.

## The data

Nothing is preloaded. The site opens empty, and the **Demo CSV** button loads one of six demos into every room: Jaguar's 2024 rebrand, Anthropic's Opus and Sonnet 4.6 launches, Apple's iPhone Duo, Jio's IPO, Zomato becoming Eternal, and the original invented flock. The brand demos follow real, dated moments, but every post and person in them is invented. `node tools/make_demos.js` rebuilds them in `data/demos/`, with copies in `data/demos/raw/` that have no sentiment column.

A file with no sentiment column goes through a Hugging Face model (`Xenova/twitter-roberta-base-sentiment-latest`), downloaded once and run in the browser, which adds one. On hand-labelled text it never saw, it scored 92.8% on 359 tweets and 95.0% on 3,000 reviews, telling positive from negative.

`data/audience_sample.csv` holds 5,216 synthetic posts from 892 fictional profiles across six platforms over 30 days. **Every voice, post and quarrel is invented**, and the file can be rebuilt exactly with `node tools/make_sample.js`.

`node tools/verify_data.js` checks the file and recounts the raw data separately to confirm what each room's engine reports.

## How it works

Everything runs in the visitor's browser: PageRank, betweenness, k-core and Louvain community detection, cascade reconstruction, contagion simulation, damped Holt forecasting with an honest backtest, and transparent keyword rules for language, region, interests and feeling. Moods in the sample ship with the data. On a file without labels, a small trained model reads mood from the wording of English posts and leaves other languages unscored. Its marks on hand-labelled exams are published in the Weather Room, and `tools/train_sentiment.js` rebuilds it from the public datasets, which are not stored in this repository.

## The report

The [Report](report/index.html) page writes up the loaded data for someone who has ten seconds: what changed against the period before, what to do, and how far to trust it. A change is only called a change when it is larger than chance would explain. It exports as a PDF, a standalone web file or a plain summary.

## Privacy by design

- Authors are one-way codes, and voices appear only under invented codenames.
- Bios and locations are read once to derive labels and are never displayed or exported.
- Groups smaller than five people are folded away.
- Gender, ethnicity, religion, politics and health are never inferred.

---

Made by Utsav.
