---
name: release
description: Cut a WTX release — bump the version everywhere (package.json, Android, iOS), write the CHANGELOG entry from the commits since the last tag, commit, create an annotated vX.Y.Z tag on main, and push. Use when the user says "release", "launch", "ship vX.Y.Z", "tag a version", or asks for a changelog for a launch.
---

# Release WTX

Releases are cut from `main`, tagged `vX.Y.Z` (annotated), and described in
`CHANGELOG.md` ([Keep a Changelog](https://keepachangelog.com) format,
[SemVer](https://semver.org)). The argument is the new version (`1.2.0`) or
a bump type (`major` / `minor` / `patch`); if neither is given, propose one
from the commits (breaking → major, new features → minor, fixes only → patch)
and confirm it with the user.

## 1. Preconditions — stop and report if any fail

- Working tree clean (`git status --short` shows no tracked changes). Don't
  commit other people's WIP as part of a release.
- `git fetch origin --tags`. The tag `vX.Y.Z` must not exist locally or on
  `origin` — never move, delete or re-point an existing tag.
- Get onto an up-to-date `main`: `git switch main && git merge --ff-only origin/main`.
  If the user wants what's on `dev` released (the usual case), `git merge --no-edit dev`
  into `main`. Resolve conflicts carefully; never force-push.
- Checks pass on `main`: `npm run type-check`, `npx vitest run`, `npx eslint src`,
  `npx oxlint src`. A failing check blocks the release.

## 2. Bump the version

| File | Field | Rule |
|---|---|---|
| `package.json` | `"version"` | `X.Y.Z` (Sentry's release and the in-app version read it via `__APP_VERSION__`). Y and Z must stay ≤ 99. |
| `ios/App/App.xcodeproj/project.pbxproj` | `MARKETING_VERSION` (Debug + Release) | `X.Y.Z` |
| `ios/App/App.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION` (Debug + Release) | +1 per uploaded build (it must strictly increase) |

Android needs no edit: `android/app/build.gradle` reads `package.json` and
derives `versionName` (`X.Y.Z`) and `versionCode`
(`X*1000000 + Y*10000 + Z*100 + buildNumber`). `buildNumber` is a Gradle
property that defaults to 0; it's only for uploading the same version to Play
again.

Edit the exact lines (they're few); don't reformat the files. Verify with
`grep -n '"version"' package.json` and
`grep -n "MARKETING_VERSION\|CURRENT_PROJECT_VERSION" ios/App/App.xcodeproj/project.pbxproj`.

## 3. Write the CHANGELOG entry

- Source: `git log <last tag>..HEAD --no-merges --format="%h %s"` (for the
  first release, the whole history). Read diffs of anything whose subject is
  unclear — don't guess.
- Add a section at the top, below the intro, newest first:
  `## [X.Y.Z] - YYYY-MM-DD` with only the groups that apply, in this order:
  `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Write for users, not developers: one line per change, what it does for
  them, merged where several commits make one feature. Leave out chores,
  test-only, lint, CI, refactors, docs and WIP commits unless users notice
  them. Never paste raw commit subjects.
- For the first release, organise `Added` by product area (sub-bullets are fine).
- Keep the link references at the bottom updated:
  `[X.Y.Z]: https://github.com/jcrucesdeveloper/wtx-app/compare/vPREV...vX.Y.Z`
  (first release: `.../releases/tag/vX.Y.Z`), and `[Unreleased]` comparing
  `vX.Y.Z...HEAD`.

## 4. Commit, tag, push

```sh
git add package.json ios/App/App.xcodeproj/project.pbxproj CHANGELOG.md
git commit -m "Release vX.Y.Z"            # + the session's Co-Authored-By trailer
git tag -a vX.Y.Z -m "WTX vX.Y.Z" -m "<the changelog section, plain text>"
```

Pushing publishes the release, so confirm first unless the user already asked
for it in this request. Then:

```sh
git push origin main
git push origin vX.Y.Z                     # push the one tag, not --tags
git switch dev && git merge --ff-only main || git merge --no-edit main
git push origin dev                        # dev carries the bumped version too
```

## 5. Report

The version, the tag and the commit it points at, the changelog section, and
what's still manual: native builds (`pnpm build && npx cap sync`, then Xcode /
Gradle with the release settings), store uploads, and the private launch
checklist (`../wtx-app-todo/LAUNCH-TODO.md`) if it has open items.
