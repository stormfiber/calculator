# Quadrant Calc Pro — Bug List

Status legend: `[open]` not fixed yet · `[fixed]` resolved · `[wont-fix]` acknowledged, left as-is
Every item is flipped from `[open]` to `[fixed]` as the fix lands.

## CSS (style.css)

- [fixed] **#1 — Invalid CSS: dark palette block for blue.** `style.css:172-182` mixes a selector and an `@media` rule in one selector list (`[data-theme="dark"][data-palette="blue"], @media (...) { ... }`). Parse error → whole rule discarded → blue dark-mode colors never apply. **Fix:** split into a valid `[data-theme="dark"][data-palette="blue"]` rule plus a standalone `@media` rule with `:root:not(...)`.
- [fixed] **#2 — Invalid CSS: dark palette block for teal.** Same defect at `style.css:193-203`.
- [fixed] **#3 — Invalid CSS: dark palette block for amber.** Same defect at `style.css:214-224`.
- [fixed] **#4 — Invalid CSS: dark palette block for rose.** Same defect at `style.css:235-245`.
- [fixed] **#5 — Professional keypad layout class missing.** `calc.js:825` sets class `professional-layout`, but `style.css:637` only defines `.pro-layout` (plus `basic/standard/scientific`). Professional mode falls back to an untiled 1-column grid. **Fix:** add `.professional-layout` to the 5-column grid selector.
- [fixed] **#6 — `--ease-out` undefined.** Used at `style.css:427, 521, 549, 793, 851, 1160, 1186` but never defined (was expected from the missing th-kit). Undefined `var()` kills every transition/animation using it. **Fix:** define `--ease-out` on `:root`.

## Missing th-kit assets

- [fixed] **#7 — `th-kit/ui.css` missing.** Referenced at `index.html:7`; provides base styles for `th-*` classes used throughout the markup. **Fix:** create a stub with the needed `th-*` component styles.
- [fixed] **#8 — `th-kit/fonts/inter.css` missing.** Referenced at `index.html:8`. **Fix:** create stub (system font fallback).
- [fixed] **#9 — `th-kit/fonts/space-grotesk.css` missing.** Referenced at `index.html:9`. **Fix:** create stub.
- [fixed] **#10 — `th-kit/fonts/jetbrains-mono.css` missing.** Referenced at `index.html:10`. **Fix:** create stub.
- [fixed] **#11 — `th-kit/icons.js` missing.** Referenced at `index.html:12`; app expects a `window.icon(name)` helper (used at `calc.js:1506`). **Fix:** create a stub that injects inline SVGs for all requested icon names and exposes `window.icon`.
- [fixed] **#26 — `th-kit/fx.js` & `th-kit/motion.js` don't exist as files** (their script tags were commented out, so they never 404'd, but re-enabling them would). `calc.js` depends on `window.fx.sound/tap|pop|whoosh` and `window.fx.toast` for keypad click sounds and the "Tax rate updated" toast. **Fix:** create a working `fx.js` (WebAudio click sounds + toast) and `motion.js` (`window.th` stub: `ready`, `session`/`storage` via localStorage, `back` stack), and load them in `index.html`.

## HTML / manifest

- [fixed] **#12 — `search` icon not requested.** `<i data-icon="search">` is used at `index.html:101, 137` but `search` is absent from the `th-kit/icons.js?…` icon query at `index.html:12`. **Fix:** add `search` to the query.
- [fixed] **#13 — Truncated manifest tagline.** `calculator.json:4` reads `"...adapts to your device's theme and every s"` (cut mid-sentence). **Fix:** complete the sentence.
- [fixed] **#24 — fx.js/motion.js script tags commented out** (`index.html:247-248`), so click sounds and toasts are silently dead. **Fix:** create the files (#26) and uncomment the tags.
- [fixed] **#25 — Zoom locked.** `index.html:5` viewport sets `maximum-scale=1.0, user-scalable=no`, blocking pinch zoom (accessibility). **Fix:** allow user scaling.

## JavaScript (calc.js)

- [fixed] **#14 — `updateSoundUI` orphans its element.** `calc.js:1503-1509` does `soundIcon.outerHTML = window.icon(...)`; the cached `const soundIcon` then points at a detached node, so every later toggle silently fails to update the icon. **Fix:** replace contents via `innerHTML` on the same element instead of swapping it out.
- [fixed] **#15 — History id collisions.** `pushHistory` uses `id: Date.now()` (`calc.js:858`); two entries created in the same millisecond share an id, so "Remove" (`findIndex` by id at `calc.js:972`) can delete the wrong item and undo splices at the wrong index. **Fix:** use a monotonically increasing session counter for ids.
- [fixed] **#16 — Backspace can't delete a trailing operator.** `handleBackspace` (`calc.js:416-429`): with expression `"4+"` and display `0`, ⌫ just resets the display; the dangling operator stays. **Fix:** when display is a single `0` and the expression ends with an operator or `(`, pop that character instead.
- [fixed] **#17 — `)` after an evaluated result shows Error.** `handleParen` (`calc.js:457`) appends `result + ')'` even when there is no open parenthesis (e.g. after `2+2=`, pressing `)` gives `"4)"` → auto-closer rejects it → `Error`). **Fix:** ignore `)` when the expression has no open `(`.
- [fixed] **#18 — Empty `=` pollutes history.** `handleEquals` (`calc.js:569-577`): pressing `=` on a pristine display evaluates the bare `"0"` and pushes a `0 = 0` entry. **Fix:** bail out when there is nothing to evaluate.
- [fixed] **#19 — `%` writes no history entry.** `handlePercent` (`calc.js:440-446`) computes `val/100` but, unlike x², √, 1/x and TAX, never calls `pushHistory`. **Fix:** record the percent calculation.
- [fixed] **#20 — `cleanNumber` destroys precision.** `calc.js:689-695` rounds via `Math.round(num*1e12)/1e12`: results below ~5e-13 collapse to `0`, and large results lose digits. **Fix:** round to 12 significant digits with `Number(num.toPrecision(12))`.
- [fixed] **#21 — `grandTotal` never resets.** Accumulated at `calc.js:586` but nothing ever clears it; GT shows a stale sum across arbitrarily many sessions. **Fix:** reset it in `handleClear`.
- [fixed] **#22 — Keyboard handler ignores SELECT/TEXTAREA focus.** `calc.js:1318` only early-returns for `INPUT`, so with the history date-filter `<select>` focused, digit/operator keys still fire calculator actions. **Fix:** guard `SELECT` and `TEXTAREA` too.
- [fixed] **#23 — Pro modal title leaks state.** `runScientificChecks` overwrites `#pro-tool-title` with "Scientific calculation checks" (`calc.js:1102`); after closing, the modal head still shows it on the next tool open. **Fix:** restore the default title when the modal closes.

## Verification

After all fixes: `node --check calc.js`, JSON-parse `calculator.json`, and a jsdom smoke test (2+2=, 2^3=, TAX+, backspace-on-operator, `)` guard, `%` history, history remove/undo).
