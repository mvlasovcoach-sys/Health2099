import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { BuildInfoProvider } from '@/components/providers/BuildInfoProvider';

export const metadata: Metadata = {
  title: 'Health • 2099',
  description: 'Diary, summary, map, and health cabinet insights in a unified dashboard.',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <BuildInfoProvider>
          <AppShell>{children}</AppShell>
        </BuildInfoProvider>
      </body>
    </html>
  );
}
