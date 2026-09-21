# App Store Connect — Name, Subtitle & Keywords

Limits: Name 30 · Subtitle 30 · Keywords field 100 bytes.
(`research/03-character-limits-reference.md`). Together these are the
**entire** iOS search-indexed surface — the description isn't indexed at
all, so get these right.

## App Name — pick one

**Primary recommendation (28/30 chars):**
```
WTX: Workout Routine Planner
```

**Alternative, brand-first (25/30 chars):**
```
WTX - Plain-Text Workouts
```

## Subtitle — pick one (must pair with whichever Name you pick, no word repeats)

If Name = "WTX: Workout Routine Planner":
```
No-Account Workout Planner        (26/30 chars)
```
If Name = "WTX - Plain-Text Workouts":
```
Routines as Text. No Account.     (29/30 chars)
```

Either pairing keeps the differentiator (no-account / plain-text) visible in
the indexed 60 characters of Name+Subtitle even when the Name itself leans
generic.

## Keywords field — 100 bytes, comma-separated, no spaces, no repeats of Name/Subtitle words

Since "workout", "routine", "planner", "account", "text" are already covered
by Name+Subtitle above, don't repeat them here — that wastes budget.

**Primary recommendation (94/100 bytes):**
```
gym,log,tracker,exercise,training,offline,template,share,qr,fitness,strength,builder,sets,reps
```

**Alternative leaning into the plain-text niche (95/100 bytes):**
```
gym,log,tracker,exercise,training,offline,template,share,qr,fitness,strength,sets,reps,markdown
```

Both counts verified programmatically (`node -e` byte-length check) — recount
if you edit either string, since Apple counts in bytes and a stray
multi-byte character (curly quote, em dash, etc.) will silently eat more of
the budget than it looks like.
