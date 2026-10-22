# CalculatorPro

A professional scientific calculator that runs as a web app and as a native Android app.

* Web app: <https://stormfiber.github.io/calculator>
* Android app: `com.stormfiber.calculator` (GitHub Releases and F-Droid)
* License: [MIT](LICENSE)

## Features

* Basic and scientific modes (`sin`, `cos`, `tan`, `log`, `ln`, `√`, `x²`, `x^y`, `π`, `e`, `|x|`, `x!`, `%`)
* Calculation history, stored locally on the device
* Optional key press sounds and haptic feedback
* Long press `AC` clears the whole calculation
* Works completely offline - no ads, no tracking, no account
* Keyboard support on desktop and tablets
* The Android app is drawn edge to edge and keeps its layout in every mode

## Repository layout

| Path | Description |
| --- | --- |
| `src/` | React application (shared by the web app and the Android app) |
| `public/` | Static assets, including the bundled Font Awesome files (`public/fa/`) |
| `android/` | Capacitor Android project (Gradle) |
| `fastlane/metadata/android/en-US/` | F-Droid / store metadata and graphics |
| `fdroid/com.stormfiber.calculator.yml` | F-Droid build recipe (submitted to fdroiddata) |
| `tools/` | Scripts that generate the launcher icons, splash screens and store graphics |

The Android app is a Capacitor project: the very same React build that is published
on GitHub Pages is bundled into the APK and served from a local `https://localhost`
origin inside the app.

## Web app

```bash
npm install
npm start          # development server
npm run build      # production build into ./build
npm run deploy     # publish ./build to the gh-pages branch
```

## Android app

### Prerequisites

* Node.js 22 or newer
* JDK 21 (`sudo apt install openjdk-21-jdk`)
* Android SDK with platform 36 and build-tools 36.0.0
  (`sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"`)
* `ANDROID_HOME` pointing at the SDK, or `android/local.properties` containing `sdk.dir=/path/to/sdk`

### Build

```bash
npm install
npm run build:android     # production build with relative asset paths
npx cap sync android      # copy the web build into the Android project
npm run apk:debug         # android/app/build/outputs/apk/debug/app-debug.apk
npm run apk:release       # android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Install on a connected device with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

### How the release APK is signed

The release build is **unsigned by default**, which is what F-Droid expects
(F-Droid signs the APK with its own key). A signing key is only used when the
following environment variables are present:

| Variable | Meaning |
| --- | --- |
| `KEYSTORE_FILE` | Path to the keystore (absolute, or relative to `android/`) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

### Committed web assets

`android/app/src/main/assets/public` contains the production web build and **is
committed to the repository**. F-Droid builds applications from source and cannot
run `npm run build`, so the assets have to be part of the repository.

Both CI workflows verify that the committed assets are up to date and fail if they
drift. After changing anything in `src/` run:

```bash
npm run build:android && npx cap sync android
```

and commit the result.

### Regenerating the icons and splash screens

```bash
./tools/generate-android-assets.sh   # launcher icons + splash screens
./tools/generate-store-assets.sh      # F-Droid icon + feature graphic
```

Both scripts only require ImageMagick.

## Releases

Releases are built by GitHub Actions. Push a tag and the workflow builds the web
app, verifies the committed assets, builds a signed release APK and attaches it to
the GitHub release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow needs these repository secrets:

| Secret | Description |
| --- | --- |
| `KEYSTORE_BASE64` | base64 encoded keystore (`base64 -w0 release.keystore`) |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias |
| `KEY_PASSWORD` | Key password |

The `versionName` in `android/app/build.gradle` has to match the tag, otherwise the
workflow fails.

## F-Droid

The app is published on F-Droid as `com.stormfiber.calculator`.

* Metadata (title, description, changelog, screenshots) lives in
  `fastlane/metadata/android/en-US/`
* The build recipe lives in `fdroid/com.stormfiber.calculator.yml` and is submitted
  to the [fdroiddata](https://gitlab.com/fdroid/fdroiddata) repository
* The build uses `subdir: android`, Gradle 8.14.3 and JDK 21, and relies on
  `com.capacitorjs:core` from Maven Central - no `node_modules` are required
* F-Droid builds the *unsigned* release APK and signs it itself

To build the same way F-Droid does, from a checkout without `node_modules`:

```bash
cd android && ./gradlew assembleRelease
```
