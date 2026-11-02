# WTX for Wear OS (`:wear`)

Native Wear OS app (Kotlin + Jetpack Compose for Wear OS), a module of the Android
project next to the phone app (`:app`). It is a **companion client**: it shows the rest
countdown of the session running on the phone, lets you adjust it by ±15 s, and vibrates
when the rest ends. The phone stays the session host; the watch never logs sets.

The full documentation (MVP scope, protocol, clocks, disconnection, permissions, test
procedure, diagrams) is the **Wear OS** section of the repository `README.md`. This file
is only the module map.

| | |
| --- | --- |
| Installed `applicationId` | `com.wtxworkout.app` (same as `:app`, required by the Data Layer; neither module has a debug suffix) |
| Code namespace | `com.wtxworkout.wear` |
| `minSdk` / `targetSdk` / `compileSdk` | 33 (Wear OS 4, what the Galaxy Watch6 Classic ships with) / 36 / 36 |
| Manifest | `android.hardware.type.watch`, `com.google.android.wearable.standalone=false` |
| Debug APK | `android/wear/build/outputs/apk/debug/wear-debug.apk` |

`:app` and `:wear` share the debug keystore (`~/.android/debug.keystore`); check with
`.\gradlew.bat :app:signingReport :wear:signingReport`.

## Build, test and run

Needs JDK 17+ (Android Studio's bundled JBR works; set `JAVA_HOME`). From `android/`:

```powershell
.\gradlew.bat :wear:assembleDebug :wear:testDebugUnitTest :wear:lintDebug
.\gradlew.bat :app:assembleDebug     # the phone app

# With a phone and a watch emulator both running, always name the target:
adb devices
adb -s <watch-serial> install -r wear\build\outputs\apk\debug\wear-debug.apk
adb -s <watch-serial> shell am start -n com.wtxworkout.app/com.wtxworkout.wear.MainActivity
```

Never install `app-debug.apk` on the watch or `wear-debug.apk` on the phone.

## Code map (`src/main/kotlin/com/wtxworkout/wear/`)

| File | Role |
| --- | --- |
| `WearProtocol.kt` | Paths, JSON encoding of requests/adjusts, strict validation of received state and results. Mirrors `src/lib/wearProtocol.ts` and the phone's `WearProtocol.java`; the shared fixtures are in `android/protocol/wear-v1.json` |
| `WatchModel.kt` | Pure logic, no Android: the reducer (`WatchReducer`), the trust rule for state, latency estimate and the mapping to screens (`WatchScreens.from`) |
| `RestAlarmPlanner.kt` | Pure decision: schedule, keep, cancel or fire the end alarm, and when vibrating is allowed |
| `RestAlarms.kt` | `AlarmManager` alarm, `RestEndReceiver`, vibration, `BootReceiver` |
| `RestNotifier.kt` | Notification + Ongoing Activity with a system-drawn chronometer |
| `WatchRuntime.kt` | Process-wide runtime: host discovery, requests, adjust delivery with one resend, link watch while the UI is open |
| `WtxListenerService.kt` | Manifest-declared `WearableListenerService` (data, messages, capability); works with no Activity |
| `WatchScreens.kt` | Compose UI for each state (searching, no phone, phone not ready, idle, active, resting, ended) |
| `WatchPreviews.kt` | `@Preview`s with fake models; they never touch the transport |
| `WtxTheme.kt` | WTX's dark palette and default accent (from `src/assets/base.css`) |
| `MainActivity.kt` | Attaches the runtime while visible; asks for notifications once |

Strings live in `res/values/strings.xml` (Spanish, the default) and `res/values-en/`.

Unit tests (`src/test/kotlin/...`) cover the protocol fixtures, the reducer and screens
mapping, and the alarm planner.

## Dependency note

Wear Compose is pinned to 1.6.2 with Compose BOM 2025.12.01: Wear Compose 1.7+ pulls
Compose 1.12, which needs AGP 9.1 and `compileSdk` 37, and the repo is on AGP 8.13 /
`compileSdk` 36. Kotlin 2.2.20 (and its Compose compiler plugin) is declared in the root
`build.gradle`; it is the version the Capacitor plugins already default to.
