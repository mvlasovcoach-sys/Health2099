(() => {
  const ID = 'topbar-bundle';
  if (!document.getElementById(ID)) {
    const s = document.createElement('script');
    s.src = '/Health2099/assets/topbar.bundle.js?v=8';
    s.defer = true;
    s.id = ID;
    document.head.appendChild(s);
  }
})();
(function () {
  async function injectNav() {
    const container = document.querySelector('[data-include="nav"]');
    if (!container) return;
    try {
      const response = await fetch('./includes/nav.html');
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
    } catch (err) {
      console.error('Failed to load navigation include', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }
})();
