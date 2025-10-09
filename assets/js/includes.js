(function () {
  const ABSOLUTE_URL = /^(?:[a-z]+:)?\/\//i;
  const HOST_ID = 'sidenav';
  const TOPBAR_SCRIPT_ID = 'topbar-bundle';
  const TOPBAR_PATH = '/assets/topbar.bundle.js?v=8';

  function normalizeBase(value) {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }

  function computeBase() {
    if (typeof window === 'undefined') return '';
    const doc = typeof document !== 'undefined' ? document : null;
    const candidates = [
      window.BASE,
      window.__HEALTH2099_BASE__,
      doc?.documentElement?.dataset?.base,
      doc?.querySelector('meta[name="health-base"]')?.getAttribute('content'),
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') {
        return normalizeBase(candidate);
      }
    }

    const pathname = window.location?.pathname || '';
    if (!pathname || pathname === '/') return '';
    if (pathname.endsWith('/')) {
      return normalizeBase(pathname.slice(0, -1));
    }
    return normalizeBase(pathname.replace(/\/?[^/]*$/, ''));
  }

  const basePath = computeBase();
  if (typeof window !== 'undefined') {
    window.BASE = basePath;
  }

  function withBase(path) {
    if (!path || typeof path !== 'string' || ABSOLUTE_URL.test(path)) {
      return path;
    }
    const cleaned = path.replace(/^\.\//, '');
    if (path.startsWith('/')) {
      return `${basePath}${path}` || path;
    }
    const prefix = basePath ? `${basePath}/${cleaned}` : `/${cleaned}`;
    return prefix.replace(/\/\/{2,}/g, '/');
  }

  if (typeof window !== 'undefined') {
    window.withBase = window.withBase || withBase;
  }

  function ensureTopbar() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(TOPBAR_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = TOPBAR_SCRIPT_ID;
    script.defer = true;
    script.src = withBase(TOPBAR_PATH);
    document.head.appendChild(script);
  }

  function highlightActive(container) {
    if (!container || typeof document === 'undefined') return;
    const path = (window.location?.pathname || '').toLowerCase();
    container.querySelectorAll('a[data-route]').forEach((link) => {
      const route = link.dataset.route ? link.dataset.route.toLowerCase() : '';
      const isActive = route && path.includes(route);
      link.classList.toggle('is-active', Boolean(isActive));
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function injectSidenav() {
    if (typeof document === 'undefined') return;
    const host = document.getElementById(HOST_ID);
    if (!host) return;
    ensureTopbar();
    fetch(withBase('/partials/sidenav.html'))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch sidenav include: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        host.innerHTML = html;
        highlightActive(host);
      })
      .catch((error) => {
        console.error('[includes] Unable to inject sidenav', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidenav, { once: true });
  } else {
    injectSidenav();
  }
})();
