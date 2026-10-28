# Research notes: what players want from games like Twelve Rounds

Compiled from critic reviews, player forums, app-store reviews, platform guidelines and design talks.
Steam and App Store points came partly from search excerpts; treat the mobile monetization complaints as anecdotal.

## What players praise
- **Pattern mastery.** Punch-Out!! works as "pattern recognition and crackerjack timing"; returning fighters add new tricks. (giantbomb.com/reviews/punch-out-review/1900-155/)
- **Stamina that punishes misses.** Fight Night Round 4 drains more stamina on whiffs and blocked punches; tired fighters slow down. (gamingbolt.com/fight-night-round-4-review-ps3360)
- **Authored story beats.** Fight Night Champion's story mode is its best-remembered part. (gameinformer.com, Fight Night Champion review)
- **Long-run history.** Out of the Park players run century-long sims for records and Hall of Fame cases. (30-30.club/2024/05/24/simulating-100-years-of-out-of-the-park-baseball/)

## What players complain about
- **Menu-only careers.** Undisputed's career is "spreadsheet-style menus" with no scenes or choices. (pushsquare.com/reviews/ps5/undisputed)
- **No legacy layer.** Undisputed players asked for retired-fighter lists, a Hall of Fame and yearly awards. (steamcommunity.com/app/1451190/discussions)
- **Pointless training.** Fight Night Champion and Big Rumble drills had no challenge and no visible effect. (psu.com, fingerguns.net reviews)
- **Harsh stat decay.** Punch Club's daily stat loss is its most-cited complaint. (nintendolife.com/reviews/3ds-eshop/punch_club)
- **Spam exploits and rubber-band AI.** Fight Night Round 4 patched hook and block spam; Undisputed's AI turns unhittable once you lead. (playstationlifestyle.net, steamcommunity.com)
- **Opaque judging.** Players suspect rounds are scored on volume. (steamcommunity.com/app/1451190/discussions)
- **Energy timers and paid recovery** in mobile boxing games. (Real Boxing 2, Boxing Star store reviews)

## Mobile and accessibility guidance
- Primary touch controls at least 44 pt, press state visible under the thumb. (developer.apple.com/design/human-interface-guidelines/game-controls)
- Act on pointerdown with a short input buffer; avoid tap delay. (developer.chrome.com/blog/300ms-tap-delay-gone-away)
- Never signal by colour alone; add a shape. (Xbox Accessibility Guideline 103)
- No more than three flashes per second; allow turning off shake. (WCAG 2.3.1; Xbox Accessibility Guideline 117)
- Adjustable speed and assists without shaming the player. (Celeste assist mode; gameaccessibilityguidelines.com)
- Hands-on tutorials beat text; introduce systems when they unlock. (gamedeveloper.com, "No one reads text in a tutorial")
- Design for interruption: start fast, stop at no cost. (pocketgamer.biz)

## What Twelve Rounds already did well
Pointerdown input with buffering, miss stamina cost, anti-spam penalties, no rubber-banding, no energy or monetization,
division moves, left-handed layout, button sizes, compact calendar with quick camp, legends with learnable patterns.

## What this research added
| Finding | Change |
|---|---|
| Colour-only tells | Tell symbols over the winding glove (dot, down arrow, curl, up arrow, BODY label) |
| Shake and flash comfort | Screen shake toggle (now actually wired), bright-flash toggle, hard cap of three flashes per second |
| Assist without shame | Reaction assist: +25% or +50% wind-up time, no penalty |
| Text size | Normal, Large, Larger |
| Text-heavy tutorial | In-fight coach: first time each punch appears, a one-line call-out with a brief slow-down; repeats if you keep eating the same punch; "punch now" on their first miss |
| Systems explained by walls of text | One-line first-visit tips on career screens, resettable from Settings |
| Opaque judging | Round box in the corner: landed, power shots, knockdowns, each judge's 10-9, and why (covering up, knockdowns). Open scoring can be turned off |
| Losses that teach nothing | Coach's notes after every fight: which punch hurt you most and how to answer it, accuracy, body work, power mix |
| Menu-only career | Press conference before pro fights: talk trash (+8% purse, angrier opponent), show respect (fairer judges, immune to stare-downs), stay focused (longer tells) |
| No legacy layer | Year-end awards (Fighter, Knockout, Upset of the Year), Hall of Fame classes for retired greats and for you, awards add to your legacy score |
| Unexplained decline | One-time "Father Time" explainer: only Speed, Footwork and Stamina fade; skills never do |

