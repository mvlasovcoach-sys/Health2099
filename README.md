# Health2099

A lightweight offline-friendly health diary with shared storage. Use the Summary page for quick actions and the Diary for detailed editing, import/export, and historical view.

## Manual smoke test

1. Open `Summary.html` in a browser.
2. Use the `+250 ml water` quick action.
3. Open `DiaryPlus.html` (same tab or another tab) and confirm the new water event appears with updated totals.
4. Edit the value in the diary table, verify Summary updates automatically (thanks to cross-tab sync).
5. Export from the diary, then import the same file to validate merge behaviour.

## Troubleshooting updates

If the UI or map changes don't appear after deploying a new build, perform a hard refresh to bust the service worker cache (Ctrl+F5 on Windows/Linux, or use the Service Worker "Update" control in browser devtools).

## Structure

```
shared/
  storage.js       // LocalStorage wrapper (UMD + global)
  nav-loader.js    // Injects the shared navigation
  styles.css       // Shared styling
includes/
  nav.html         // Navigation partial
DiaryPlus.html     // Diary UI
Summary.html       // Summary / quick actions
pocket_health_link.html // Landing with shortcuts
scripts/smoke.md   // Manual QA checklist
POCKET_README.txt  // Offline and backup guidance
```

