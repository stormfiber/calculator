#!/usr/bin/env bash
# Rebuilds Quadrant Calc Pro debug APK (com.quadrantcalc).
# Syncs the web app from the parent directory into src/main/assets,
# then compiles, dexes, aligns and signs with the shared debug keystore.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

# Toolchain paths (overridable, e.g. in CI where ANDROID_HOME is set):
#   ANDROID_SDK_ROOT - SDK directory      (default /opt/android-sdk)
#   ANDROID_BUILD_TOOLS - build-tools dir (default <sdk>/build-tools/37.0.0)
#   ANDROID_JAR - android.jar             (default <sdk>/platforms/android-37.0/android.jar)
#   ANDROID_KS - signing keystore         (default ~/.android/debug.keystore)
SDK="${ANDROID_SDK_ROOT:-/opt/android-sdk}"
BT="${ANDROID_BUILD_TOOLS:-$SDK/build-tools/37.0.0}"
AJAR="${ANDROID_JAR:-$SDK/platforms/android-37.0/android.jar}"
KS="${ANDROID_KS:-$HOME/.android/debug.keystore}"

# Fall back to what's actually installed (e.g. CI naming: platforms/android-37,
# or the newest build-tools present).
[ -d "$BT" ] || BT="$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1 || true)"
[ -f "$AJAR" ] || AJAR="$(ls "$SDK"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -1 || true)"

if [ -z "${BT:-}" ] || [ ! -d "$BT" ] || [ -z "${AJAR:-}" ] || [ ! -f "$AJAR" ]; then
  echo "error: Android SDK not found (BT=$BT AJAR=$AJAR)" >&2
  exit 1
fi

# 1. Sync web app into assets/
rm -rf "$HERE/src/main/assets"
mkdir -p "$HERE/src/main/assets"
cp "$ROOT/index.html" "$ROOT/calc.js" "$ROOT/style.css" "$ROOT/calculator.json" "$HERE/src/main/assets/"
cp -r "$ROOT/assets" "$ROOT/th-kit" "$HERE/src/main/assets/"

# 2. Resources
rm -rf "$HERE/build"
mkdir -p "$HERE/build/classes" "$HERE/build/dex"
"$BT/aapt2" compile --dir "$HERE/src/main/res" -o "$HERE/build/res.zip"
"$BT/aapt2" link -o "$HERE/build/skel.apk" -I "$AJAR" \
  --manifest "$HERE/src/main/AndroidManifest.xml" --java "$HERE/build/gen" \
  "$HERE/build/res.zip"

# 3. Java + dex
# -bootclasspath pins compilation to the Android platform stubs only.
# (No lambdas in the source — D8 desugars for minSdk 24.)
javac -encoding UTF-8 -source 1.8 -target 1.8 -bootclasspath "$AJAR" \
  -d "$HERE/build/classes" \
  "$HERE/build/gen/com/quadrantcalc/R.java" \
  "$HERE/src/main/java/com/quadrantcalc/MainActivity.java"
"$BT/d8" --release --lib "$AJAR" --min-api 24 --output "$HERE/build/dex" \
  $(find "$HERE/build/classes" -name '*.class')

# 4. Assemble, align, sign
cp "$HERE/build/skel.apk" "$HERE/build/unsigned.apk"
(cd "$HERE/build/dex" && zip -0 -X -q "$HERE/build/unsigned.apk" classes.dex)
(cd "$HERE/src/main" && zip -0 -X -q -r "$HERE/build/unsigned.apk" assets)
"$BT/zipalign" -f 4 "$HERE/build/unsigned.apk" "$HERE/build/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias androiddebugkey \
  --ks-pass pass:android --key-pass pass:android \
  --out "$HERE/QuadrantCalcPro-debug.apk" "$HERE/build/aligned.apk"
"$BT/apksigner" verify "$HERE/QuadrantCalcPro-debug.apk"
echo "Built: $HERE/QuadrantCalcPro-debug.apk"
