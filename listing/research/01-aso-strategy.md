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

WTX is a small, unusual entrant in a crowded category (workout tracker apps).
Two honest options:

1. **Compete head-on on "workout tracker/log/planner"** — high search volume,
   but WTX has none of the features (exercise library, progress graphs, rest
   timers, Apple Watch support) that make FitNotes, Hevy, and Strong win that
   query. Ranking there without those features risks bad reviews and quick
   uninstalls, which — per the retention-weighted algorithm above — actively
   hurts long-term ranking.
2. **Lead with the actual differentiator: plain-text, local-only, shareable
   routines** — lower search volume today, but it's a real, validated niche
   (see the Fitdown/Fitmark/markdown-fitness search results in
   `02-keyword-research.md`) where WTX's real feature set — parse a `.wtt`
   file, share a routine as a URL/QR with no account on either side — is a
   genuine, differentiated answer.

**Recommendation: hybrid.** Put one or two high-volume generic terms
("workout planner", "workout routine") in the Title/short description so WTX
is discoverable by normal search behavior, but spend the Subtitle, Keywords
field, and the first third of the long description on the plain-text /
no-account angle, since that's what will make someone who lands on the page
actually install and keep the app. Don't try to win "workout tracker" outright
— WTX isn't a tracker (no logging of completed sets yet; Sessions is a
placeholder). Calling it a "tracker" also risks a mismatch-with-functionality
rejection or bad reviews.

## Words to avoid in this app's copy

- "Tracker" / "track your workouts" — the app doesn't log completed
  sessions yet (Sessions tab is a placeholder). Use "planner", "builder",
  "routine library" instead.
- "Social" / "friends" / "share with your gym buddy's progress" — Friends tab
  is a placeholder. "Share via QR" is fine (that's real and shipped).
- "No ads" — false; the app shows AdMob ads. Say "minimal ads" or omit ad
  messaging from marketing copy entirely and let the store's own "Contains
  ads" badge do that disclosure.
- "Remove ads" as a sellable feature — the purchase flow isn't built yet.
- Any medical/health outcome claim ("lose weight", "get stronger
  guaranteed") — not licensed claims, both stores scrutinize Health & Fitness
  category copy for this, and it's not what the app does anyway (it's a
  routine format/organizer, not a coaching app).
