# Changelog

All notable changes to WTX are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-30

The first public release of WTX for iOS, Android and the web.

### Added

- **Routines**
  - Write training routines as plain text (`.wtt`), or build them in an editor with sets, reps, weight,
    duration, rest, and per-set weight overrides.
  - Three starter routines for new users; drag to reorder routines and exercises.
  - Exercise picker backed by a large exercise library, with muscle-group filters, images (cached on the
    device) and Spanish names.
  - Load a routine from a file, pasted text, a share link or a QR code, and share your own the same ways.
- **Workouts**
  - Live workout tracking: tap to log a set with last time's values, warm-up and drop sets, reorder,
    add, edit or remove exercises mid-workout, and a rest timer.
  - Progress bar and stats while you train, a review step before finishing, and a celebratory finish
    screen with personal records, comparison to last time, week streak and milestones.
  - Workout history with a training calendar, and a share button for finished workouts.
  - Opt-in local workout reminders.
- **Accounts and sync** (optional — the app works fully on the device without one)
  - Sign up with email to sync routines and workouts across devices; email confirmation and password
    recovery.
  - Keep individual workouts on the device only, or save them to your account later.
  - Export all your data as a `.zip` and import it back; delete your account and its data at any time.
- **Group workouts**
  - Create a room from a routine and invite friends with a code, link or QR code.
  - Train together live: see each other's sets, team progress, personal records as they happen, and send
    cheers.
  - A recap when everyone finishes; training together makes you follow each other.
- **Social**
  - A feed of workouts shared by people you follow, with the training partners you did them with, and
    kudos.
  - Open any shared workout on its own page to see everything that was logged.
  - Profiles with name, bio, workout count, followers and following, an activity calendar with your week
    streak, and your shared workouts; "Follows you" and "trained together" on other people's profiles.
  - Follow by invite code, link or QR; Follow back, unfollow, and remove followers — nobody is notified.
    Reset your invite code if it's been shared too widely.
  - Shared workouts are visible only to your followers.
- **Safety**
  - Report posts and accounts, block and unblock people (with a Blocked accounts list), and a filter for
    offensive names, bios and shared workouts.
- **App**
  - English and Spanish; dark, light or system theme with a choice of accent colour; kg or lb.
  - First-run onboarding, safe-area aware layout for notched phones, and an Android back button that
    closes open sheets first.
  - Privacy Policy, Terms and account-deletion pages, in the app and on the web; a Contact support link.

### Security

- Row-level security on every table; rate limits on room codes, invite codes, follows, blocks and reports;
  size limits on stored data; invite codes readable only by their owner.

[Unreleased]: https://github.com/jcrucesdeveloper/wtx-app/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/jcrucesdeveloper/wtx-app/releases/tag/v1.0.0
