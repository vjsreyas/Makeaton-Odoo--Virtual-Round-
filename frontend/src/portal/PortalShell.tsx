import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, CreditCard, FileText, Layers, LayoutDashboard, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { AccountMenu } from '../components/AccountMenu';
import { useAuth } from '../auth/AuthContext';
import { Toaster } from '../lib/notify';
import { BrightloopLogo } from './BrightloopLogo';
import { InvoiceDrawer } from './InvoiceDrawer';
import { PortalInvoices } from './PortalInvoices';
import { PortalOverview } from './PortalOverview';
import { PortalPayments } from './PortalPayments';
import { PortalProfile } from './PortalProfile';
import { PortalSubscriptions } from './PortalSubscriptions';
import type { PortalRoute } from './portalApi';

const NAV: { id: PortalRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Portal Overview', icon: LayoutDashboard },
  { id: 'subscriptions', label: 'My Subscriptions', icon: Layers },
  { id: 'invoices', label: 'My Invoices', icon: FileText },
  { id: 'payments', label: 'Payments & History', icon: CreditCard },
  { id: 'profile', label: 'Company & Profile', icon: Building2 },
];

export function PortalShell() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [route, setRoute] = useState<PortalRoute>('overview');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const businessName = me?.business?.name ?? 'Your business';
  const firstName = me?.user.full_name.split(/\s+/)[0] ?? '';

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5faff] flex flex-col antialiased selection:bg-[#c1f100] selection:text-[#080d16]">
      <header className="border-b border-[#dee3e8] bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="bg-[#1e232d] text-white py-1.5 px-6 text-[11px] font-mono flex items-center gap-2 border-b border-slate-800">
          <Shield className="w-3 h-3 text-[#c1f100]" aria-hidden="true" />
          <span>Customer session <strong className="text-[#c1f100]">{businessName}</strong></span>
          <span className="text-slate-500 hidden md:inline">| You only see your own records</span>
        </div>
        <div className="px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="font-semibold text-slate-800">{businessName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="bg-[#eff4f9] text-[#080d16] px-2 py-0.5 rounded font-bold">{NAV.find((n) => n.id === route)?.label}</span>
          </div>
          <AccountMenu />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-[#fcfdff] border-r border-[#dee3e8] flex-col justify-between p-4 shrink-0 select-none hidden md:flex">
          <div>
            <div className="px-2 pt-2 pb-5"><BrightloopLogo size="md" subtitle="CUSTOMER PORTAL" /></div>
            <div className="mb-5 px-3 py-2 bg-[#eff4f9] rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full bg-[#c1f100] ring-2 ring-[#c1f100]/40 shrink-0" /><span className="font-bold text-[#080d16] truncate">{businessName}</span></div>
              <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">Active</span>
            </div>
            <nav className="space-y-1" aria-label="Portal">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = route === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setRoute(item.id)} aria-current={active ? 'page' : undefined} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all ${active ? 'bg-[#c1f100] text-[#080d16] font-bold shadow-sm lime-glow-subtle' : 'text-slate-600 hover:text-black hover:bg-slate-100/70'}`}>
                    <Icon className={`w-4 h-4 ${active ? 'text-[#080d16]' : 'text-slate-400'}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="space-y-3 pt-4">
            <div className="p-3.5 bg-[#1e232d] text-white rounded-2xl border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-slate-200 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-[#c1f100]" aria-hidden="true" /><span>Scoped session</span></div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed">Signed in as {me?.user.email}</p>
            </div>
            <button type="button" onClick={signOut} className="w-full py-2 px-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/70 rounded-full transition"><LogOut className="w-3.5 h-3.5" aria-hidden="true" /><span>Log out</span></button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto">
          <nav className="md:hidden flex gap-2 overflow-x-auto px-4 pt-4" aria-label="Portal sections">
            {NAV.map((item) => <button key={item.id} type="button" onClick={() => setRoute(item.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${route === item.id ? 'bg-[#c1f100] border-[#c1f100]' : 'bg-white border-slate-200'}`}>{item.label}</button>)}
          </nav>
          {route === 'overview' && <PortalOverview firstName={firstName} onRoute={setRoute} onOpenInvoice={setInvoiceId} />}
          {route === 'subscriptions' && <PortalSubscriptions />}
          {route === 'invoices' && <PortalInvoices onOpenInvoice={setInvoiceId} />}
          {route === 'payments' && <PortalPayments onOpenInvoice={setInvoiceId} />}
          {route === 'profile' && <PortalProfile businessName={businessName} />}
        </main>
      </div>
      <InvoiceDrawer invoiceId={invoiceId} onClose={() => setInvoiceId(null)} />
      <Toaster />
    </div>
  );
}
