#!/usr/bin/env bash
# Rebuilds Quadrant Calc Pro debug APK (com.quadrantcalc).
# Syncs the web app from the parent directory into src/main/assets,
# then compiles, dexes, aligns and signs with the shared debug keystore.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

BT=/opt/android-sdk/build-tools/37.0.0
AJAR=/opt/android-sdk/platforms/android-37.0/android.jar
KS="$HOME/.android/debug.keystore"

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
javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$AJAR" \
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
