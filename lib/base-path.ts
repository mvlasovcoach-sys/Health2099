const ENV_BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASEPATH);

function normalizeBasePath(value?: string | null): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === '/' || trimmed === '.') {
    return '';
  }
  let normalized = trimmed;
  try {
    if (/^https?:/i.test(normalized)) {
      const url = new URL(normalized);
      normalized = url.pathname || '';
    }
  } catch {
    // Ignore URL parsing errors and fall back to raw value.
  }
  normalized = normalized.replace(/\/+$/, '');
  if (!normalized) {
    return '';
  }
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized === '/' ? '' : normalized;
}

declare global {
  interface Window {
    __BASE_PATH__?: string;
    __NEXT_DATA__?: {
      assetPrefix?: string;
      [key: string]: unknown;
    };
  }
}

function readDocumentBasePath(): string {
  if (typeof document === 'undefined') return '';
  const datasetValue = document.documentElement?.dataset?.basepath;
  return normalizeBasePath(datasetValue);
}

function readWindowBasePath(): string {
  if (typeof window === 'undefined') return '';
  if (typeof window.__BASE_PATH__ === 'string') {
    return normalizeBasePath(window.__BASE_PATH__);
  }
  const assetPrefix = window.__NEXT_DATA__?.assetPrefix;
  return normalizeBasePath(assetPrefix);
}

let cachedBasePath: string | null = null;

export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return ENV_BASE_PATH;
  }
  if (cachedBasePath != null) {
    return cachedBasePath;
  }
  const fromDocument = readDocumentBasePath();
  if (fromDocument) {
    cachedBasePath = fromDocument;
    return fromDocument;
  }
  const fromWindow = readWindowBasePath();
  if (fromWindow) {
    cachedBasePath = fromWindow;
    return fromWindow;
  }
  cachedBasePath = ENV_BASE_PATH;
  return cachedBasePath;
}

export function withBasePath(path: string): string {
  const base = getBasePath();
  if (!base) {
    return path;
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (!path.startsWith('/')) {
    return path;
  }
  if (path === normalizedBase || path.startsWith(`${normalizedBase}/`)) {
    return path;
  }
  return `${normalizedBase}${path}`;
}

export const BASE_PATH = ENV_BASE_PATH;

export { normalizeBasePath };

