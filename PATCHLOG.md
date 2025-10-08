# Restore UI & Health Cabinet Patch Log

## App structure
- Added Next.js App Router layout and routes in `app/` (layout, summary, diary, map, health cabinet, diagnostics).
- Introduced global styles via `app/globals.css`.

## Components
- Migrated health dashboard widgets to React/TypeScript in `components/health/` (DualGauge, DeviceStatusCard, DeviceStatusBanner, KpiGrid, RingRow, FactsRow, NotesCard).
- Added layout shell, build info provider, version badge, and diagnostics panel components.

## State & data
- Replaced legacy dashboard store with TypeScript version in `stores/dashboard.ts` providing fixtures and selectors.

## Tooling & configuration
- Added Next.js/Tailwind configuration (`package.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `next-env.d.ts`).
- Updated build tooling (`scripts/generate-version.mjs`) and caching headers.

## Assets & legacy references
- Generated `legacy/health_old` snapshot and diff, added reusable patch `patches/restore-ui-and-healthcabinet.patch`.
- Relocated web manifest to `public/manifest.webmanifest` and copied static assets to `public/`.
- Documented legacy diff in `legacy/health_old.diff` and ignored legacy snapshot in `.gitignore`.
