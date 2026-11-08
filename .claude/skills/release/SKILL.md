---
name: release
description: Bump the WTX version — set the new version in package.json and iOS, write changelog/X.Y.Z.txt from the commits since the last tag, copy it to src/changelog.txt, commit and tag vX.Y.Z on dev. Never pushes, never touches main, never builds. Use when the user says "release", "bump the version", "new version", "ship vX.Y.Z" or "tag a version".
---

# Release WTX

Four steps on `dev`: bump → changelog → copy into the app → commit and tag.
The argument is the new version (`1.2.0`) or `major` / `minor` / `patch`.
Without one, propose it from the commits (new features → minor, only fixes →
patch) and confirm with the user.

Never push, never merge into or switch to `main`, never build the app (the user
does all of that).

## 0. Check first — stop and say why if any fail

- On `dev`, and `git status --short` shows no tracked changes.
- The tag `vX.Y.Z` doesn't exist yet (`git tag -l vX.Y.Z`).

## 1. Bump the version

- `package.json`: `"version": "X.Y.Z"`. Android reads it from there.
- `ios/App/App.xcodeproj/project.pbxproj`: `MARKETING_VERSION = X.Y.Z;` and
  `CURRENT_PROJECT_VERSION` + 1 (both Debug and Release).

Edit only those lines.

## 2. Write changelog/X.Y.Z.txt

From `git log <last tag>..HEAD --no-merges --format="%h %s"`. Plain text,
English:

```
YYYY-MM-DD
- First change
- Second change
```

Line 1 is today's date. Every other line is `- ` and one change, on a single line.
Features first, fixes last (start them with `Fixed: `). Write for users: what each
change does for them, several commits merged into one line where they're one
feature. Leave out chores, tests, refactors, docs and anything users won't notice.

## 3. Copy it into the app

```sh
cp changelog/X.Y.Z.txt src/changelog.txt
```

`src/changelog.txt` is the only changelog the app ships (Configuration → version).

## 4. Commit and tag

```sh
git add package.json ios/App/App.xcodeproj/project.pbxproj changelog/X.Y.Z.txt src/changelog.txt
git commit -m "Release vX.Y.Z"      # plus the session's Co-Authored-By line
git tag -a vX.Y.Z -m "WTX vX.Y.Z"
```

Then report: the version, the tag, and the changelog lines.
