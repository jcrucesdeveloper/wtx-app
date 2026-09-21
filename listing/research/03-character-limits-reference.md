# Character & Asset Limits Reference (2026)

## Google Play Console

| Field | Limit |
|---|---|
| App title | 30 characters |
| Short description | 80 characters |
| Full description | 4,000 characters |
| What's new (release notes) | 500 characters |

## Apple App Store Connect

| Field | Limit |
|---|---|
| App name | 30 characters |
| Subtitle | 30 characters |
| Keywords field | 100 characters (comma-separated, counted in bytes not glyphs — ASCII keywords are safe to count 1 char = 1 byte) |
| Promotional text | 170 characters (can be edited anytime without a new review) |
| Description | 4,000 characters |
| What's New | 4,000 characters |

### iOS search indexing — what's actually searchable

Only **Name + Subtitle + Keywords field** (30 + 30 + 100 = up to 160
characters) feed Apple's search index. The Description is not indexed at all
— it exists purely to convert a visitor who already found the page. Don't
waste unique keywords cramming them into the description at the expense of
readability; save that budget for the 160 indexed characters instead.

### Keywords field mechanics

- Comma-separate with **no spaces** after commas to save characters
  (`gym,log,tracker` not `gym, log, tracker`).
- Never repeat a word already used in the App Name or Subtitle — Apple
  indexes those separately, so repeating wastes the 100-character budget.
- Apple auto-generates plural/singular and some word-order combinations, so
  you don't need both `workout` and `workouts`.

## Sources

- [App Store & Google Play Character Limits (2026) — AppStyle](https://www.appstyle.dev/blog/app-store-character-limits/)
- [Google Play Store Listing Requirements (2026) — PlayAudit](https://playaudit.app/blog/google-play-listing-requirements)
- [App Store App Name, Subtitle, Keywords: 30/30/100 (2026) — AppScreenshotStudio](https://appscreenshotstudio.com/blog/app-store-metadata-for-indie-devs-title-subtitle-keywords-2026)
- [App Store Connect Character Limits 2026 — SnapMonk](https://snapmonk.com/tools/app-store-metadata-limits)
