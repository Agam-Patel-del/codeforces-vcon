#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const invokedAs = path.basename(process.argv[1] || '');

const isFirefox =
  invokedAs.includes('vcon-f') ||
  invokedAs.includes('vcon-firefox') ||
  args.some(a => ['-f', '--firefox', 'firefox', ':f', 'vcon:f', 'vcon-f'].includes(a));

const isAll = args.some(a => ['-a', '--all', 'all'].includes(a));
const skipPull = args.includes('--no-pull');
const skipInstall = args.includes('--no-install') || args.includes('--no-i');

const target = isAll ? 'all' : (isFirefox ? 'firefox' : 'chrome');

console.log('\n\x1b[1m\x1b[34m========================================\x1b[0m');
console.log(`\x1b[1m\x1b[36m  Codeforces Virtual Contests (vcon)  \x1b[0m`);
console.log(`  Target: \x1b[33m${target.toUpperCase()}\x1b[0m`);
console.log('\x1b[1m\x1b[34m========================================\x1b[0m\n');

// Step 1: Git Pull
if (!skipPull) {
  console.log('\x1b[36m[vcon 1/3]\x1b[0m Pulling latest changes from repository...');
  try {
    execSync('git pull', { cwd: rootDir, stdio: 'inherit' });
    console.log('\x1b[32m✔ Git pull complete.\x1b[0m\n');
  } catch (err) {
    console.warn('\x1b[33m⚠ Warning: git pull failed (offline or local conflicts). Continuing...\x1b[0m\n');
  }
} else {
  console.log('\x1b[90m[vcon] Skipping git pull (--no-pull)\x1b[0m\n');
}

// Step 2: NPM Install
if (!skipInstall) {
  console.log('\x1b[36m[vcon 2/3]\x1b[0m Installing dependencies (npm install)...');
  try {
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
    console.log('\x1b[32m✔ Dependencies verified.\x1b[0m\n');
  } catch (err) {
    console.error('\x1b[31m✖ Error: npm install failed.\x1b[0m');
    process.exit(1);
  }
} else {
  console.log('\x1b[90m[vcon] Skipping npm install (--no-install)\x1b[0m\n');
}

// Step 3: Build
function buildTarget(browser) {
  console.log(`\x1b[36m[vcon 3/3]\x1b[0m Building ${browser === 'firefox' ? 'Firefox' : 'Chrome'} extension bundle...`);
  try {
    execSync(`npx vite build --mode ${browser}`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        TARGET_BROWSER: browser
      }
    });
    console.log(`\x1b[32m✔ Successfully built ${browser === 'firefox' ? 'Firefox' : 'Chrome'} extension to dist/${browser}!\x1b[0m\n`);
  } catch (err) {
    console.error(`\x1b[31m✖ Error: Build failed for ${browser}.\x1b[0m`);
    process.exit(1);
  }
}

if (target === 'all') {
  buildTarget('chrome');
  buildTarget('firefox');
} else {
  buildTarget(target);
}

console.log('\x1b[1m\x1b[32m🎉 All steps completed successfully!\x1b[0m\n');
