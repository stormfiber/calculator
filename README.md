# Quadrant Calc Pro

A four-mode Material 3 calculator — **Basic**, **Standard**, **Professional** and
**Scientific** — built as a dependency-free static web app and wrapped for Android
as a single-activity WebView shell.

**Live web app:** https://stormfiber.github.io/calculator/

## Features

- 4 keypad modes with a live preview line and paper-tape history (search,
  date filter, reuse/copy/remove with undo)
- Professional tools: TAX+/TAX−, markup, GT, plus margin, discount and
  loan/EMI calculators
- Scientific: sin/cos/tan (+ inverses via 2nd), log/ln/exp, factorial,
  π/e, DEG/RAD toggle, and a built-in "Run checks" self-test suite
- Light / dark / OLED themes + 5 Material You palettes, persisted
- Optional keypad click sounds (WebAudio) via `th-kit/fx.js`
- Keyboard-driven (digits, operators, Enter, Backspace, Esc, Ctrl+C)

## Web app

No build step. Open `index.html` directly, or serve the folder:

```
python3 -m http.server   # or any static host
```

Static files: `index.html`, `calc.js`, `style.css`, `calculator.json`,
`assets/`, `th-kit/` (design-kit stubs: `ui.css`, `icons.js`, `fx.js`,
`motion.js`, font fallbacks).

The 26-bug audit that shaped this codebase is tracked in [`bugs.md`](bugs.md).

Manual Pages publish (outside of tags): [`./publish.sh`](publish.sh).

## Android app

WebView wrapper in [`android/`](android/) (min SDK 24, target SDK 37).

```
./android/build.sh
```

Builds `android/QuadrantCalcPro-debug.apk` (a local artifact — not committed).
Install with `adb install -r` or sideload. Details in
[`android/README.md`](android/README.md).

## Releases & GitHub Pages (automated)

Tag a commit and push it:

```
git tag 1.0.0
git push origin 1.0.0
```

On every tag push:

- **`.github/workflows/android-release.yml`** — builds the debug APK and
  publishes a GitHub Release named `CalcPro-1.0.0` with the APK attached.
- **`.github/workflows/pages-deploy.yml`** — (re)deploys the web app to the
  `gh-pages` branch; GitHub Pages rebuilds the live site automatically.

## Repository layout

```
index.html  calc.js  style.css  calculator.json   static web app
assets/  th-kit/                                    images + design-kit stubs
android/                                         WebView app + build pipeline
.github/workflows/                               tag-triggered release & pages
bugs.md      publish.sh                            audit log & manual pages sync
```
