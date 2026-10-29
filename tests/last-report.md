# Regression report 2026-10-29T05:43:00.952Z

5 fights per matchup, 500 simulated careers, 177s.

## Fight bands
| matchup | win rate | band | KO for/against | acc you/them | ok |
|---|---|---|---|---|---|
| human_eq_champ | 80% | 30–90 | 4/0 | 0.65/0.28 | ✅ |
| human_eq_legend | 20% | 10–70 | 1/0 | 0.51/0.35 | ✅ |
| human_eq_contender | 100% | 70–100 | 5/0 | 0.71/0.24 | ✅ |
| human_plus15 | 60% | 10–65 | 3/0 | 0.58/0.48 | ✅ |
| novice_eq_contender | 100% | 50–100 | 5/0 | 0.74/0.25 | ✅ |
| expert_plus20 | 40% | 10–90 | 1/0 | 0.56/0.12 | ✅ |
| masher_eq | 0% | 0–40 | 0/5 | 0.27/0.82 | ✅ |
| turtle_eq | 0% | 0–75 | 0/0 | 0.26/0.31 | ✅ |
| human_legend_tyrell | 60% | 5–60 | 3/0 | 0.57/0.36 | ✅ |
| human_legend_hollis | 60% | 30–100 | 2/0 | 0.51/0.54 | ✅ |
| daily_40_days | 88% | 20–90 | 0/0 | 0/0 | ✅ |

## Careers
```
{
 "n": 500,
 "retireAgeMed": 37,
 "winsMed": 46,
 "lossesMed": 22,
 "titlesMed": 2,
 "titlesAvg": 2.14,
 "champShare": 0.99,
 "undisputedShare": 0.1,
 "multiDivShare": 0,
 "legendsAvg": 1.32,
 "chaptersAvg": 0.99,
 "moneyMed": 44650459,
 "womenN": 166,
 "womenChampShare": 1,
 "womenLegendsAvg": 1.13,
 "crossCircuitLegends": 0,
 "hofMed": 389,
 "tiers": {
  "Champion": 121,
  "Hall of Famer": 245,
  "All-Time Great": 115,
  "Contender": 13,
  "The Greatest of All Time": 5,
  "Journeyman": 1
 },
 "forcedRetireShare": 0,
 "dmgMed": 70
}
```

| check | value | band | ok |
|---|---|---|---|
| retireAgeMed | 37 | 31–40 | ✅ |
| champShare | 0.99 | 0.4–1 | ✅ |
| forcedRetireShare | 0 | 0–0.4 | ✅ |
| chaptersAvg | 0.99 | 0.3–5 | ✅ |
| legendsAvg | 1.32 | 0.2–6 | ✅ |
| undisputedShare | 0.1 | 0–0.2 | ✅ |
| womenChampShare | 1 | 0.4–1 | ✅ |
| womenLegendsAvg | 1.13 | 0.1–6 | ✅ |
| crossCircuitLegends | 0 | 0–0 | ✅ |

No page errors.