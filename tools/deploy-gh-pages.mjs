#!/usr/bin/env node
/**
 * Publishes the production build to the gh-pages branch.
 *
 * This is a small, dependency free replacement for the `gh-pages` npm
 * package: it copies ./build into a temporary directory and force pushes it
 * to the gh-pages branch of the current repository.
 *
 *   npm run deploy
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BUILD_DIR = resolve(process.cwd(), 'build');
const BRANCH = process.env.GH_PAGES_BRANCH || 'gh-pages';
const REMOTE = process.env.GH_PAGES_REMOTE || 'origin';

if (!existsSync(BUILD_DIR)) {
  console.error('No build directory found, run "npm run build" first.');
  process.exit(1);
}

const git = (args, options = {}) =>
  execFileSync('git', args, { stdio: 'inherit', ...options });

const remoteUrl = execFileSync('git', ['remote', 'get-url', REMOTE], {
  cwd: process.cwd(),
  encoding: 'utf8'
}).trim();

const workDir = mkdtempSync(join(tmpdir(), 'gh-pages-'));

try {
  cpSync(BUILD_DIR, workDir, { recursive: true });
  // GitHub Pages does not run Jekyll, so files starting with an underscore
  // have to be published unchanged.
  writeFileSync(join(workDir, '.nojekyll'), '');

  git(['init', '--quiet'], { cwd: workDir });
  git(['remote', 'add', REMOTE, remoteUrl], { cwd: workDir });
  git(['checkout', '--orphan', BRANCH], { cwd: workDir });
  git(['add', '--all'], { cwd: workDir });
  git(
    [
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=github-actions[bot]@users.noreply.github.com',
      'commit',
      '--quiet',
      '-m',
      `Deploy ${new Date().toISOString()}`
    ],
    { cwd: workDir }
  );
  git(['push', '--force', REMOTE, BRANCH], { cwd: workDir });

  console.log(`Published ./build to ${REMOTE}/${BRANCH}`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
