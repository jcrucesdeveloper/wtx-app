# Vendored `wtx` parser

These files are a port of the TypeScript parser from
[`jcrucesdeveloper/wtx`](https://github.com/jcrucesdeveloper/wtx)
(`parsers/typescript/src/`), MIT licensed.

**Upstream commit:** `636fc79000395101183bf64b8393954fb5d096f2` (2026-09-04)

## Changes from upstream

The port is line-for-line faithful except:

- Relative import specifiers have the `.ts` extension stripped
  (`./types.ts` → `./types`) for Vite/`bundler` module resolution.
- A few index accesses carry a `!` assertion to satisfy this repo's
  `noUncheckedIndexedAccess` (regex capture groups that are guaranteed by a
  preceding `.exec()` null-check, and `meta` values defaulted to `''`).
- Double quotes → single quotes to match this repo's Prettier config.
- `exercises.at(-1)` → `exercises[exercises.length - 1]` so the port doesn't
  depend on an ES2022 `lib` target.

No parsing logic was changed.

## Re-syncing

Run `pnpm sync:wtx` (see `scripts/sync-wtx.mjs`). It pulls the upstream files
at the pinned ref, re-applies the codemod, and reformats. Review the diff and
bump the commit hash above.
