import { initHeader } from './summary-header.js';
import { initKpi } from './kpi.js';
import { initQuickActions } from './quick-actions.js';
import { initTimeline } from './timeline.js';
import { initInsights } from './insights.js';
import { initStreaks } from './streaks.js';
import { initSidebar } from './sidebar.js';
import { initDevSeed } from './dev-seed.js';
import './ui.js';

function ready(callback) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  }
}

ready(() => {
  initHeader();
  initKpi();
  initQuickActions();
  initTimeline();
  initInsights();
  initStreaks();
  initSidebar();
  initDevSeed();
});
