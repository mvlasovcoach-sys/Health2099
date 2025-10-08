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

function shorten(value) {
  if (!value) return '';
  return value.slice(0, 7);
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
const envShort = shorten(envCommit) || shorten(process.env.GIT_COMMIT);
const commitShort = gitShort || envShort || (commit !== 'dev-build' ? shorten(commit) : '') || 'dev';
const builtAt = new Date().toISOString();

const versionPayload = JSON.stringify({ commit, builtAt }, null, 2) + '\n';
await fs.mkdir(path.join(ROOT_DIR, 'public'), { recursive: true });
await fs.writeFile(path.join(ROOT_DIR, 'public', 'version.json'), versionPayload, 'utf8');
await fs.writeFile(path.join(ROOT_DIR, 'version.json'), versionPayload, 'utf8');

const routesPayload = JSON.stringify(
  {
    generatedAt: builtAt,
    commit,
    commitShort,
    routes: await collectRoutes(),
  },
  null,
  2,
); 
await fs.writeFile(path.join(ROOT_DIR, 'public', 'routes.json'), `${routesPayload}\n`, 'utf8');

console.log(`Generated version metadata for ${commitShort} at ${builtAt}`);

async function collectRoutes() {
  const routes = new Set();
  const appDir = path.join(ROOT_DIR, 'app');
  await walk(appDir, '');
  return Array.from(routes)
    .map((item) => ({ path: item.path, file: path.relative(ROOT_DIR, item.file) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  async function walk(currentDir, routePrefix) {
    let entries = [];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const absolute = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        const segment = entry.name.startsWith('(') ? '' : `/${entry.name}`;
        const nextPrefix = routePrefix + segment;
        await walk(absolute, nextPrefix);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/^page\.(tsx?|jsx?)$/.test(entry.name)) continue;
      const route = routePrefix || '/';
      routes.add({ path: route, file: absolute });
    }
  }
}
