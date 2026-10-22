#!/usr/bin/env bash
# Shared brand assets (gradient background + calculator glyph).
#
# The glyph and the gradient are defined as SVG in assets/ and rasterised with
# rsvg-convert, because that is the only way to get a reliable alpha channel
# (ImageMagick drops transparency when it composites shapes).
#
# Requires: imagemagick (magick), librsvg (rsvg-convert)

BRAND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRAND_ICON_SVG="$BRAND_DIR/assets/calculator-icon.svg"
BRAND_BG_SVG="$BRAND_DIR/assets/icon-background.svg"

# --- calculator glyph (white on transparent), drawn on a 1024x1024 canvas ---
brand_draw_glyph() {
  local out="$1"
  rsvg-convert -w 1024 -h 1024 "$BRAND_ICON_SVG" -o "$out"
}

# --- gradient background at the given size ---
brand_draw_background() {
  local out="$1" width="$2" height="$3"
  rsvg-convert -w "$width" -h "$height" "$BRAND_BG_SVG" -o "$out"
}

# --- full launcher icon (gradient background + glyph) at the given size ---
brand_draw_icon() {
  local out="$1" size="$2"
  brand_draw_background "$TMP_DIR/bg.png" 1024 1024
  magick "$TMP_DIR/bg.png" "$TMP_DIR/glyph.png" -composite -resize "${size}x${size}" "$out"
}
