function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

function withBase(path) {
  if (typeof window !== 'undefined' && typeof window.withBase === 'function') {
    return window.withBase(path);
  }
  return path;
}

function setupSummaryLinks() {
  const links = document.querySelectorAll('.diary-link[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    link.setAttribute('href', withBase(href));
  });
}

ready(() => {
  const page = document.body?.dataset?.page;
  if (page === 'summary') {
    setupSummaryLinks();
  }
});
