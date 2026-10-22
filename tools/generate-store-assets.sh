#!/usr/bin/env bash
# Generates the store / F-Droid graphics for CalculatorPro:
#
#   fastlane/metadata/android/en-US/images/icon.png           (512x512)
#   fastlane/metadata/android/en-US/images/featureGraphic.png (1024x500)
#
#   ./tools/generate-store-assets.sh
#
# Requires: imagemagick (magick)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
IMG_DIR="$ROOT_DIR/fastlane/metadata/android/en-US/images"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

source "$(dirname "$0")/brand.sh"

mkdir -p "$IMG_DIR"

brand_draw_glyph "$TMP_DIR/glyph.png"
brand_draw_background "$TMP_DIR/bg.png" 1024 1024

# ---------------------------------------------------------------------
# App icon (512x512)
# ---------------------------------------------------------------------
brand_draw_icon "$IMG_DIR/icon.png" 512

# ---------------------------------------------------------------------
# Feature graphic (1024x500)
# ---------------------------------------------------------------------
brand_draw_background "$TMP_DIR/fg_bg.png" 1024 500

magick "$TMP_DIR/glyph.png" -resize 300x300 "$TMP_DIR/fg_glyph.png"
magick "$TMP_DIR/fg_bg.png" "$TMP_DIR/fg_glyph.png" -geometry +60+100 -composite "$TMP_DIR/fg_left.png"

magick -size 700x260 xc:none \
  -font Lato-Black -pointsize 92 -fill white \
  -gravity northwest -annotate +0+40 'CalculatorPro' \
  -font Lato-Regular -pointsize 38 -fill '#E6E0E9' \
  -annotate +0+150 'Professional scientific calculator' \
  -annotate +0+205 'Works offline - no ads, no tracking' \
  "$TMP_DIR/fg_text.png"

magick "$TMP_DIR/fg_left.png" "$TMP_DIR/fg_text.png" -geometry +360+0 -composite "$IMG_DIR/featureGraphic.png"

echo "Store graphics regenerated in $IMG_DIR"
