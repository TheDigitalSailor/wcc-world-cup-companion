# WCC — World Cup Companion

A mobile-first companion for the FIFA World Cup 26: day-by-day schedule, live scores, group standings, knockout bracket, favourite teams, and where to watch every match in Portugal 🇵🇹 and the Netherlands 🇳🇱.

Plain static site — no build step, no framework.

## Pages

- **Matches** — every match day from June 11 to July 19, kickoff times in Lisbon/Amsterdam time, scores for finished games, and the channels showing each match
- **Groups** — live standings for all 12 groups, computed from results
- **Bracket** — the knockout tree from the Round of 32 to the Final
- **Teams** — pick any number of favourite teams; their matches are starred across the app

## Data

- Fixtures & live scores: [fixturedownload.com](https://fixturedownload.com/results/fifa-world-cup-2026) (free JSON feed)
- A snapshot is bundled in `data.js` so the app works offline/instantly; the client re-fetches the feed every 90 s, and a GitHub Action refreshes the bundled snapshot hourly (which triggers a Vercel redeploy)
- Flags: [circle-flags](https://github.com/HatScripts/circle-flags)

## Run locally

Serve the folder with any static server, e.g.:

```sh
npx serve -l 4173 .
```
