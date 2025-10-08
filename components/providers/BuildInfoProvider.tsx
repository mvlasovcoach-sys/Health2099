'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { withBasePath } from '@/lib/base-path';

export type BuildInfo = {
  commit: string;
  commitShort: string;
  builtAt: string;
};

const defaultInfo: BuildInfo = {
  commit: '',
  commitShort: 'dev',
  builtAt: '',
};

const BuildInfoContext = createContext<BuildInfo>(defaultInfo);

function normalize(info: Partial<BuildInfo> | null | undefined): BuildInfo {
  const commit = typeof info?.commit === 'string' && info.commit.length > 0 ? info.commit : '';
  const builtAt = typeof info?.builtAt === 'string' ? info.builtAt : '';
  const short = info?.commitShort || (commit ? commit.slice(0, 7) : 'dev');
  return {
    commit,
    builtAt,
    commitShort: short,
  };
}

export function BuildInfoProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<BuildInfo>(defaultInfo);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(withBasePath('/version.json'), { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setInfo(normalize(payload));
        }
      } catch (error) {
        console.warn('[build-info] Failed to load version.json', error);
      }
    }

    load();

    const handleBuildInfo = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as Partial<BuildInfo> | undefined;
      if (!detail) return;
      setInfo((current) => {
        const next = normalize({ ...current, ...detail });
        return next;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('build:info', handleBuildInfo as EventListener);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('build:info', handleBuildInfo as EventListener);
      }
    };
  }, []);

  return <BuildInfoContext.Provider value={info}>{children}</BuildInfoContext.Provider>;
}

export function useBuildInfo() {
  return useContext(BuildInfoContext);
}

export default BuildInfoProvider;
