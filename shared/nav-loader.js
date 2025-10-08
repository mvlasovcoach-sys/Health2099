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

      applyBuildBadge(container.querySelector('[data-build-badge]'));
    } catch (err) {
      console.error('Failed to load navigation include', err);
    }
  }

  function applyBuildBadge(target) {
    if (!target) return;
    const info = window.__BUILD_INFO__;
    if (!info || !info.commitShort || !info.builtAt) return;
    try {
      const date = new Date(info.builtAt);
      const formatted = Number.isNaN(date.getTime()) ? info.builtAt : date.toLocaleString();
      target.textContent = `v:${info.commitShort} · ${formatted}`;
      target.setAttribute('title', `Build ${info.commit}\n${formatted}`);
    } catch (err) {
      console.warn('Failed to format build badge', err);
      target.textContent = `v:${info.commitShort}`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
