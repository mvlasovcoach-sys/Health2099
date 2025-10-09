import './sharedStorage.js';
import './summary-header.js';
import './sidebar.js';
import './hero-kpi.js';
import './morning.js';
import './quick-log.js';
import './timeline.js';
import './insights.js';
import './streaks.js';
import './dev-seed.js';
import './diary-link.js';

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(async () => {
  if (typeof window === 'undefined') return;
  await import('./includes.js');
  const module = await import('./sharedStorage.js');
  window.Health2099 = window.Health2099 || {};
  window.Health2099.store = module;
});
