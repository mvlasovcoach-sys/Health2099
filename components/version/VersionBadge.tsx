'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { useBuildInfo } from '@/components/providers/BuildInfoProvider';

type VersionBadgeProps = {
  className?: string;
  variant?: 'nav' | 'page';
};

export function VersionBadge({ className, variant = 'nav' }: VersionBadgeProps) {
  const info = useBuildInfo();

  const { label, title } = useMemo(() => {
    const commitShort = info.commitShort || (info.commit ? info.commit.slice(0, 7) : 'dev');
    const badgeLabel = `v:${commitShort}`;
    const lines: string[] = [];
    if (info.commit) {
      lines.push(`Commit ${info.commit}`);
    }
    if (info.builtAt) {
      const built = new Date(info.builtAt);
      lines.push(
        Number.isNaN(built.getTime()) ? `Built ${info.builtAt}` : `Built ${built.toLocaleString()}`,
      );
    }
    return { label: badgeLabel, title: lines.join('\n') };
  }, [info.builtAt, info.commit, info.commitShort]);

  return (
    <span
      className={clsx(
        variant === 'page'
          ? 'badge page-header__badge page-header__badge--version'
          : 'build-badge',
        className,
      )}
      data-version-badge
      title={title}
    >
      {label}
    </span>
  );
}

export default VersionBadge;
