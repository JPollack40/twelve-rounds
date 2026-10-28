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

## 3D fight renderer (beta)
`src/js/35-render3d.js` renders the fight with Three.js (r160): a sculpted-head opponent rig driven by the engine's 2D pose through
two-bone IK, first-person gloves parented to the camera, a lit ring and instanced crowd. The 2D canvas stays on top as the effects and
HUD overlay, and is the automatic fallback when WebGL or Three.js is missing (Settings > 3D fighters). `High detail` toggles shadows,
antialiasing and the 1.5x pixel ratio; the renderer also lowers detail by itself when frames run slow.
Builds: the hosted page loads Three.js from cdnjs; the offline file and the PWA inline `src/vendor/three.min.js`.
`dist/twelve-rounds.html` is the frozen alpha build; the beta is `dist/twelve-rounds-beta.html`.

## Art direction: Style A (inked)
The renderer follows the "Style A" sketchbook sheet: inverted-hull ink outlines, a hard three-band cel ramp,
screen-space crosshatching in shadow, and ink detail lines painted into skin and torso textures.
Characters are data: body type (lanky, athletic, brawler, anvil), nose (straight, broken, flat), scars, cauliflower ears,
game face (grit, stern, calm, cocky), hair (incl. mohawk, spiky, shaggy, curly) and a face-shape seed. Legends get
homage traits from `LEGEND_VIS`; the named roster (Basilio, Spike, Rocco "The Anvil") lives in `SIGNATURES`.
Portraits and the creator preview render through the same rig (`R3P`), with the 2D portrait as fallback.
