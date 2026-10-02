# Assets — Shot List & Checklist

No image files live here — this is the brief for whoever designs/captures
them. Full size specs: `research/04-asset-specs.md`.

## Screenshot content plan (shared across both stores; capture natively per
platform per the size tables in the specs file)

Capture from the real running app (`pnpm cap:open` / `pnpm cap:open:ios` in
the main worktree), not a mockup — both stores can flag screenshots that
don't match the submitted binary.

Each shot exists in English and Spanish, with the app itself switched to
that language.

| # | Screen | English headline | Spanish headline |
|---|---|---|---|
| 1 | Active workout, a set being logged | Log every set in *one tap*. | Registra cada serie con *un toque*. |
| 2 | Finish screen with a personal record | See what you *beat*. | Mira qué *superaste*. |
| 3 | Sessions tab: calendar and streak | Don't break the *streak*. | No rompas la *racha*. |
| 4 | Routine detail with exercise images | Your routines, *ready to go*. | Tus rutinas, *listas para entrenar*. |
| 5 | Routine source (`.wtt` text) | Your workout is *just text*. | Tu rutina es *solo texto*. |
| 6 | Share sheet with the QR | Share it with a *scan*. | Compártela con un *QR*. |
| 7 | Group workout room *(not captured yet)* | Train *live* with friends. | Entrena *en vivo* con amigos. |

Order matters: per `research/01-aso-strategy.md`, the **first two** images
carry the most conversion weight on both stores, so logging and the finish
screen lead.

Shot 7 needs two signed-in test accounts against a real backend, so it is
not in the generated set. When it is captured it goes in position 2 or 3;
never record real users' data for it.

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
