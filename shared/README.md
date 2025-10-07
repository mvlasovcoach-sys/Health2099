# Shared Storage API

A lightweight client-side module that wraps `localStorage` for diary and summary pages. It exposes a `StorageAPI` object globally (for `<script>` usage) and as a CommonJS/AMD export. When imported with ES modules, the default export is the same object.

## Keys

- `LS_EVENTS` – stored JSON array of event objects (`health_events_v1`).
- `LS_SETTINGS` – stored JSON object with UI preferences (`health_settings_v1`).
- `LS_LOCATIONS` – stored JSON array of map snapshots (`health_locations_v1`).
- `SCHEMA_VERSION` – current schema marker (`1`).

## Core methods

- `loadEvents(): Event[]` – returns normalized event list sorted by newest first.
- `saveEvents(events: Event[]): Event[]` – persists and re-normalizes events.
- `loadSettings(): object` / `saveSettings(settings: object): object` – read and write settings payloads.
- `loadLocations(): Location[]` / `saveLocations(locations: Location[]): Location[]` – read/write normalized location snapshots.
- `addLocation(input): Location` / `updateLocation(id, patch)` / `deleteLocation(id)` – CRUD helpers for locations.
- `locationsByDate(date: Date): Location[]` / `locationsInRange(start, end): Location[]` – convenience filters.
- `upsertEvents(events: Event[]): { added, updated, total }` – merge incoming events by `id` and `updated_at`.
- `upsertLocations(locations: Location[]): { added, updated, total }` – merge snapshots by `id` and `updated_at`.
- `range(start: Date, end: Date): Event[]` – non-deleted events within the inclusive range.
- `aggregates(scope, anchor): Summary` – returns totals for `day`, `week`, `month`, or `year` windows.
- `exportJson(): { events, settings, locations, version }` – copy of stored payloads.
- `importJson(payload): { added, updated, events, locations }` – validate, merge, and persist incoming data. The top-level `added`
  and `updated` keys mirror the `events` counters for backward compatibility.

## Events

The module dispatches a `CustomEvent('health:changed', { detail: { target } })` after it mutates storage and when other tabs emit `storage` events. Subscribe on `window` to refresh UIs:

```js
window.addEventListener('health:changed', (event) => {
  // event.detail.target is "events", "settings", "locations", or "storage"
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

## Location shape

```
interface Location {
  id: string;
  lat: number;
  lng: number;
  accuracy_m?: number | null;
  source: 'device' | 'manual';
  note?: string;
  created_at: string; // ISO
  updated_at: string; // ISO
}
```

