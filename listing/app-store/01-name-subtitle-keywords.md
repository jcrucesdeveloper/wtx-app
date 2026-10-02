# App Store Connect — Name, Subtitle & Keywords

Limits: Name 30 · Subtitle 30 · Keywords field 100 bytes.
(`research/03-character-limits-reference.md`). Together these are the
**entire** iOS search-indexed surface — the description isn't indexed at
all, so get these right.

Each localization has its own Name, Subtitle and Keywords. Add **Spanish
(Mexico)** and **Spanish (Spain)** with the Spanish set below; Spanish
(Mexico) is what the Latin American storefronts show.

## English

**App Name (30/30 chars):**
```
WTX: Workout Tracker & Planner
```

Alternative, shorter (24/30 chars):
```
WTX: Gym Workout Tracker
```

**Subtitle (28/30 chars):**
```
Gym log. Train with friends.
```

Alternative (25/30 chars):
```
Log sets, PRs and streaks
```

**Keywords (97/100 bytes):**
```
routine,exercise,strength,lifting,weightlifting,sets,reps,pr,streak,rest,timer,offline,fitness,qr
```

## Spanish

**App Name (30/30 chars):**
```
WTX: Rutinas y Registro de Gym
```

Alternative (24/30 chars):
```
WTX: Rutinas de Gimnasio
```

**Subtitle (28/30 chars):**
```
Entrena pesas con tus amigos
```

Alternative (23/30 chars):
```
Series, récords y racha
```

**Keywords (97/100 bytes):**
```
gimnasio,entrenamiento,ejercicios,fuerza,series,repeticiones,record,racha,musculacion,diario,plan
```

The Spanish keywords are written without accents on purpose: Apple counts
the field in bytes and an accented letter costs two.

## Rules these follow

- No word from the Name or Subtitle is repeated in the Keywords field; Apple
  indexes them separately, so a repeat wastes budget.
- Comma-separated, no spaces.
- All counts were checked with a script. Recount after any edit.
- The keyword picks are not backed by search-volume data (see the honesty
  check in `README.md`). Validate them with the Apple Search Ads popularity
  score once the app is live.
