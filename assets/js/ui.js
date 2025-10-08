const TOAST_DURATION = 6000;

export function createToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, options = {}) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.className = 'toast card-hover';
  toast.tabIndex = 0;

  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  toast.appendChild(messageEl);

  if (typeof options.onUndo === 'function') {
    const undoBtn = document.createElement('button');
    undoBtn.type = 'button';
    undoBtn.className = 'card-press';
    undoBtn.textContent = options.undoLabel || 'Undo';
    let undone = false;
    undoBtn.addEventListener('click', () => {
      if (undone) return;
      undone = true;
      options.onUndo();
      removeToast(toast);
    });
    toast.appendChild(undoBtn);
  }

  container.appendChild(toast);
  setTimeout(() => removeToast(toast), options.duration || TOAST_DURATION);
  return toast;
}

function removeToast(toast) {
  if (!toast?.parentElement) return;
  toast.parentElement.removeChild(toast);
}
