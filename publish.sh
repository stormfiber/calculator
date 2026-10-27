#!/usr/bin/env bash
# Sync the web app from the main branch to GitHub Pages (gh-pages branch) and push.
# After running, GitHub rebuilds https://stormfiber.github.io/calculator/ automatically.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

git rev-parse --verify gh-pages >/dev/null 2>&1 || { echo "error: local gh-pages branch missing" >&2; exit 1; }

WT="$(mktemp -d)"
trap 'git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

git worktree add --detach "$WT" gh-pages
rm -rf "$WT"/*
cp -r index.html calc.js style.css calculator.json assets th-kit "$WT/"

if (cd "$WT" && git add -A && git diff --cached --quiet); then
  echo "gh-pages already up to date"
else
  (cd "$WT" && git add -A && git commit -m "Sync web app for GitHub Pages ($(date +%Y-%m-%d))" && git push origin gh-pages)
  echo "Pushed updated site to gh-pages — Pages will rebuild automatically"
fi
