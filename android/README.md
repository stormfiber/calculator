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
- `release.keystore` + `RELEASE_KEY.txt` — release signing key & credentials
  (both gitignored)

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

## Releases (CI) + F-Droid

Tag a commit and push it, e.g.:

```
git tag 1.0.0
git push origin 1.0.0
```

`android-release.yml` builds the APK signed with the **release keystore**
(supplied via the GitHub Actions secrets `RELEASE_KEYSTORE_B64` +
`RELEASE_KEYSTORE_PASS`, alias `quadrantcalc`) and publishes a GitHub Release
named `CalcPro-1.0.0` with the APK attached. No manual build needed.

The **F-Droid main repository** is fed from the same GitHub release:
`../fdroiddata/metadata/com.quadrantcalc.yml` (a F-Droid `fdroiddata`
submission) points its `Binaries:` URL at this release's APK and pins the
release certificate via `AllowedAPKSigningKeys`, so F-Droid hosts the
identical, release-key-signed APK. GitHub and F-Droid therefore never
conflict on updates.

## Signing keys

- **Debug** (default `./build.sh`): `~/.android/debug.keystore`, alias
  `androiddebugkey`, password `android`. Sideloading only.
- **Release**: `release.keystore` in this directory (RSA-4096, alias
  `quadrantcalc`, 100-year). Gitignored; credentials in gitignored
  `RELEASE_KEY.txt` — back it up off-machine.

## Notes

- State persists in the WebView profile's localStorage (`th.session` stub), so
  history/theme/sound settings survive app restarts.
- `ANDROID_KS=""` builds an **unsigned** APK (what F-Droid's source-build
  check does; F-Droid signs it with its own key). The unsigned build is
  byte-reproducible (deterministic assembly), so F-Droid's reproducible-build
  check matches the release APK except for the signature block.
- Classic layout: opaque black system bars with the web content below them
  (no edge-to-edge inset handling), matching the previously verified look.
