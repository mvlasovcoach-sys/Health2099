(function () {
  async function injectNav() {
    const container = document.querySelector('[data-include="nav"]');
    if (!container) return;
    try {
      const response = await fetch('./includes/nav.html');
      container.innerHTML = await response.text();
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
