import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Package, 
  Bookmark, 
  FileSpreadsheet, 
  Repeat, 
  Receipt, 
  Cpu, 
  CreditCard, 
  AlertTriangle, 
  Percent, 
  Landmark, 
  Users, 
  Settings, 
  LogOut,
  Radio,
  Server
} from 'lucide-react';
import { NavigationTab } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SIDEBAR_ENTRIES, canAccessRequirement, canAccessTab } from '../auth/navigation';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  overdueCount?: number;
  draftCount?: number;
  permissions: readonly string[];
  businessName: string;
  currency: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  overdueCount = 14,
  draftCount = 14,
  permissions,
  businessName,
  currency
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const allow = (tab: NavigationTab) => canAccessTab(permissions, tab);
  const showCatalog = allow('products');
  const showRevenue = ['subscriptions', 'invoices', 'billing-run', 'payments', 'receivables'].some((t) => allow(t as NavigationTab));
  const showAdmin = ['discounts', 'taxes', 'staff', 'settings'].some((t) => allow(t as NavigationTab));
  return (
    <aside className="w-64 bg-[#f5faff] border-r border-slate-200/80 flex flex-col justify-between select-none h-full min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Environment capsule */}
        <div className="px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-tight text-slate-700 truncate max-w-[9rem]" title={businessName}>{businessName}</span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
            {currency || 'BIZ'}
          </span>
        </div>

        {/* OVERVIEW */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Overview
          </div>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'dashboard'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Dashboard</span>
          </button>
          {allow('reports') && (
          <button
            onClick={() => onSelectTab('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'reports'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${currentTab === 'reports' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Reports</span>
          </button>
          )}
        </div>

        {/* CATALOG & PLANS */}
        {showCatalog && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Catalog & Plans
          </div>
          {canAccessRequirement(permissions, { anyOf: ['products.view'] }) && (
          <button
            onClick={() => onSelectTab('products')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'products'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Package className={`w-4 h-4 ${currentTab === 'products' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Products</span>
          </button>
          )}
          {canAccessRequirement(permissions, SIDEBAR_ENTRIES.plans) && (
          <button
            onClick={() => onSelectTab('products')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
          >
            <Bookmark className="w-4 h-4 text-slate-500" />
            <span>Plans</span>
          </button>
          )}
          {canAccessRequirement(permissions, SIDEBAR_ENTRIES.quotationTemplates) && (
          <button
            onClick={() => onSelectTab('products')}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Quotation Templates</span>
          </button>
          )}
        </div>
        )}

        {/* REVENUE OPS */}
        {showRevenue && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Revenue Ops
          </div>
          {allow('subscriptions') && (
          <button
            onClick={() => onSelectTab('subscriptions')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'subscriptions'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Repeat className={`w-4 h-4 ${currentTab === 'subscriptions' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
              <span>Subscriptions</span>
            </div>
          </button>
          )}

          {allow('invoices') && (
          <button
            onClick={() => onSelectTab('invoices')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'invoices' || currentTab === 'invoice-detail'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className={`w-4 h-4 ${currentTab === 'invoices' || currentTab === 'invoice-detail' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
              <span>Invoices</span>
            </div>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {overdueCount}
              </span>
            )}
          </button>
          )}

          {allow('billing-run') && (
          <button
            onClick={() => onSelectTab('billing-run')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'billing-run'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Cpu className={`w-4 h-4 ${currentTab === 'billing-run' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Billing Run</span>
          </button>
          )}

          {allow('payments') && (
          <button
            onClick={() => onSelectTab('payments')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'payments'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <CreditCard className={`w-4 h-4 ${currentTab === 'payments' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Payments</span>
          </button>
          )}

          {allow('receivables') && (
          <button
            onClick={() => onSelectTab('receivables')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'receivables'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-4 h-4 ${currentTab === 'receivables' ? 'text-[#c1f100]' : 'text-amber-500'}`} />
              <span>Outstanding & Overdue</span>
            </div>
          </button>
          )}
        </div>
        )}

        {/* ADMINISTRATION */}
        {showAdmin && (
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administration
          </div>
          {allow('discounts') && (
          <button
            onClick={() => onSelectTab('discounts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'discounts'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Percent className={`w-4 h-4 ${currentTab === 'discounts' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Discounts</span>
          </button>
          )}

          {allow('taxes') && (
          <button
            onClick={() => onSelectTab('taxes')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'taxes'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Landmark className={`w-4 h-4 ${currentTab === 'taxes' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Taxes</span>
          </button>
          )}

          {allow('staff') && (
          <button
            onClick={() => onSelectTab('staff')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'staff'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Users className={`w-4 h-4 ${currentTab === 'staff' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Staff & Roles</span>
          </button>
          )}

          {allow('settings') && (
          <button
            onClick={() => onSelectTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all ${
              currentTab === 'settings'
                ? 'bg-[#1e232d] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-[#c1f100]' : 'text-slate-500'}`} />
            <span>Settings</span>
          </button>
          )}
        </div>
        )}

        {/* Log Out */}
        <div className="pt-2">
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer Status info */}
      <div className="p-4 border-t border-slate-200/80 bg-[#eff4f9]/50 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c1f100] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">Sync Engine</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-emerald-700">
            Demo data
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3" /> LOCAL
          </span>
          <span>v0.1.0</span>
        </div>
      </div>
    </aside>
  );
};
