#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

function getGitValue(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT_DIR }).toString().trim();
  } catch (error) {
    console.warn(`Failed to run git ${args}:`, error);
    return '';
  }
}

const gitCommit = getGitValue('rev-parse HEAD');
const envCommit =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.GIT_COMMIT ||
  process.env.COMMIT_REF ||
  '';

const commit = gitCommit || envCommit || 'dev-build';

const gitShort = getGitValue('rev-parse --short HEAD');
const envShort = shorten(envCommit) || shorten(process.env.GIT_COMMIT) || '';
const commitShort = gitShort || envShort || (commit !== 'dev-build' ? shorten(commit) : '') || 'dev';
const builtAt = new Date().toISOString();

const versionPayload = JSON.stringify({ commit, builtAt }, null, 2) + '\n';

await fs.mkdir(path.join(ROOT_DIR, 'public'), { recursive: true });
await fs.writeFile(path.join(ROOT_DIR, 'public', 'version.json'), versionPayload, 'utf8');
await fs.writeFile(path.join(ROOT_DIR, 'version.json'), versionPayload, 'utf8');

const htmlFiles = [
  'DiaryPlus.html',
  'Map.html',
  'Summary.html',
  'pocket_health_link.html',
  path.join('health-cabinet', 'index.html'),
];

const assetPaths = [
  '/shared/styles.css',
  '/shared/sw-client.js',
  '/shared/storage.js',
  '/shared/nav-loader.js',
  '/scripts/diary.js',
  '/health/health-cabinet-page.js',
];

for (const relative of htmlFiles) {
  const filePath = path.join(ROOT_DIR, relative);
  let content = await fs.readFile(filePath, 'utf8');
  for (const asset of assetPaths) {
    const pattern = new RegExp(`${escapeRegExp(asset)}(?:\\?v=[^"'\\s]*)?`, 'g');
    content = content.replace(pattern, `${asset}?v=${commitShort}`);
  }
  await fs.writeFile(filePath, content, 'utf8');
}

await updateSwClient();
await updateServiceWorker();

console.log(`Generated version metadata for ${commitShort} at ${builtAt}`);

async function updateSwClient() {
  const filePath = path.join(ROOT_DIR, 'shared', 'sw-client.js');
  let content = await fs.readFile(filePath, 'utf8');
  content = content
    .replace(/commit:\s*'[^']*'/, `commit: '${commit}'`)
    .replace(/commitShort:\s*'[^']*'/, `commitShort: '${commitShort}'`)
    .replace(/builtAt:\s*'[^']*'/, `builtAt: '${builtAt}'`);
  await fs.writeFile(filePath, content, 'utf8');
}

async function updateServiceWorker() {
  const filePath = path.join(ROOT_DIR, 'service-worker.js');
  let content = await fs.readFile(filePath, 'utf8');
  content = content.replace(/const BUILD_VERSION = '[^']*';/, `const BUILD_VERSION = '${commitShort}';`);
  await fs.writeFile(filePath, content, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shorten(value) {
  if (!value || typeof value !== 'string') return '';
  return value.slice(0, 7);
}
