# Twelve Rounds

A real-time boxing RPG for the phone: build a boxer, fight through the amateurs and the pro ranks, face legends and story chapters drawn from boxing history.

- `src/` game source (`head.html` styles, `js/*.js` concatenated in order)
- `build.sh` builds `docs/` (PWA for GitHub Pages), `Twelve-Rounds-offline.html` and `dist/`
- `tests/` Playwright bot and career-sim regression suite
- Dev mode: tap the title logo five times (or open with `#dev`)

## Tests

`npm test` runs the regression suite (Playwright, uses the pre-installed Chromium): bot win-rate bands across
difficulties and legends, plus 500 Monte Carlo careers. `npm run test:quick` is the fast version, and
`--strict` makes band failures fail the process. The report lands in `tests/last-report.md`.
The bands are drift detectors calibrated to the bots, not a statement of the intended difficulty: real play on the
phone decides that, and the bands should be moved as the game is tuned.
