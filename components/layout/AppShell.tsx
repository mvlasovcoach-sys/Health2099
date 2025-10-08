'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import clsx from 'clsx';
import VersionBadge from '@/components/version/VersionBadge';

const NAV_ITEMS = [
  { href: '/summary', label: 'Summary', key: 'summary' },
  { href: '/health-cabinet', label: 'Health cabinet', key: 'health' },
  { href: '/diary', label: 'Diary', key: 'diary' },
  { href: '/map', label: 'Map', key: 'map' },
] as const;

function toPageKey(pathname: string | null) {
  if (!pathname) return 'summary';
  if (pathname === '/' || pathname === '') return 'summary';
  if (pathname.startsWith('/health-cabinet')) return 'health';
  if (pathname.startsWith('/diary')) return 'diary';
  if (pathname.startsWith('/map')) return 'map';
  if (pathname.startsWith('/summary')) return 'summary';
  if (pathname.startsWith('/__diagnostics')) return 'diagnostics';
  return pathname.replace(/^\//, '') || 'summary';
}

function isActive(pathname: string, href: string) {
  if (href === '/summary' && (pathname === '/' || pathname === '/summary')) {
    return true;
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/summary';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const key = toPageKey(pathname);
    document.body.dataset.page = key;
    return () => {
      delete document.body.dataset.page;
    };
  }, [pathname]);

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <Link className="brand-link" href="/summary">
            Health • 2099
          </Link>
          <VersionBadge />
        </div>
        <nav className="nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-nav={item.key}
              className={clsx('nav-link', { active: isActive(pathname, item.href) })}
            >
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="app-main">{children}</main>
    </>
  );
}

export default AppShell;
