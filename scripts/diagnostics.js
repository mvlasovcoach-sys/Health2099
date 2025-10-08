(function () {
  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function formatDate(value) {
    if (!value) return '—';
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return value;
      }
      return parsed.toLocaleString();
    } catch (err) {
      console.warn('[diagnostics] Failed to format date', err);
      return value;
    }
  }

  function renderBuildInfo() {
    const target = document.querySelector('[data-build-info]');
    if (!target) return;
    const info = window.__BUILD_INFO__ || {};
    const rows = [
      { label: 'Commit', value: info.commit || info.commitShort || 'unknown' },
      { label: 'Short SHA', value: info.commitShort || 'unknown' },
      { label: 'Built', value: formatDate(info.builtAt) },
    ];
    target.innerHTML = '';
    rows.forEach((row) => {
      const wrapper = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = row.label;
      const dd = document.createElement('dd');
      dd.textContent = row.value;
      wrapper.append(dt, dd);
      target.appendChild(wrapper);
    });
  }

  async function loadRoutes() {
    const container = document.querySelector('[data-routes]');
    if (!container) return;
    container.textContent = 'Loading routes…';
    try {
      const response = await fetch('/routes.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch routes manifest (${response.status})`);
      }
      const manifest = await response.json();
      renderRoutes(container, manifest);
    } catch (error) {
      console.error('[diagnostics] Unable to load routes manifest', error);
      container.textContent = 'Failed to load routes manifest. Check console for details.';
    }
  }

  function renderRoutes(container, manifest) {
    container.innerHTML = '';
    if (!manifest || !Array.isArray(manifest.routes) || manifest.routes.length === 0) {
      container.textContent = 'No routes detected in the current build.';
      return;
    }

    const meta = document.createElement('p');
    meta.className = 'diagnostics__routes-meta';
    const generatedLabel = manifest.generatedAt ? formatDate(manifest.generatedAt) : null;
    meta.textContent = generatedLabel
      ? `Manifest generated ${generatedLabel}`
      : 'Manifest generation time unavailable';
    container.appendChild(meta);

    const list = document.createElement('ul');
    list.className = 'diagnostics__routes';

    manifest.routes.forEach((route) => {
      const item = document.createElement('li');
      const path = document.createElement('code');
      path.textContent = route.path || 'unknown';

      const description = document.createElement('span');
      const file = route.file ? route.file : 'unknown file';
      const title = route.title ? route.title : null;
      description.textContent = title ? ` – ${title} (${file})` : ` – ${file}`;

      item.append(path, description);
      list.appendChild(item);
    });

    container.appendChild(list);
  }

  ready(() => {
    renderBuildInfo();
    loadRoutes();
    if (typeof window !== 'undefined') {
      window.addEventListener('build:info', renderBuildInfo);
    }
  });
})();
