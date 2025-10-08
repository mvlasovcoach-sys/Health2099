import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { BuildInfoProvider } from '@/components/providers/BuildInfoProvider';
import { BASE_PATH } from '@/lib/base-path';

export const metadata: Metadata = {
  title: 'Health • 2099',
  description: 'Diary, summary, map, and health cabinet insights in a unified dashboard.',
  manifest: BASE_PATH ? `${BASE_PATH}/manifest.webmanifest` : '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-basepath={BASE_PATH || undefined}>
      <body className="app-shell">
        <BuildInfoProvider>
          <AppShell>{children}</AppShell>
        </BuildInfoProvider>
      </body>
    </html>
  );
}
