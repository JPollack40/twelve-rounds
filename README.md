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

## Gear and the Locker
Six slots (gloves, trunks, shoes, mouthguard, wraps, walkout robe), defined in `GEAR` in `src/js/10-data.js`.
Items unlock by level, pro wins, a world title, amateur gold or beating a specific legend, then cost money.
Stat effects (`fx`) apply in `effectiveStats()` and are capped at ±5 per stat; robes add hype per win.
Cosmetics merge into the boxer's look via `playerLook()`: trunk patterns, glove tape, shoe colour, mouthguard colour.

## Women's circuit
Each career is in the men's or the women's world, chosen on the first creator step. The women's world has its own fighters, rivals,
champions and 12 legends inspired by the greats of women's boxing (homages with original names), each with a learnable signature move,
plus two named roster fighters and two story chapters (The Undercard, Headliners). Divisions run Flyweight to Heavyweight (175+ lb).
Fighter text is written once and pronouns are swapped for the women's world (`gtxt`). In the renderer, `look.fem` gives a women's frame,
a sports top, a softer inked face, and ponytail, bun and twin-braid hair (also available to everyone).

## Daily challenge and Legends gallery
The title screen offers one seeded fight a day (`src/js/62-daily.js`): a legend from either circuit plus a twist (heat, small gloves,
short notice, two-round sprint). Everyone gets the same fight on the same date. Score, 0–3 gloves, best-of-day and a win streak are kept
on the device; "Copy result" shares a one-line summary. The Legends screen (title screen and career menu) lists every legend in both
circuits with portrait, homage, scouting report and signature move, and marks the ones beaten in the current career.

## Knockout replays
With the 3D renderer, the fight records the renderer's inputs each frame (opponent pose, player gloves, camera, flashes) in a short
ring buffer (`recFrame`). A knockdown snaps the last 1.5 s plus the next second into a clip; if the fight ends by KO or TKO in that
round, the clip plays back in letterboxed slow motion (slowest around the impact) before the result. Tap to skip; Settings turns it off.

## Trophies
23 milestones (`src/js/64-trophies.js`) kept across every career on the device: first win and KO, first-round KO, off the canvas,
upsets, legends, titles, unification, undisputed, two-weight, long reigns, 20-0, rivalry, chapters, a title in each circuit, Hall of
Fame and GOAT retirements, and daily-challenge wins, three-glove stops and 7-day streaks. Sandbox careers never award them.
Women's championship fights are scheduled for 10 rounds, regional title fights for 8, and other fights top out at 8.

## Commentary and exhibitions
Fights show short broadcast captions (`CALLS` in `40-fight.js`) for counters, big shots, body work, slick defense, hurt fighters,
knockdowns, getting up and the ten-second warning. They are rate-limited, a bigger moment overrides a smaller one, and they use
Math.random only, so the seeded fight simulation is untouched. Settings can turn them off. Any legend card in the Legends gallery
offers an exhibition: pick your fighter (your career boxer, or a preset 80/88/95) and 3, 6 or 10 rounds. Nothing counts.
