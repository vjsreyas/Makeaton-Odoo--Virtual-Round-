import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { roleLabel } from '../auth/permissions';
import { ContextList } from './ContextList';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function AccountMenu() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  if (!me) return null;

  const signOut = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-[#1e232d] text-[#c1f100] text-xs font-bold flex items-center justify-center ring-2 ring-white">
          {initials(me.user.full_name)}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-bold text-slate-800 leading-none">{me.user.full_name}</div>
          <div className="text-[10px] font-semibold text-slate-400 leading-none mt-0.5">{roleLabel(me.role)}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50 space-y-3">
          <div className="px-2 py-1.5 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-900">{me.user.full_name}</div>
            <div className="text-[11px] text-slate-500 font-mono break-all">{me.user.email}</div>
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-[#1e232d] text-[#c1f100] text-[10px] font-bold">
              {roleLabel(me.role)}
              {me.business ? ` • ${me.business.name}` : ''}
            </span>
          </div>

          <div className="px-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Switch context</div>
            <ContextList onSwitched={() => setOpen(false)} />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1">
            <Link
              to="/account/password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <KeyRound className="w-4 h-4 text-slate-500" aria-hidden="true" /> Change password
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
