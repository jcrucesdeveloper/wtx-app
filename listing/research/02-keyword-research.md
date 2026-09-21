# Keyword Research

Methodology per `01-aso-strategy.md`: brainstorm + competitor-pattern
analysis, not proprietary volume data. See "Honesty check" in the top-level
`README.md` before treating any priority as more than a starting point.

## Keyword groups

| Keyword / phrase | Group | Priority | Where to use it |
|---|---|---|---|
| wtx | Branded | High | Title (Play/App Store), everywhere |
| workout planner | Generic, high-volume | High | Title, short desc, subtitle |
| workout routine | Generic, high-volume | High | Title, description |
| workout log | Generic, high-volume | Med | Subtitle/keywords field, description |
| workout template | Generic, mid-volume | High | Subtitle, keywords, description (matches the actual "Templates library" feature — high relevance, not just volume) |
| gym routine | Generic, mid-volume | Med | Keywords field, description |
| exercise routine builder | Generic, mid-volume | Med | Description |
| plain text workout | Niche/differentiator | High (low competition, high relevance) | Short/full description headline, subtitle candidate |
| workout without account | Niche/differentiator | Med | Full description, Data Safety framing |
| offline workout app | Niche/differentiator | High | Keywords field, description |
| no sign up workout app | Niche/differentiator | Med | Description |
| local workout tracker | Niche/differentiator | Low-Med | Description (careful: "tracker" — see word-avoid list) |
| share workout QR code | Feature-specific | Med | Description, screenshot captions |
| import workout file | Feature-specific | Low | Description |
| custom workout plan | Generic | Med | Description |
| workout routine creator | Generic | Med | Keywords field |
| .wtt / text-file workout | Niche, novel | Low volume, high uniqueness | Description flavor text only — not a real search term yet, but reinforces the differentiator narrative for anyone who does land on the page |

## Why "plain text workout" is a real, if small, niche

Search results while researching this turned up: **Fitdown** (a markdown
superset markup language + parser specifically for weightlifting logs),
**Fitmark** ("create your own workout app using markdown"), and a dev-community
write-up titled "I Ditched My Fitness App for a Folder of Markdown Files
(Spoiler – It's Better)". That's independent, unprompted evidence that
"plain text / markdown workout" is a real search-and-build pattern among a
developer-adjacent, tool-minimalist audience — exactly WTX's actual feature
set (a `.wtt` text format, no account, local-only). This is the closest thing
WTX has to a blue-ocean keyword cluster: near-zero competition from the
big incumbents (FitNotes, Hevy, Strong all explicitly market on "no ads" /
"simplicity", not on "plain text" or "own your data as a file").

## Where WTX cannot win head-on

FitNotes and Hevy already own "no ads, offline, simple gym log" — and they
have actual logging/history/graphs, which WTX doesn't yet. Don't compete on
"best workout tracker" generic queries; compete on "your routines are text
files you own," which none of them offer.

## Validating this after store console access exists

- **Apple Search Ads** → Search Tab → keyword popularity score (free to view
  without running ads) for each candidate keyword.
- **Google Play Console** → Store performance → search terms report, a few
  weeks after launch, to see what's actually converting.
- Manually search each candidate term in both stores and note what currently
  ranks — if "plain text workout" returns nothing relevant, that confirms low
  competition (good) but also means demand is unproven; treat it as an
  experiment, not a guarantee.
- Free tiers of AppTweak / MobileAction / Sensor Tower / Appfigures can give
  rough volume/difficulty scores for the generic terms in the table above.

## Sources

- [ASO keyword research in 2026 — MobileAction](https://www.mobileaction.co/blog/aso-keyword-research/)
- [App Store Optimization (ASO): The Complete 2026 Guide — Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-apps/complete-guide-to-app-store-optimization)
- [App Store Optimization for Fitness Apps — Gummicube](https://www.gummicube.com/blog/app-store-optimization-for-fitness-apps)
- [ASO for Fitness Apps: Keyword Patterns — SEM Nexus](https://semnexus.com/aso-for-fitness-apps-keyword-patterns-drive-category-rankings)
- [FitNotes X — Google Play](https://play.google.com/store/apps/details?id=com.fitnotesx&hl=en)
- [Hevy — Google Play](https://play.google.com/store/apps/details?id=com.hevy)
- [FitNotes — Gym Workout Log](http://www.fitnotesapp.com/)
- [fitdown — GitHub](https://github.com/datavis-tech/fitdown)
- [Fitmark — Create your own workout app using Markdown](https://fitmark.org/)
- ["I Ditched My Fitness App for a Folder of Markdown Files" — DEV Community](https://dev.to/javier_ramrez_e2b4bb54fb/i-ditched-my-fitness-app-for-a-folder-of-markdown-files-spoiler-its-better-2lad)
