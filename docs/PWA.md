# Progressive Web App support

Health2099 ships with a simple Progressive Web App (PWA) configuration so the diary, summary, and map continue to work offline.

## Features

- `manifest.webmanifest` advertises icons, app name, colors, and the start URL (`pocket_health_link.html`).
- `service-worker.js` precaches the HTML pages, shared scripts, styles, and icons with a cache-first strategy.
- Each page registers the service worker once the window loads.

## Testing locally

1. Start a static server from the project root, e.g.
   ```bash
   python3 -m http.server 8000
   ```
2. Visit `http://localhost:8000/pocket_health_link.html` in Chromium, Edge, or another PWA-capable browser.
3. Open DevTools → Application → Service Workers to confirm `service-worker.js` is active.
4. Use the **Install** button (or browser menu) to add the app to your home screen / app launcher.
5. Toggle **Offline** in DevTools and reload to verify the diary, summary, and map UI still open from cache (map tiles require network connectivity to stream imagery).

## Updating the cache

- Bump the `CACHE_NAME` constant in `service-worker.js` whenever you add new static assets or change caching logic.
- The install handler precaches everything listed in `APP_SHELL`. Add new files there to make them available offline.
