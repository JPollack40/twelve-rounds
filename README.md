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

## Rivalries and callouts
Rivals are no longer fixed at career start. Every fighter carries "heat" with you (`G.heat`): fighting them (more for losses, close or
stolen decisions and title fights), calling them out, demanding rematches and sitting within two places of you in the rankings all add
heat; it cools every fight, faster when they fall 300+ points or 15+ places away or leave your division. The hottest fighter in your
division (30+ heat, clearly ahead of the current rival) becomes your rival; a rivalry lasts at least 18 months unless it goes cold, and
past rivalries are kept with their head-to-head records (rivalry wins in your legacy count all of them). The home screen shows who is
heating up.

After a win you choose whom to call out: the division's champions, your rival and contenders around you, each with honest odds. A
champion answers contenders ranked 1–3 about 85% of the time, 4–5 about 65%, 6–10 about 30%, 11–15 about 10%, and almost never
anyone ranked lower; contenders above you answer by rank gap, fighters below you almost always accept. Hype and existing bad blood nudge
the odds. A turned-down callout may still come together later (a smaller chance on each new set of offers for six months). Callouts on
champions become title or unification offers. Rematch demands after a loss also depend on how the fight went. Fight offers now include
up to two ranked contenders just above you, so you can choose whom to climb past.

## Back of the line, pound for pound, Saturday Night Boxing
After a loss, title shots and champion callouts wait until you win again (`titleLock`: robbery 0, split/majority 1, clear decision 2,
stoppage 3). A pound-for-pound top 10 spans all divisions (`p4pList`). Every four weeks of a pro career a studio show
(`src/js/22-show.js`) recaps headlines, risers in your division, P4P movement and a host's take on you; it uses no RNG.

## Contract talks and the weigh-in
Accepting a big fight (world, unification, grudge, chapter, rematch) opens contract talks: standard terms, a 25% bigger purse, a
rematch clause (8% less; a loss guarantees the rematch), or, with a belt or 60+ hype, a home fight (10% less, no robbery risk, +3 hype).
Without a clause a rematch after a loss comes 45% of the time (always after a robbery). Fight night adds a weigh-in: when cutting
weight, choose dry out hard (miss chance x0.3, -8% stamina, -3 chin), steady, or come in heavy (x1.7, +4% power); then the face-off:
stare down (one special bar charged; they are a little more aggressive), stay loose (+4% stamina, bad blood cools), or shove (hype +5,
a bar charged, much angrier opponent, bad blood boils, 30% chance of a 5% fine). Opponent stat spreads are now seeded per fighter, so
the tale of the tape no longer changes between screens.

## Alumni legends
Retiring at Champion tier or better (legacy 150+) turns your boxer into a legend for future careers in the same circuit
(`makeAlum`, stored in `tr_alumni`, up to 12). They keep your look and gear, style, stance, reach and first equipped ability, at their
peak rating +2 (82–95), with a signature combination from their style and a weakness from their lowest stat. Each career snapshots
the alumni it was created with (`G.alumni`), so older saves are unaffected; they also appear in the Legends gallery with an
exhibition button. The daily challenge only draws from the built-in legends, so it stays the same for everyone.

## World Super Series
A top-8 contender (8+ wins, at most once every two years, one invite chance per 26 weeks) may be invited to an eight-fighter
knockout tournament in their division (`src/js/24-tour.js`), seeded 1v8, 4v5, 2v7, 3v6. While it runs, the next bracket bout is the
only offer; the rest of the bracket is simulated as you go and shown on Home. Your own belts are defended in every round; only the
final can take an opponent's belts. Winning the final pays an 80% bonus, +20 hype, a trophy and 35 legacy points.

## Camp locations and punch stats
At the start of camp choose where to train: home (free), altitude (+stamina/footwork gains, +3% stamina on fight night, +3 fatigue a
session), elite sparring (+30% sparring XP, faster scouting) or sports science (30% less fatigue, half the injury risk). Paid camps cost
6–10% of the purse with a floor, so money finally has a recurring use. The result screen shows punches landed by round, you vs them,
as grouped bars (palette #bd8a2e/#5b8def, validated on the dark card), with tap-for-numbers, totals and a table; the round a fight
was stopped in is included and marked.

## Career timeline and the comeback
Record and the retired Home screen link to a career timeline built from the fight history and career state: start, pro debut, first
KO and first loss, title wins and losses, Continental titles, legend wins, chapters, robberies, rivalries, the Super Series,
retirement and comebacks (`src/js/66-story.js`). A retired boxer who was not forced out (damage under 85, age 42 or younger) can come
back once: a year passes, Speed, Footwork and Stamina drop by 3, ranking points fall to 35%, hype rises by 15, and any pending Hall of
Fame induction is withdrawn.

## Dirty fighters
A new opponent quirk, Dirty fighter, throws low blows and headbutts, more often when tired, hurt or behind on the cards. Each foul
stops the action and gives you a breather (+14 stamina, hurt cleared, a little damage; a headbutt can open a cut). The first foul is a
warning, each one after costs them a point on the cards, and a fifth is a disqualification. A DQ win counts as a stoppage for
rankings and rematch odds but not as a knockout on your record.

## More chapters
The War (Hagler vs. Hearns: a top-10 slugger when you are top 8; a stoppage inside three rounds earns +3 Power), The Super Fight
(Leonard vs. Hagler: after a comeback, a title shot against a stronger champion, double purse) and The Money Fight
(Mayweather vs. Pacquiao: you and a division rival both in the pound-for-pound top 10, triple purse). Chapters now carry a priority,
so the once-only Super Fight and the Money Fight are offered ahead of the others when several are eligible.

## Game plans
On fight night pick a plan: Work the body (a third of landed punches to the body), Out-box them (jabs at least 45% of punches and
landing more than them), Pressure (throwing 25% more) or Counter-punch (three counters a round). Your corner judges every round from
your own numbers and shows it between rounds; on plan, the plan's punches do 6% more damage next round. Sticking to it in 60% of
rounds pays +120 XP. Plan progress survives a resumed fight.
