#!/usr/bin/env python3
"""Compare two APKs entry-by-entry (sha256 of every zip entry).

Used by CI/F-Droid to verify that a fresh source build reproduces the
pre-signed release APK byte-for-byte (the signature block is not a zip
entry, so it is excluded by construction).

Usage: verify-repro.py <unsigned.apk> <release.apk>
"""
import hashlib
import sys
import zipfile


def entries(path):
    out = {}
    with zipfile.ZipFile(path) as z:
        for n in z.namelist():
            # Signature files (v1 JAR + v2/v3 block) differ between an unsigned
            # source build and a signed release APK; ignore them.
            if n.startswith("META-INF/") or n.endswith(".sig"):
                continue
            out[n] = hashlib.sha256(z.read(n)).hexdigest()
    return out


def main():
    a, b = entries(sys.argv[1]), entries(sys.argv[2])
    if a != b:
        only_a, only_b = set(a) - set(b), set(b) - set(a)
        diff = sorted(k for k in a if k in b and a[k] != b[k])
        print(f"MISMATCH: only-first={sorted(only_a)} only-second={sorted(only_b)} differing={diff}")
        sys.exit(1)
    print(f"Entry-identical: {len(a)} zip entries match between {sys.argv[1]} and {sys.argv[2]}.")


if __name__ == "__main__":
    main()
