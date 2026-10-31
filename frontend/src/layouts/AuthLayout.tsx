import React from 'react';
import { BrandWordmark } from '../components/Brand';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 gap-6">
      <BrandWordmark />
      <main className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-[#171c20] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </main>
      {footer && <div className="text-xs text-slate-500 flex items-center gap-3">{footer}</div>}
    </div>
  );
}
