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
  path.join('__diagnostics', 'index.html'),
];

const assetPaths = [
  '/shared/styles.css',
  '/shared/sw-client.js',
  '/shared/storage.js',
  '/shared/nav-loader.js',
  '/scripts/diary.js',
  '/health/health-cabinet-page.js',
  '/scripts/diagnostics.js',
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
await updateRoutesManifest();

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

async function updateRoutesManifest() {
  const routes = await collectRoutes();
  const payload = JSON.stringify(
    {
      generatedAt: builtAt,
      commit,
      commitShort,
      routes,
    },
    null,
    2,
  );
  await fs.mkdir(path.join(ROOT_DIR, 'public'), { recursive: true });
  await fs.writeFile(path.join(ROOT_DIR, 'routes.json'), `${payload}\n`, 'utf8');
  await fs.writeFile(path.join(ROOT_DIR, 'public', 'routes.json'), `${payload}\n`, 'utf8');
}

async function collectRoutes() {
  const results = [];
  await walk('.');
  return results.sort((a, b) => a.path.localeCompare(b.path));

  async function walk(relativeDir) {
    const absolute = path.join(ROOT_DIR, relativeDir);
    const entries = await fs.readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const name = entry.name;
      if (shouldSkip(name)) continue;
      const relativePath = path.join(relativeDir, name);
      if (entry.isDirectory()) {
        if (shouldSkipDirectory(name)) continue;
        await walk(relativePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!name.toLowerCase().endsWith('.html')) continue;
      const normalized = normalizePath(relativePath);
      const routePath = toRoute(normalized);
      if (!routePath) continue;
      const filePath = path.join(ROOT_DIR, normalized);
      let title = '';
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const match = content.match(/<title>([^<]*)<\/title>/i);
        title = match ? match[1].trim() : '';
      } catch (error) {
        console.warn('Failed to read title for route', normalized, error);
      }
      results.push({ path: routePath, file: normalized, title });
    }
  }
}

function shouldSkip(name) {
  return name === '.DS_Store' || name === 'Thumbs.db';
}

function shouldSkipDirectory(name) {
  return (
    name.startsWith('.') ||
    name === 'node_modules' ||
    name === 'android' ||
    name === 'assets' ||
    name === 'docs' ||
    name === 'includes' ||
    name === 'components' ||
    name === 'health' ||
    name === 'shared' ||
    name === 'scripts' ||
    name === 'stores' ||
    name === 'public'
  );
}

function normalizePath(relativePath) {
  return relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function toRoute(filePath) {
  if (!filePath) return null;
  if (filePath === 'index.html') return '/';
  if (filePath.endsWith('/index.html')) {
    return `/${filePath.slice(0, -'index.html'.length)}`;
  }
  return `/${filePath}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shorten(value) {
  if (!value || typeof value !== 'string') return '';
  return value.slice(0, 7);
}
