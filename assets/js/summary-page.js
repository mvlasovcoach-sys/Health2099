import * as store from './sharedStorage.js';
import './summary-header.js';
import './sidebar.js';
import './quick-actions.js';
import './hero-kpi.js';
import './kpi.js';
import './timeline.js';
import './insights.js';
import './streaks.js';
import './kpi-rings.js';
import './dev-seed.js';

function ready(callback) {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  } else {
    callback();
  }
}

ready(() => {
  if (typeof window === 'undefined') return;
  window.Health2099 = window.Health2099 || {};
  window.Health2099.store = store.SharedStorage || store;
});
