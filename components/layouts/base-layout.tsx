import React from 'react';

import { cn } from '@lib/utils/cn';

interface BaseLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  title,
  subtitle,
  actions,
  className,
  children,
}) => (
  <div className={cn('min-h-screen bg-slate-50 text-slate-900', className)}>
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
  </div>
);
