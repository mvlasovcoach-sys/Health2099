import { withBase } from './path.js';

function ready(callback) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
  }
}

function loadModule(path) {
  return import(withBase(path)).catch((error) => {
    console.error(`Failed to load module ${path}`, error);
    return null;
  });
}

ready(async () => {
  const [
    sharedStorage,
    headerModule,
    heroModule,
    kpiModule,
    quickActionsModule,
    timelineModule,
    insightsModule,
    streaksModule,
    sidebarModule,
    devSeedModule,
    kpiRingsModule,
  ] = await Promise.all([
    loadModule('assets/js/sharedStorage.js'),
    loadModule('assets/js/summary-header.js'),
    loadModule('assets/js/hero-kpi.js'),
    loadModule('assets/js/kpi.js'),
    loadModule('assets/js/quick-actions.js'),
    loadModule('assets/js/timeline.js'),
    loadModule('assets/js/insights.js'),
    loadModule('assets/js/streaks.js'),
    loadModule('assets/js/sidebar.js'),
    loadModule('assets/js/dev-seed.js'),
    loadModule('assets/js/kpi-rings.js'),
  ]);

  if (!sharedStorage || !sharedStorage.SharedStorage) {
    console.error('Shared storage module failed to load; page modules may not work correctly.');
    return;
  }

  headerModule?.initHeader?.();
  heroModule?.initHeroKpi?.();
  kpiModule?.initKpi?.();
  quickActionsModule?.initQuickActions?.();
  timelineModule?.initTimeline?.();
  insightsModule?.initInsights?.();
  streaksModule?.initStreaks?.();
  sidebarModule?.initSidebar?.();
  devSeedModule?.initDevSeed?.();
  kpiRingsModule?.initKpiRings?.();
});

