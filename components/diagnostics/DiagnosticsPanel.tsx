'use client';

import { useEffect, useState } from 'react';
import { useBuildInfo } from '@/components/providers/BuildInfoProvider';

const ROUTES = [
  { path: '/summary', title: 'Summary' },
  { path: '/health-cabinet', title: 'Health cabinet' },
  { path: '/diary', title: 'Diary' },
  { path: '/map', title: 'Map' },
  { path: '/__diagnostics', title: 'Diagnostics' },
];

type CssAsset = {
  href: string;
  size: string;
  status: string;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown';
  const units = ['B', 'KB', 'MB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, exponent);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export function DiagnosticsPanel() {
  const info = useBuildInfo();
  const [cssAssets, setCssAssets] = useState<CssAsset[]>([]);
  const [swStatus, setSwStatus] = useState<'on' | 'off' | 'unknown'>('unknown');

  useEffect(() => {
    const collectCss = async () => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
      const results: CssAsset[] = [];
      await Promise.all(
        links.map(async (link) => {
          const href = new URL(link.href, window.location.href).pathname;
          try {
            const response = await fetch(link.href, { method: 'HEAD' });
            const contentLength = response.headers.get('content-length');
            const size = contentLength ? formatBytes(Number(contentLength)) : 'unknown';
            results.push({ href, size, status: `${response.status}` });
          } catch (error) {
            console.warn('[diagnostics] Failed to fetch CSS metadata', error);
            results.push({ href, size: 'unknown', status: 'error' });
          }
        }),
      );
      setCssAssets(results);
    };

    collectCss();
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setSwStatus('off');
      return;
    }
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        setSwStatus(registrations.length > 0 ? 'on' : 'off');
      })
      .catch(() => setSwStatus('unknown'));
  }, []);

  return (
    <div className="flow diagnostics" data-diagnostics-root>
      <section className="card">
        <h2>Build</h2>
        <dl className="diagnostics__list" data-build-info>
          <div>
            <dt>Commit</dt>
            <dd>{info.commit || 'Unknown'}</dd>
          </div>
          <div>
            <dt>Built</dt>
            <dd>{info.builtAt ? new Date(info.builtAt).toLocaleString() : 'Unknown'}</dd>
          </div>
          <div>
            <dt>Service worker</dt>
            <dd>{swStatus}</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2>Routes</h2>
        <ul className="diagnostics__routes" data-routes>
          {ROUTES.map((route) => (
            <li key={route.path}>
              <code>{route.path}</code>
              <span>{route.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Stylesheets</h2>
        <ul className="diagnostics__assets" data-css-assets>
          {cssAssets.length === 0 && <li>No CSS linked</li>}
          {cssAssets.map((asset) => (
            <li key={asset.href}>
              <code>{asset.href}</code>
              <span>{asset.size}</span>
              <span>Status: {asset.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default DiagnosticsPanel;
