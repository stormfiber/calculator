# Quadrant Calc Pro — Android wrapper

Debug APK build of the web app as a single-activity WebView shell
(`com.quadrantcalc`). No Gradle, no Android Studio needed.

## Files

- `src/main/AndroidManifest.xml` — package, min SDK 24 / target 34, launcher entry
- `src/main/java/com/quadrantcalc/MainActivity.java` — WebView host (JS + DOM storage enabled, back-nav, lifecycle-safe)
- `src/main/res/mipmap-xxxhdpi/ic_launcher.png` — launcher icon (from `../assets/logo.png`)
- `src/main/assets/` — the web app, synced from `../` at build time (do not edit by hand)
- `build.sh` — full build pipeline (aapt2 → javac → d8 → zipalign → apksigner)
- `QuadrantCalcPro-debug.apk` — the artifact

## Build

```
./build.sh
```

Requires `/opt/android-sdk` (build-tools 37.0.0, platform android-37) and a debug
keystore at `~/.android/debug.keystore` (alias `androiddebugkey`, password `android`).

The script re-syncs `index.html`, `calc.js`, `style.css`, `calculator.json`,
`assets/` and `th-kit/` from the parent directory into `assets/` on every build,
so the APK always ships the latest web app.

## Install on a device (debug)

```
adb install -r QuadrantCalcPro-debug.apk
```

or copy the APK to the phone and open it (allow "install unknown apps").

## Notes

- State persists in the WebView profile's localStorage (`th.session` stub), so
  history/theme/sound settings survive app restarts.
- The debug signature is valid for sideloading only; for a Play release,
  re-sign `build/aligned.apk` with a release keystore:
  `apksigner sign --ks <release.keystore> build/aligned.apk`
- To test locally without a phone: `adb devices` (no device attached on this
  host as of build time).
