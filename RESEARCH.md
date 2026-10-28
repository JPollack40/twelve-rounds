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

## Not done yet (candidates)
- Drag-and-resize fight button layout per screen (cover vs inner).
- Training drills that can be failed, with visible stat outcomes.
- Haptics strength slider.
