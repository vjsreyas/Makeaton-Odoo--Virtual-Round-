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
import { AccountMenu } from './AccountMenu';
import { BrandMark } from './Brand';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenBillingModal: () => void;
  onOpenNewSubscription: () => void;
  canRunBilling: boolean;
  canCreateSubscription: boolean;
  activeNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenBillingModal,
  onOpenNewSubscription,
  canRunBilling,
  canCreateSubscription,
  activeNotificationsCount
}) => {
  const [showNotifs, setShowNotifs] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#f1f5f9]/90 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between gap-4">
      {/* Brand logo & version pill */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer">
          <BrandMark />
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
        {canRunBilling && (
        <button
          onClick={onOpenBillingModal}
          className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-slate-800" />
          <span>Run Billing</span>
        </button>
        )}

        {canCreateSubscription && (
        <button
          onClick={onOpenNewSubscription}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-bold tracking-tight shadow-sm transition-all active:scale-95 glow-kinetic cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Subscription</span>
        </button>
        )}

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications (demo data)"
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
                <span className="text-[11px] text-amber-700 font-medium">Demo data</span>
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

        <AccountMenu />
      </div>
    </header>
  );
};
