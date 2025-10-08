(function () {
  const BUILD_INFO = Object.freeze({
    commit: '__BUILD_COMMIT__',
    commitShort: '__BUILD_COMMIT_SHORT__',
    builtAt: '__BUILD_DATE_ISO__',
  });

  window.__BUILD_INFO__ = BUILD_INFO;

  if (!('serviceWorker' in navigator)) {
    return;
  }

  let refreshing = false;

  window.addEventListener('load', () => {
    const swUrl = new URL('/service-worker.js', window.location.origin);
    if (BUILD_INFO.commitShort && BUILD_INFO.commitShort !== '__BUILD_COMMIT_SHORT__') {
      swUrl.searchParams.set('v', BUILD_INFO.commitShort);
    }

    navigator.serviceWorker
      .register(swUrl.href)
      .then((registration) => {
        handleRegistration(registration);
      })
      .catch((err) => {
        console.warn('[sw] Registration failed', err);
      });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
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
})();
