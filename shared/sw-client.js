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

  function getBasePath(globalObject) {
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

  function withBasePath(globalObject, path) {
    if (typeof path !== 'string' || !path.length || path[0] !== '/') {
      return path;
    }
    var base = getBasePath(globalObject);
    if (!base) return path;
    if (path === base || path.indexOf(base + '/') === 0) {
      return path;
    }
    return base.endsWith('/') ? base.slice(0, -1) + path : base + path;
  }

  const globalObject = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null;
  const BUILD_INFO = Object.freeze({
    commit: '__BUILD_COMMIT__',
    commitShort: '__BUILD_COMMIT_SHORT__',
    builtAt: '__BUILD_DATE_ISO__',
  });

  if (globalObject) {
    globalObject.__BUILD_INFO__ = BUILD_INFO;
    dispatchBuildInfo(globalObject, BUILD_INFO);
  }

  if (!globalObject) {
    return;
  }

  const navigatorRef = globalObject.navigator;
  if (!navigatorRef || !('serviceWorker' in navigatorRef)) {
    return;
  }

  const swPreference = globalObject.__SW_ENABLED__;
  const shouldRegister = swPreference === true || swPreference === 'on';
  if (!shouldRegister) {
    console.info('[sw] Registration disabled (set window.__SW_ENABLED__ = "on" to enable).');
    return;
  }

  let refreshing = false;

  globalObject.addEventListener('load', () => {
    const swPath = withBasePath(globalObject, '/service-worker.js');
    const swUrl = new URL(swPath, globalObject.location.origin);
    if (BUILD_INFO.commitShort && BUILD_INFO.commitShort !== '__BUILD_COMMIT_SHORT__') {
      swUrl.searchParams.set('v', BUILD_INFO.commitShort);
    }

    navigatorRef.serviceWorker
      .register(swUrl.href)
      .then((registration) => {
        handleRegistration(registration);
      })
      .catch((err) => {
        console.warn('[sw] Registration failed', err);
      });
  });

  navigatorRef.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    globalObject.location.reload();
  });

  function handleRegistration(registration) {
    if (!registration) return;

    if (registration.waiting) {
      promptUpdate(registration);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          promptUpdate(registration);
        }
      });
    });
  }

  function promptUpdate(registration) {
    const waiting = registration.waiting;
    const toast = ensureToast();
    toast.message.textContent = 'New version available';
    toast.element.classList.add('visible');
    toast.button.disabled = false;
    toast.button.textContent = 'Reload';

    const reload = () => {
      if (!registration.waiting) {
        return;
      }
      toast.button.disabled = true;
      toast.button.textContent = 'Reloading…';
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    };

    toast.button.onclick = reload;

    if (waiting) {
      waiting.addEventListener('statechange', (event) => {
        if (event.target?.state === 'redundant') {
          hideToast(toast.element);
        }
      });
    }
  }

  function ensureToast() {
    let element = document.querySelector('[data-update-toast]');
    if (!element) {
      element = document.createElement('div');
      element.className = 'update-toast';
      element.dataset.updateToast = 'true';
      element.setAttribute('role', 'status');
      const message = document.createElement('span');
      message.className = 'update-toast__message';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button primary';
      button.textContent = 'Reload';
      element.append(message, button);
      document.body.appendChild(element);
      return { element, message, button };
    }
    let message = element.querySelector('.update-toast__message');
    let button = element.querySelector('button');
    if (!message || !button) {
      element.innerHTML = '';
      message = document.createElement('span');
      message.className = 'update-toast__message';
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'button primary';
      button.textContent = 'Reload';
      element.append(message, button);
    }
    return { element, message, button };
  }

  function hideToast(element) {
    if (!element) return;
    element.classList.remove('visible');
  }

  function dispatchBuildInfo(target, detail) {
    if (!target || typeof target.dispatchEvent !== 'function') return;
    try {
      let event;
      if (typeof target.CustomEvent === 'function') {
        event = new target.CustomEvent('build:info', { detail });
      } else if (typeof CustomEvent === 'function') {
        event = new CustomEvent('build:info', { detail });
      } else if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('build:info', false, false, detail);
      }
      if (event) {
        target.dispatchEvent(event);
      }
    } catch (err) {
      console.debug('[sw] Failed to dispatch build info event', err);
    }
  }
})();
