# App Store — Category & Age Rating

## Category

**Primary: Health & Fitness.** Secondary: **Social Networking** is now
defensible (follows, shared workouts, live group workouts), but
**Productivity** still fits the plain-text routine mechanic and the audience
in `research/01-aso-strategy.md`. Pick one; it doesn't affect the rating.

## Age rating (Apple's questionnaire, age bands 4+, 9+, 13+, 16+, 18+)

Apple's current questionnaire asks, besides the content-intensity questions,
about **capabilities**: user-generated content, messaging/chat, advertising,
unrestricted web access, and parental controls / age assurance. Answers for
WTX as it is now:

| Question | Answer | Why |
|---|---|---|
| Violence, sexual content, profanity, horror, drugs, gambling, contests… | None | No such content in the app itself |
| Medical or treatment information | None / Infrequent — **Verify** | It's a training log with a health disclaimer, no medical advice |
| User-generated content | **Yes** | Display names, bios, routines/workout notes shared with followers and roommates |
| Messaging and chat | **No** | No DMs, comments or chat — kudos only. Rooms show names + sets, no free text |
| Advertising | **Yes** | AdMob interstitials |
| Unrestricted web access | No | No in-app browser |
| Age assurance / parental controls | No | Terms: 16+ for accounts, not directed at under-13s |

**Recommendation: 13+.** UGC visible to other people typically lands
above 9+, and 13+ matches the Terms/Policy (not directed at under-13s;
accounts 16+). Let the questionnaire compute it and don't lower it manually.

### Guideline 1.2 (User-Generated Content) — required before review

- [x] Terms forbid objectionable content with zero tolerance for abusive
      users — done (`legal.terms`, shown at sign-up and in Configuration →
      About; also `https://<site>/terms.html`).
- [ ] Filter for objectionable material (names, bios, shared workouts) —
      moderation work.
- [ ] Report content (profiles, shared workouts) and act on reports within
      24 hours (remove content, eject the user) — moderation work + an
      actual process: who checks `content_reports`, and how often.
- [ ] Block abusive users — moderation work.
- [ ] Published contact information — `VITE_SUPPORT_EMAIL` in the app and on
      the legal pages, plus the Support URL in App Store Connect.
- [ ] Mention all of the above in App Review notes with where to find them.

## In-App Purchases declaration

**None to declare.** The "Remove ads" purchase is hidden until a real
purchase flow ships. Update this page and the App Privacy label together
when it does.
