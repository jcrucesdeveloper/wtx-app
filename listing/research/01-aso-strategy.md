# ASO Strategy for WTX

## What ASO actually optimizes, in 2026

Sources: MobileAction, AppLaunchFlow, ASOMobile, Apptweak — see links at the
bottom of `02-keyword-research.md`.

- **iOS ranking inputs, weighted roughly highest → lowest:** App Name (30
  chars) → Subtitle (30 chars) → Keywords field (100 chars, invisible to
  users) → Description (not indexed for search at all — Apple only indexes
  Name + Subtitle + Keywords, ~160 characters total). Description matters for
  conversion (does the user tap Install), not for being found.
- **Android ranking inputs:** Title (30 chars) → Short description (80
  chars) → keyword *density* inside the Full description (4,000 chars).
  Unlike iOS, the long description **is** indexed — Google's crawler reads it
  — so natural keyword repetition there (rule of thumb: each important term
  once per ~250 characters, never stuffed) has real search-visibility value.
- **2026 shift both platforms have made:** ranking leans more on retention
  and engagement signals (do people who install actually keep using it) and
  less on raw install volume than it used to. Good copy that sets accurate
  expectations (so installs aren't disappointed and uninstalled fast) is now
  itself an ASO lever, not just a conversion lever.
- Screenshots and the first 2 images specifically carry outsized conversion
  weight — first two should state the value prop, not just show UI chrome.

## Positioning decision for WTX

Revised 2026-10-02 for v1.0.0. The first version of this document was
written when WTX was a routine organizer with no logging and no social
features, and told the copy to avoid "tracker" and "friends". Both are now
shipped, so that advice was underselling the app.

WTX is a small entrant in a crowded category. What it has that the copy can
truthfully lead with:

1. **Fast logging.** One tap per set with last time's values pre-filled,
   then a finish screen that shows records, the comparison with last time
   and the streak. This is the table-stakes job; the listing has to show it
   first or the page reads as "not a real tracker".
2. **Training live with friends.** Group workout rooms joined by code, link
   or QR. Hevy and Strong have feeds; a shared live session is the least
   common feature WTX has.
3. **No account needed.** The app is complete on the device; an account only
   adds sync and the social features.
4. **Routines as plain text.** A real niche (see `02-keyword-research.md`)
   and a good story for developer audiences, but too unusual to lead a
   mainstream listing.

**Decision:** title and first screenshots sell 1 (generic, high-volume
terms: "workout tracker", "planner", "gym log"). Subtitle and second
screenshot sell 2. The description covers 3 and 4. Plain text leads only
where the audience is developers (Reddit, Show HN).

## Spanish

Spanish is the launch market for marketing, so both stores get a full
Spanish localization: Spanish (Mexico) and Spanish (Spain) on the App Store,
es-419 and es-ES on Google Play. Localized listings convert meaningfully
better in non-English markets (15–40% in the vendor studies collected for
the growth plan; none is Spanish-specific). The Spanish copy uses the same
words the app's own Spanish UI uses (`src/locales/es.json`): rutina, serie,
récord personal, racha, porras.

## Words to avoid in this app's copy

- "No ads" / "ad-free" — 1.0.0 ships with ads off, but that is a switch, not
  a promise. Leave ads out of the copy either way.
- "Remove ads" as a sellable feature — the purchase flow isn't built.
- "No account" stated as an absolute — group workouts, sync and the feed
  need one. Say "no account needed" or "works without an account".
- "Nothing leaves your phone" — true only while signed out.
- "Progress graphs", "Apple Watch", "AI", "coach", "programs" — not in the
  app.
- Any medical or outcome claim ("lose weight", "get stronger guaranteed") —
  both stores scrutinize Health & Fitness copy for this.
- "Free" in a title, icon or screenshot (Play policy). It is fine in the
  Play description.
