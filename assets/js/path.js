const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

function ensureTrailingSlash(value) {
  if (!value) return '/';
  return value.endsWith('/') ? value : `${value}/`;
}

function computeBaseURL() {
  if (typeof window === 'undefined') {
    return new URL('./', 'http://localhost');
  }

  const globalBase = typeof window.__HEALTH2099_BASE__ === 'string' ? window.__HEALTH2099_BASE__ : null;
  const documentBase =
    (typeof document !== 'undefined' && document.querySelector('base')?.getAttribute('href')) || null;
  const datasetBase =
    typeof document !== 'undefined' && document.documentElement?.dataset?.base
      ? document.documentElement.dataset.base
      : null;
  const metaBase =
    typeof document !== 'undefined'
      ? document.querySelector('meta[name="health-base"]')?.getAttribute('content')
      : null;

  const candidate = globalBase || datasetBase || metaBase || documentBase;

  if (candidate) {
    try {
      return new URL(ensureTrailingSlash(candidate), window.location.href);
    } catch (error) {
      console.warn('[path] Failed to resolve base candidate', error);
    }
  }

  try {
    return new URL('./', window.location.href);
  } catch (error) {
    console.warn('[path] Falling back to origin for base resolution', error);
    return new URL('./', `${window.location.origin || 'http://localhost'}/`);
  }
}

const baseURL = computeBaseURL();

function normalizeResult(url) {
  if (!url) return '';
  if (ABSOLUTE_URL_PATTERN.test(url)) {
    return url;
  }
  try {
    const resolved = new URL(url, baseURL);
    return `${resolved.pathname}${resolved.search}${resolved.hash}` || '/';
  } catch (error) {
    console.warn('[path] Failed to normalize url', url, error);
    return url;
  }
}

export function withBase(path = '') {
  if (typeof path !== 'string' || path.trim() === '') {
    return `${baseURL.pathname}`;
  }

  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  if (path.startsWith('/')) {
    return normalizeResult(path);
  }

  const cleaned = path.replace(/^\.\//, '');
  return normalizeResult(`${baseURL.pathname}${cleaned}`);
}

export function resolveModulePaths(paths) {
  if (!Array.isArray(paths)) return [];
  return paths.map((item) => withBase(item));
}

export function getBasePath() {
  return `${baseURL.pathname}`;
}

