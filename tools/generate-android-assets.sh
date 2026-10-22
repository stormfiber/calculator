#!/usr/bin/env bash
# Generates the Android launcher icon and splash screens for CalculatorPro.
#
#   ./tools/generate-android-assets.sh
#
# Requires: imagemagick (magick)
set -euo pipefail

RES_DIR="$(cd "$(dirname "$0")/.." && pwd)/android/app/src/main/res"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

source "$(dirname "$0")/brand.sh"

# =====================================================================
# Launcher icons
# =====================================================================
brand_draw_glyph "$TMP_DIR/glyph.png"
brand_draw_background "$TMP_DIR/bg.png" 1024 1024

declare -A DENSITIES=( [mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192 )
declare -A FG_DENSITIES=( [mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432 )

for density in "${!DENSITIES[@]}"; do
  size="${DENSITIES[$density]}"
  out_dir="$RES_DIR/mipmap-$density"
  mkdir -p "$out_dir"

  brand_draw_icon "$out_dir/ic_launcher.png" "$size"

  # round variant: same artwork on a circular mask
  magick -size "${size}x${size}" xc:none -fill white -draw "circle $((size/2)),$((size/2)) $((size/2)),0" "$TMP_DIR/mask.png"
  magick "$TMP_DIR/bg.png" "$TMP_DIR/glyph.png" -composite -resize "${size}x${size}" "$TMP_DIR/round_src.png"
  magick "$TMP_DIR/round_src.png" "$TMP_DIR/mask.png" -alpha off -compose CopyOpacity -composite "$out_dir/ic_launcher_round.png"

  # adaptive icon foreground (glyph only, transparent background).
  # The glyph is scaled down so that it stays inside the 66dp safe zone that
  # every launcher mask is guaranteed to show.
  fg_size="${FG_DENSITIES[$density]}"
  magick -size 1024x1024 xc:none "$TMP_DIR/glyph.png" -resize 780x780 \
    -gravity center -composite "$TMP_DIR/fg_src.png"
  magick "$TMP_DIR/fg_src.png" -resize "${fg_size}x${fg_size}" "$out_dir/ic_launcher_foreground.png"
done

# =====================================================================
# Splash screens
#
# The splash screen is a layer list (drawable/splash.xml) with a theme aware
# background colour (values/colors.xml + values-night/colors.xml) and the
# vector logo (drawable/splash_logo.xml), so there are no splash bitmaps to
# generate.
# =====================================================================

echo "Android launcher icons regenerated in $RES_DIR"
