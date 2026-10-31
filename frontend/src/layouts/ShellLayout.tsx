import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AccountMenu } from '../components/AccountMenu';
import { BrandWordmark } from '../components/Brand';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../auth/permissions';

export function ShellLayout() {
  const { me } = useAuth();
  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#171c20] flex flex-col">
      <header className="sticky top-0 z-30 h-16 bg-[#f1f5f9]/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Brightloop home" className="flex items-center gap-3">
          <BrandWordmark />
          <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-semibold tracking-wide uppercase hidden sm:block">
            {roleLabel(me?.role)}
          </span>
        </Link>
        <AccountMenu />
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
