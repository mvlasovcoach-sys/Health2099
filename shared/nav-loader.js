(function () {
  function normalizeBasePath(value) {
    if (!value) return '';
    var raw = String(value).trim();
    if (!raw || raw === '/' || raw === '.') {
      return '';
    }
    if (/^https?:/i.test(raw)) {
      try {
        raw = new URL(raw).pathname || '';
      } catch (err) {
        // Ignore malformed URLs.
      }
    }
    raw = raw.replace(/\/+$/, '');
    if (!raw) {
      return '';
    }
    if (!raw.startsWith('/')) {
      raw = '/' + raw;
    }
    return raw === '/' ? '' : raw;
  }

  function getBasePath() {
    var globalObject = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null;
    if (!globalObject) return '';
    var doc = globalObject.document;
    if (doc && doc.documentElement && doc.documentElement.dataset && doc.documentElement.dataset.basepath) {
      var datasetValue = doc.documentElement.dataset.basepath;
      var normalized = normalizeBasePath(datasetValue);
      if (normalized) return normalized;
    }
    if (typeof globalObject.__BASE_PATH__ === 'string') {
      var fromGlobal = normalizeBasePath(globalObject.__BASE_PATH__);
      if (fromGlobal) return fromGlobal;
    }
    var assetPrefix = globalObject.__NEXT_DATA__ && globalObject.__NEXT_DATA__.assetPrefix;
    if (typeof assetPrefix === 'string') {
      return normalizeBasePath(assetPrefix);
    }
    return '';
  }

  function withBasePath(path) {
    if (typeof path !== 'string' || !path.length || path[0] !== '/') {
      return path;
    }
    var base = getBasePath();
    if (!base) return path;
    if (path === base || path.indexOf(base + '/') === 0) {
      return path;
    }
    return base.endsWith('/') ? base.slice(0, -1) + path : base + path;
  }

  const NAV_PATH = '/includes/nav.html';

  async function injectNav() {
    const container = document.querySelector('[data-include="nav"]');
    if (!container) return;
    try {
      const response = await fetch(withBasePath(NAV_PATH), { cache: 'no-store' });
      const markup = await response.text();
      container.innerHTML = markup;

      const page = document.body?.dataset?.page || '';
      if (page) {
        const activeLink = container.querySelector(`.nav-link[data-nav="${page}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
          activeLink.setAttribute('aria-current', 'page');
        }
      }

      const buildBadge = container.querySelector('[data-build-badge]');
      applyBuildBadge(buildBadge);
      attachBuildBadgeListener(buildBadge);
    } catch (err) {
      console.error('Failed to load navigation include', err);
    }
  }

  function applyBuildBadge(target) {
    if (!target) return;
    const info = window.__BUILD_INFO__ || {};
    try {
      let formatted = '';
      if (info.builtAt) {
        const date = new Date(info.builtAt);
        formatted = Number.isNaN(date.getTime()) ? String(info.builtAt) : date.toLocaleString();
      }
      const short = info.commitShort || 'dev';
      target.textContent = formatted ? `v:${short} · ${formatted}` : `v:${short}`;
      const titleParts = [];
      if (info.commit) {
        titleParts.push(`Build ${info.commit}`);
      }
      if (formatted) {
        titleParts.push(formatted);
      }
      if (titleParts.length) {
        target.setAttribute('title', titleParts.join('\n'));
      }
    } catch (err) {
      console.warn('Failed to format build badge', err);
      const short = (window.__BUILD_INFO__ && window.__BUILD_INFO__.commitShort) || 'dev';
      target.textContent = `v:${short}`;
    }
  }

  function attachBuildBadgeListener(target) {
    if (!target || typeof window === 'undefined') return;
    if (target.dataset.buildBadgeListening === 'true') return;
    const handler = () => applyBuildBadge(target);
    window.addEventListener('build:info', handler);
    target.dataset.buildBadgeListening = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
