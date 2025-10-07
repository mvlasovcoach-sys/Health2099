# Shared Storage API

A lightweight client-side module that wraps `localStorage` for diary and summary pages. It exposes a `StorageAPI` object globally (for `<script>` usage) and as a CommonJS/AMD export. When imported with ES modules, the default export is the same object.

## Keys

- `LS_EVENTS` – stored JSON array of event objects (`health_events_v1`).
- `LS_SETTINGS` – stored JSON object with UI preferences (`health_settings_v1`).
- `SCHEMA_VERSION` – current schema marker (`1`).

## Core methods

- `loadEvents(): Event[]` – returns normalized event list sorted by newest first.
- `saveEvents(events: Event[]): Event[]` – persists and re-normalizes events.
- `loadSettings(): object` / `saveSettings(settings: object): object` – read and write settings payloads.
- `upsertEvents(events: Event[]): { added, updated, total }` – merge incoming events by `id` and `updated_at`.
- `range(start: Date, end: Date): Event[]` – non-deleted events within the inclusive range.
- `aggregates(scope, anchor): Summary` – returns totals for `day`, `week`, `month`, or `year` windows.
- `exportJson(): { events, settings, version }` – copy of stored payloads.
- `importJson(payload): { added, updated }` – validate, merge, and persist incoming data.

## Events

The module dispatches a `CustomEvent('health:changed', { detail: { target } })` after it mutates storage and when other tabs emit `storage` events. Subscribe on `window` to refresh UIs:

```js
window.addEventListener('health:changed', (event) => {
  // event.detail.target is either "events" or "settings"
  render();
});
```

## Utilities

`StorageAPI.utils` exposes helpers:

- `startOfWeek(date)` – Monday start.
- `startOfMonth(date)`
- `startOfYear(date)`
- `endOfDay(date)`

## Event shape

```
interface Event {
  id: string;
  type: string;
  value_number: number | null;
  note: string;
  created_at: string; // ISO
  updated_at: string; // ISO
  deleted_at?: string; // ISO
  // Any other keys from imports are preserved.
}
```

