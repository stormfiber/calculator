# Quadrant Calc Pro — Android wrapper

Single-activity WebView shell around the web app (`com.quadrantcalc`).
No Gradle, no Android Studio — a plain aapt2/javac/d8 pipeline.

## Files

- `src/main/AndroidManifest.xml` — package, min SDK 24 / target SDK 37, launcher entry
- `src/main/java/com/quadrantcalc/MainActivity.java` — WebView host (JS + DOM storage, back-nav, lifecycle-safe)
- `src/main/res/mipmap-xxxhdpi/ic_launcher.png` — launcher icon (from `../assets/logo.png`)
- `src/main/assets/` — the web app, synced from `../` at build time (do not edit by hand)
- `build.sh` — full build pipeline (aapt2 → javac → d8 → zipalign → apksigner)
- `QuadrantCalcPro-debug.apk` — build output (gitignored; not committed)

## Build locally

```
./build.sh
```

Produces `android/QuadrantCalcPro-debug.apk` (not committed — it's a build
artifact and is listed in `.gitignore`).

Requires an Android SDK (build-tools 37.0.0, platform android-37) and a debug
keystore. Defaults: SDK at `/opt/android-sdk` and keystore at
`~/.android/debug.keystore` (alias `androiddebugkey`, password `android`).
Override via env:

```
ANDROID_SDK_ROOT=... ANDROID_BUILD_TOOLS=... ANDROID_JAR=... ANDROID_KS=... ./build.sh
```

The script re-syncs `index.html`, `calc.js`, `style.css`, `calculator.json`,
`assets/` and `th-kit/` from the parent directory into `assets/` on every build,
so the APK always ships the latest web app.

## Install on a device (debug)

```
adb install -r QuadrantCalcPro-debug.apk
```

or download the APK from the release and open it on the phone
(allow "install unknown apps").

## Releases (CI)

Tag a commit and push it, e.g.:

```
git tag 1.0.0
git push origin 1.0.0
```

`android-release.yml` builds a signed debug APK and publishes a GitHub Release
named `CalcPro-1.0.0` with the APK attached. No manual build needed.

## Notes

- State persists in the WebView profile's localStorage (`th.session` stub), so
  history/theme/sound settings survive app restarts.
- The debug signature is for sideloading; for Play, re-sign `build/aligned.apk`
  with a release keystore:
  `apksigner sign --ks <release.keystore> build/aligned.apk`
- Classic layout: opaque black system bars with the web content below them
  (no edge-to-edge inset handling), matching the previously verified look.
