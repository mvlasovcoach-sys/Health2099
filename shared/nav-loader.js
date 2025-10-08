(function () {
  const NAV_PATH = '/includes/nav.html';

  async function injectNav() {
    const container = document.querySelector('[data-include="nav"]');
    if (!container) return;
    try {
      const response = await fetch(NAV_PATH, { cache: 'no-store' });
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
