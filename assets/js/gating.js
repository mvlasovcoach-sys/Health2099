import { appState } from './appState.js';

function hideModal(modal) {
  modal.classList.add('hidden');
}

export function requireProOrRedirect() {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('pro-modal');
  if (!modal) return;

  const later = document.getElementById('pro-later');
  const start = document.getElementById('pro-start');

  if (!appState.isPro) {
    modal.classList.remove('hidden');

    if (later) {
      later.onclick = () => {
        hideModal(modal);
        window.location.href = 'Summary.html';
      };
    }

    if (start) {
      start.onclick = () => {
        hideModal(modal);
      };
    }
  } else {
    hideModal(modal);
  }
}
