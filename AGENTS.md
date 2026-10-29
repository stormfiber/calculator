# AGENTS.md

Persistent knowledge for this repo — read before touching release/build/F-Droid flows.

## What this is
Vanilla-JS calculator web app (`index.html`, `calc.js`, `style.css`, `calculator.json`,
`assets/`, `th-kit/`) + a minimal Android WebView shell (`android/`, package
`com.quadrantcalc`). No network access, no tracking, MIT.

## Release model (one signed APK, two channels)
- A single release-key-signed APK is published on **both** channels:
  - GitHub: release asset `QuadrantCalcPro-release.apk` on tag-based releases
    (committed to `releases/`, attached by the `android-release` workflow)
  - F-Droid main: metadata `Binaries:` downloads that exact asset
    (URL uses `%v` == tag == versionName)
- F-Droid does **not** produce its own differently-signed APK — it hosts ours.
  No version/signature drift by construction.
- Updates flow via new tags (`1.0.1`, …): GitHub release + fdroiddata metadata bump
  (new `Builds` entry + `CurrentVersion`/`CurrentVersionCode`). F-Droid's
  `checkupdates` follows git tags.
- `AllowedAPKSigningKeys` = SHA-256 of the release certificate
  (`9320b2f4f465d195b48a2770d7156509b9f79f5abf40397dd44f72e357de2275`).
  Never rotate the release key without updating that value.

## APK layout: zipflinger-compatible (do not regress)
`android/build.sh`'s assembly step writes the APK in a zipflinger-style layout:
stored entries, 1980-01-01 dates, names sorted, data offsets 4-byte aligned via
a `0xd935` extra field (size `n >= 2`, `n ≡ needed (mod 4)`), central directory
with the local-header offset field before the file name.

**Why:** F-Droid's `fdroid build` CI job verifies reproducibility by copying the
signature block from the signed reference APK onto the unsigned source build
(apksigcopier), then running `apksigner verify`. The v3 CHUNKED_SHA512 digest
covers the local-entry byte region; apksigner preserves that region byte-for-byte
**only** when the input already has this layout. Any other layout (plain Python
`zipfile` output, `zipalign` output, …) fails with
`APK Signature Scheme v3 … CHUNKED_SHA512 digest mismatch`.

If you change the assembly step, verify locally before pushing:

```bash
ANDROID_KS= ANDROID_OUT=/tmp/unsigned.apk ./android/build.sh
# sign /tmp/unsigned.apk with the release key (apksigner, --v1-signing-enabled false)
# then simulate F-Droid's check:
python3 - <<'EOF'
import importlib.util, subprocess
spec = importlib.util.spec_from_file_location("akc", "apksigcopier.py")  # fetch from fdroidserver
akc = importlib.util.module_from_spec(spec); spec.loader.exec_module(akc)
akc.do_copy("/tmp/newref.apk", "/tmp/unsigned.apk", "/tmp/sigcp.apk", v1_only=None, exclude=akc.exclude_meta)
r = subprocess.run(["<sdk>/build-tools/37.0.0/apksigner", "verify", "/tmp/sigcp.apk"])
assert r.returncode == 0, "F-Droid sig-copy check would fail"
EOF
```

`android/verify-repro.py <unsigned> <release>` compares entry hashes only — it
does **not** catch layout regressions; use the simulation above for that.

## Toolchain (byte-stability matters)
- Build with **build-tools 37.0.0 + platform android-37.0**
  (`ANDROID_BUILD_TOOLS` / `ANDROID_JAR`). F-Droid's build VM installs these via
  `sdkmanager` inside the metadata `build:` commands; the commands pin them
  explicitly.
- javac: JDK 17 and 21 produce identical dex for this source (verified).
  F-Droid CI uses JDK 21; GitHub CI uses JDK 17 — both fine.
- aapt2/d8 come from build-tools 37.0.0; changing the build-tools version
  changes APK bytes → must reissue the release APK and keep F-Droid metadata in
  sync.

## Release key (backup off-machine!)
- `android/release.keystore` (RSA-4096, alias `quadrantcalc`, CN=Quadrant Calc Pro),
  gitignored; password in `android/.release-key-pass` (gitignored);
  docs in `android/RELEASE_KEY.txt`.
- Sign with `apksigner sign --v1-signing-enabled false` (v2+v3 only — v1 JAR
  signing adds META-INF entries that break entry-identical comparison).

## F-Droid submission (GitLab, not GitHub)
- Authoritative `fdroiddata` repo: **gitlab.com/fdroid/fdroiddata** (GitHub
  copy is a read-only mirror; PRs there → 403).
- In-repo copy of the metadata: `fdroiddata/metadata/com.quadrantcalc.yml` —
  keep it in sync with the fork branch. Its content must stay at F-Droid's
  canonical (rewritemeta fixed point). If the `fdroid rewritemeta` CI job
  fails, download that job's `tmp/com.quadrantcalc.yml` artifact and apply it
  verbatim.
- Fork: `qasimali9263/fdroiddata`, branch `com.quadrantcalc`.
  MR `!54799` (all 9 CI jobs green as of 2026-10-29); RFP tracking issue
  `!4691` on `fdroid/rfp`.
- YAML traps in F-Droid metadata:
  - a plain-scalar `build:` command containing `: ` (colon+space) is parsed as a
    mapping and mangles the command — keep `: ` and ` #` out of build lines
  - build commands run via `bash -e -u -o pipefail -c` joined with `; ` —
    guard errexit hazards (`|| true`, `if` conditions, `done || true` in
    `$(...)` substitutions)
  - `output:` flag makes the build method "raw" (skips `android update`/`ant`
    steps) and tells F-Droid where to find the built APK
- The `fdroid build` job checks out the metadata `commit:` (our tag). After
  changing `android/build.sh`, move the tag to the new commit
  (we moved `1.0.0` → `0daa329` in 2026-10-29).

## Release procedure (future versions, e.g. 1.0.1)
1. Bump `versionCode`/`versionName` in `android/src/main/AndroidManifest.xml`.
2. Build + sign locally:
   `ANDROID_KS=android/release.keystore ANDROID_KS_ALIAS=quadrantcalc ANDROID_KS_PASS="$(cat android/.release-key-pass)" ANDROID_OUT=releases/QuadrantCalcPro-release.apk ./android/build.sh`
3. Update `fdroiddata/metadata/com.quadrantcalc.yml`: new `Builds` entry
   (versionName/versionCode/commit/tag) + `CurrentVersion`/`CurrentVersionCode`,
   keeping canonical formatting.
4. Commit APK + metadata to `main`; `git tag <ver>` and push tag → the
   `android-release` workflow verifies, reproducibility-checks, and attaches
   the asset to the GitHub release.
5. Push the metadata update to the `qasimali9263/fdroiddata` branch → F-Droid
   CI.

## CI (GitHub)
- `.github/workflows/android-release.yml` (on tag): verify committed release APK
  (cert + CN), entry-hash reproducibility of a fresh unsigned source build,
  attach asset to the release. No secrets are delivered to runners — the APK is
  pre-signed locally and committed.
- `.github/workflows/pages-deploy.yml`: static site → Pages.

## Security notes
- The GitLab personal access token used for the F-Droid API work was exposed in
  session logs — rotate it. Never commit tokens, keystores, or passwords.
