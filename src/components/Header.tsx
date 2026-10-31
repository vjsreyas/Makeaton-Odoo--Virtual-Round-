import React from 'react';
import { 
  Search, 
  Play, 
  Plus, 
  Bell, 
  HelpCircle, 
  CheckCircle2, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { StaffMember } from '../types';

interface HeaderProps {
  currentUser: StaffMember;
  onOpenSearch: () => void;
  onOpenBillingModal: () => void;
  onOpenNewSubscription: () => void;
  onSwitchUserRole?: (role: 'Admin' | 'Staff') => void;
  activeNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenSearch,
  onOpenBillingModal,
  onOpenNewSubscription,
  onSwitchUserRole,
  activeNotificationsCount
}) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#f1f5f9]/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between gap-4">
      {/* Brand logo & version pill */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-[#1e232d] flex items-center justify-center text-[#c1f100] shadow-sm">
            {/* Custom Infinity loop icon */}
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.5l-2.83 2.76-2.83-2.76c-.97-.94-2.33-1.5-3.77-1.5C2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.5l2.83-2.76 2.83 2.76c.97.94 2.33 1.5 3.77 1.5 2.98 0 5.4-2.42 5.4-5.38s-2.42-5.38-5.4-5.38zm-13.2 8.76c-1.88 0-3.4-1.52-3.4-3.38s1.52-3.38 3.4-3.38c.94 0 1.83.38 2.47 1.01l2.42 2.37-2.42 2.37c-.64.63-1.53 1.01-2.47 1.01zm13.2 0c-.94 0-1.83-.38-2.47-1.01l-2.42-2.37 2.42-2.37c.64-.63 1.53-1.01 2.47-1.01 1.88 0 3.4 1.52 3.4 3.38s-1.52 3.38-3.4 3.38z"/>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-[#171c20]">Brightloop</span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[11px] font-bold tracking-wider">
          v2.4
        </div>
        <div className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-semibold tracking-wide uppercase hidden sm:block">
          REV OPS
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl mx-2">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm text-sm text-slate-500 transition-all group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className="text-slate-400 group-hover:text-slate-600 truncate">
              Search subscriptions, invoices, customers...
            </span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 rounded border border-slate-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Action Controls & User Capsule */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Run Billing Button */}
        <button
          onClick={onOpenBillingModal}
          className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-slate-800" />
          <span>Run Billing</span>
        </button>

        {/* Kinetic Action: + New Subscription */}
        <button
          onClick={onOpenNewSubscription}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-bold tracking-tight shadow-sm transition-all active:scale-95 glow-kinetic cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Subscription</span>
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {activeNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {activeNotificationsCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Notifications</span>
                <span className="text-[11px] text-emerald-600 font-medium">All systems green</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Batch Invoicing #RUN-01</span>
                    <span className="text-[10px] text-slate-400">10m ago</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">184 invoices sealed and queued for auto-settlement.</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200/50">
                  <div className="flex items-center justify-between font-semibold text-amber-900">
                    <span>14 Invoices Overdue</span>
                    <span className="text-[10px] text-amber-700">Stage 1</span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">Dunning automated notifications dispatched for Vortex Robotics Ltd.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Capsule */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-sm transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-[#1e232d] text-[#c1f100] text-xs font-bold flex items-center justify-center ring-2 ring-white">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</div>
              <div className="text-[10px] font-semibold text-slate-400 leading-none mt-0.5">{currentUser.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-50">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-2">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{currentUser.email}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentUser.role === 'Admin' 
                      ? 'bg-[#1e232d] text-[#c1f100]' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {currentUser.role} Clearance
                  </span>
                  <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> 2FA YubiKey
                  </span>
                </div>
              </div>

              {/* RBAC Quick Role Switcher (Great for demonstration & testing) */}
              <div className="px-2 py-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Test Role Privilege
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      onSwitchUserRole?.('Admin');
                      setShowUserMenu(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      currentUser.role === 'Admin'
                        ? 'bg-[#1e232d] text-[#c1f100]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin
                  </button>
                  <button
                    onClick={() => {
                      onSwitchUserRole?.('Staff');
                      setShowUserMenu(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      currentUser.role === 'Staff'
                        ? 'bg-[#1e232d] text-[#c1f100]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Staff
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
