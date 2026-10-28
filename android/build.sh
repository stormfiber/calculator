#!/usr/bin/env bash
# Rebuilds Quadrant Calc Pro debug APK (com.quadrantcalc).
# Syncs the web app from the parent directory into src/main/assets,
# then compiles, dexes, aligns and signs with the shared debug keystore.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

# Toolchain paths (overridable, e.g. in CI / F-Droid where ANDROID_HOME is set):
#   ANDROID_SDK_ROOT - SDK directory      (default /opt/android-sdk)
#   ANDROID_BUILD_TOOLS - build-tools dir (default <sdk>/build-tools/37.0.0)
#   ANDROID_JAR - android.jar             (default <sdk>/platforms/android-37.0/android.jar)
#   ANDROID_KS - signing keystore         (default ~/.android/debug.keystore)
#   ANDROID_KS_ALIAS - key alias          (default androiddebugkey)
#   ANDROID_KS_PASS - keystore/key pass   (default android)
#   ANDROID_OUT - output APK path         (default <here>/QuadrantCalcPro-debug.apk)
# Set ANDROID_KS="" to build UNSIGNED (F-Droid source-build checks sign the APK
# themselves); an empty-but-set value is honored, unlike the default.
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/opt/android-sdk}}"
BT="${ANDROID_BUILD_TOOLS:-$SDK/build-tools/37.0.0}"
AJAR="${ANDROID_JAR:-$SDK/platforms/android-37.0/android.jar}"
KS="${ANDROID_KS-$HOME/.android/debug.keystore}"
KS_ALIAS="${ANDROID_KS_ALIAS:-androiddebugkey}"
KS_PASS="${ANDROID_KS_PASS:-android}"

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

# 4. Assemble (deterministic: fixed 1980 entry dates + sorted stored entries,
# so source builds are byte-reproducible except the signature block)
python3 - "$HERE/build/skel.apk" "$HERE/build/dex/classes.dex" "$HERE/src/main" "$HERE/build/unsigned.apk" <<'PY'
import os, sys, zipfile

skel, dex, root, out = sys.argv[1:5]
DTIM = (1980, 1, 1, 0, 0, 0)

def store(z, name, data):
    zi = zipfile.ZipInfo(name, date_time=DTIM)
    zi.compress_type = zipfile.ZIP_STORED
    zi.external_attr = 0o644 << 16
    z.writestr(zi, data)

entries = []
with zipfile.ZipFile(skel) as z:
    for n in z.namelist():
        entries.append((n, z.read(n)))
entries.append(('classes.dex', open(dex, 'rb').read()))
for path, _, files in os.walk(os.path.join(root, 'assets')):
    for f in sorted(files):
        p = os.path.join(path, f)
        entries.append(('assets/' + os.path.relpath(p, os.path.join(root, 'assets')), open(p, 'rb').read()))
entries.sort(key=lambda e: e[0])
with zipfile.ZipFile(out, 'w') as z:
    for name, data in entries:
        store(z, name, data)
PY

"$BT/zipalign" -f 4 "$HERE/build/unsigned.apk" "$HERE/build/aligned.apk"

# 5. Sign (or leave unsigned for F-Droid CI, which signs built APKs itself)
OUT="${ANDROID_OUT:-$HERE/QuadrantCalcPro-debug.apk}"
if [ -n "$KS" ] && [ -f "$KS" ]; then
  # v1 (JAR) signing is unnecessary for minSdk 24 (v2 covers it) and would
  # add META-INF entries that break byte-for-byte source-build comparison.
  "$BT/apksigner" sign --v1-signing-enabled false \
    --ks "$KS" --ks-key-alias "$KS_ALIAS" \
    --ks-pass pass:"$KS_PASS" --key-pass pass:"$KS_PASS" \
    --out "$OUT" "$HERE/build/aligned.apk"
  "$BT/apksigner" verify "$OUT"
  echo "Built (signed with $KS_ALIAS): $OUT"
else
  cp "$HERE/build/aligned.apk" "$OUT"
  echo "Built UNSIGNED (ANDROID_KS empty/absent — expected for F-Droid builds): $OUT"
fi
