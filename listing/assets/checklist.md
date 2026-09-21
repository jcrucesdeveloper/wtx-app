# Assets — Shot List & Checklist

No image files live here — this is the brief for whoever designs/captures
them. Full size specs: `research/04-asset-specs.md`.

## Screenshot content plan (shared across both stores; capture natively per
platform per the size tables in the specs file)

Capture from the real running app (`pnpm cap:open` / `pnpm cap:open:ios` in
the main worktree), not a mockup — both stores can flag screenshots that
don't match the submitted binary.

1. **Hero / Templates library** — the routine list with a short overlay
   headline: *"Your routines, as text files you own."*
2. **Create a routine** — the routine-builder form mid-fill, overlay:
   *"Build a routine in seconds."*
3. **Share via QR** — the generated QR code for a routine, overlay:
   *"Share it with a scan. No account needed."*
4. **Load a routine** — the three load options (paste / file / QR), overlay:
   *"Paste it, pick it, or scan it."*
5. **The .wtt format** — a close-up of raw `.wtt` text next to its parsed
   summary, overlay: *"It's just text."* (This is the differentiator shot —
   don't skip it even though it's the most unusual one in the set.)
6. **Privacy callout** — a clean app screen with overlay text only:
   *"No account. No cloud. Nothing leaves your phone."*
7. **Accent color picker** — overlay: *"Make it yours."*
8. *(Optional, if room for an 8th)* Routine detail view showing exercise
   count / sets / muscle groups summary.

Order matters: per `research/01-aso-strategy.md`, the **first two** images
carry the most conversion weight on both stores — lead with #1 and #3
(the library + the QR-share differentiator) rather than burying the unique
hook at slide 5.

## Icon

512×512 (Play) / 1024×1024 (App Store) from the same master artwork. Use
WTX's existing accent palette (`src/config/theme.ts`) — default Emerald
`#10b981` — for brand consistency with in-app UI. Keep it legible at
favicon size (the existing `public/favicon.ico` is a starting reference,
not necessarily final store-icon quality).

## Feature graphic (Play only)

1024×500. Small billboard, not a cropped screenshot: app name + the
one-line hook ("Workout routines, as text files you own") on an
accent-colored background.

## Checklist

- [ ] Icon — Play (512×512) and App Store (1024×1024) variants
- [ ] Feature graphic — Play (1024×500)
- [ ] Phone screenshot set — Android (1080×1920, 2–8 images)
- [ ] iPhone screenshot set — 6.9" required, 6.5" recommended
- [ ] iPad screenshot set — only if iPad is a supported device
- [ ] All screenshots captured from the real running build, not mockups
- [ ] Overlay text matches the copy tone in `play-store/` and `app-store/`
      (no claims about Sessions, Friends, or ad removal)