## Second pass
| Finding | Change |
|---|---|
| Players want to place controls (Dead Cells mobile) | Drag-and-resize button layout editor, from Settings or the pause menu; cover, inner and landscape each keep their own layout |
| Training that doesn't matter (Fight Night Champion, Big Rumble) | Drills show grade targets up front; under 40% is a sloppy session with no gain and extra fatigue; result card shows the grade, before-and-after stat bars and personal bests |
| Haptics slider (Game Accessibility Guidelines) | Vibration strength: Light, Normal, Strong |
| Fights that play out the same every time (Big Rumble, Undisputed) | Opponents adjust between rounds: they read a punch you lean on, protect the body after body work (opening the head), gamble when behind, cover up when hurt. The corner shows what changed |
| Summary cards with records broken (OOTP, Retro Bowl) | Personal records: fastest stoppage, most punches landed, most perfect dodges, longest streak, biggest upset; new records show on the result screen and the Record screen |
| Design for interruption (mobile session guidance; Undisputed and Real Boxing complaints about lost progress) | Career fights checkpoint at every round start; after a crash, call or closed app, Home offers "Resume the fight" at the start of that round with cards, damage and stamina intact |
| Presentation and story beats (Undisputed's lack of presentation; Fight Night Champion's story praise) | Skippable ring-announcer introduction for pro fights (title fights get the full championship call) |
| Every career beat needs a scene or choice | Post-fight interview: after a win, call out a contender (hype, and they're offered next), thank your team (less camp fatigue) or stay humble (+1 Ring IQ); after a loss, demand a rematch, no excuses, or blame the judges |
| Separate volume controls (Game Accessibility Guidelines) | Master, punches/bell, wind-up tells and crowd sliders with a live preview |
| Change difficulty during play (Game Accessibility Guidelines) | Difficulty can be changed mid-career from Settings, no penalty beyond the XP rate |
| Progression that feels "linear, vanilla, unrewarding" (Undisputed) | Career goals: three short-term targets at a time (knockouts, streaks, body work, rankings, titles, legends, rival), with XP and hype rewards |
| Communicate growth (stat deltas, history) | Overall rating and ranking-point charts on the Record screen, one measure per chart, tap a point for that fight |
| Career beats with dialogue | Your rival reacts to your big wins and losses in the news, with spacing and variety |

## Third pass
| Finding | Change |
|---|---|
| Losing feels meaningless when you are back in title contention right away (Undisputed player feedback, 2025; [Steam discussions](https://steamcommunity.com/app/1451190/discussions/0/583876246978517929)) | Back of the line: after a loss, title-shot offers and champion callouts wait until you win again. A robbery costs nothing, a split or majority decision one win, a clear decision two, a stoppage three. The path card, result screen and the show say how many wins you need |
| Career modes lack personality; fans want a boxing show covering title changes, rising fighters and retirements (Fight Night Round 5 wishlist, [N4G](https://n4g.com/?p=354927)) | Saturday Night Boxing: a monthly studio show with headlines, the fighters rising in your division, the pound-for-pound top five with movement, and a host's take on your career |
| Players care about standing beyond their own division (Fight Night Champion legacy, [Game Informer](https://gameinformer.com/b/news/archive/2010/12/09/fight-night-champion-career-mode-explained)) | Pound-for-pound top 10 across all divisions (rating, belts, record, titles), shown on Rankings and your profile, with news when you enter the top 10 or reach #1 and a Pound-for-Pound King trophy |
| Career and story content grows repetitive after a few fights (World Championship Boxing Manager 2 reviews, [The Xbox Hub](https://www.thexboxhub.com/world-championship-boxing-manager-2-review/)) | Rivals now change with the career, callouts are a choice with odds, and offers include ranked contenders to climb past (shipped just before this pass) |
| Training that is simulated rather than played (Undisputed reviews, [PSU](https://www.psu.com/reviews/undisputed-review-ps5/)) | Already covered: camp drills are played, graded and failable |
