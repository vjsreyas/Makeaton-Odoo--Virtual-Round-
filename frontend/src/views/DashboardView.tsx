import React from 'react';
import { ArrowUpRight, IndianRupee, Receipt, Repeat } from 'lucide-react';
import type { Invoice, Subscription, NavigationTab } from '../types';
import { INITIAL_INVOICES, INITIAL_SUBSCRIPTIONS } from '../mock/mockData';
import { invoiceSummary, monthlyRevenue } from '../mock/summary';
import { money, DEMO_MONTH } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';
import { useAuth } from '../auth/AuthContext';
import { can } from '../auth/permissions';

interface DashboardViewProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onSelectInvoice: (invoiceId: string) => void;
  invoices?: Invoice[];
  subscriptions?: Subscription[];
}
export function DashboardView({ onNavigateTab, onSelectInvoice, invoices = INITIAL_INVOICES, subscriptions = INITIAL_SUBSCRIPTIONS }: DashboardViewProps) {
  const { me } = useAuth();
  const finance = can(me?.permissions ?? [], 'reports.view');
  const summary = invoiceSummary(invoices);
  const active = subscriptions.filter(sub => sub.status === 'Active');
  const mrr = monthlyRevenue(subscriptions);
  const channels = [...new Set(invoices.flatMap(invoice => invoice.payments.map(payment => payment.method)))].map(method => ({ method, total: invoices.flatMap(invoice => invoice.payments).filter(payment => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0) }));
  return <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
    <div className="rounded-3xl bg-[#1e232d] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-5">
      <div><div className="text-[#c1f100] text-xs font-bold uppercase tracking-widest">Your business, at a glance</div><h1 className="text-3xl font-extrabold mt-2">October business overview</h1><p className="text-slate-300 text-sm mt-3">A simple month of software subscriptions for Indian small businesses.</p><p className="text-xs text-slate-400 mt-3">Asia/Kolkata (IST) • Indian rupees (INR)</p></div>
      <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-4"><IndianRupee className="w-5 h-5 text-[#c1f100]"/><div className="text-sm mt-2">{subscriptions.length} subscriptions</div><div className="text-xs text-slate-400 mt-1">{active.length} active • {subscriptions.filter(sub => sub.status === 'Paused').length} paused</div></div>
    </div>
    {finance ? <>
      <DemoMetrics items={[
        { label: 'Invoiced', value: money(summary.invoiced), hint: `${summary.issued.length} issued invoices • drafts excluded` },
        { label: 'Payments received', value: money(summary.collected), hint: `${invoices.flatMap(invoice => invoice.payments).length} recorded payments this month` },
        { label: 'Still to collect', value: money(summary.outstanding), hint: 'Issued invoice totals minus payments received' },
        { label: 'Overdue', value: money(summary.overdueAmount), hint: `${summary.overdue.length} invoices past their due date` },
      ]}/>
      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-card"><h2 className="font-bold text-lg">Monthly Revenue Dynamics</h2><p className="text-sm text-slate-500 mt-1">{DEMO_MONTH}: compare invoices raised with payments received.</p>
          <div className="space-y-6 my-8">{[{ label: 'Invoiced', amount: summary.invoiced, color: 'bg-slate-800' }, { label: 'Received', amount: summary.collected, color: 'bg-[#c1f100]' }, { label: 'Outstanding', amount: summary.outstanding, color: 'bg-amber-400' }].map(row => <div key={row.label}><div className="flex justify-between gap-3 text-sm mb-2"><span>{row.label}</span><strong>{money(row.amount)}</strong></div><div className="h-4 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${summary.invoiced ? row.amount / summary.invoiced * 100 : 0}%` }}/></div></div>)}</div>
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-4">Invoiced = payments received + outstanding. Revenue shown here is cash received; tax is included in invoice amounts.</p>
        </section>
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-card"><h2 className="font-bold text-lg">Payment methods</h2><p className="text-sm text-slate-500 mt-1">Familiar ways your customers pay.</p><div className="mt-6 space-y-5">{channels.map(channel => <div key={channel.method} className="flex justify-between text-sm gap-2"><span>{channel.method}</span><strong>{money(channel.total)}</strong></div>)}</div><div className="mt-6 border-t pt-4 text-xs text-slate-500">All sample payments are manually recorded. No payment gateway is connected.</div></section>
      </div>
      <div className="grid lg:grid-cols-2 gap-5"><section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card"><div className="flex justify-between items-center"><h2 className="font-bold text-lg">Overdue invoices</h2><button onClick={() => onNavigateTab('receivables')} className="text-xs font-bold flex gap-1 items-center">View All <ArrowUpRight size={14}/></button></div><div className="divide-y divide-slate-100 mt-3">{summary.overdue.map(invoice => <button key={invoice.id} onClick={() => onSelectInvoice(invoice.id)} className="w-full py-4 text-left flex flex-wrap justify-between gap-2"><span><strong className="block text-sm">{invoice.customerName}</strong><span className="text-xs text-slate-500">{invoice.id} • {invoice.overdueDays} days overdue</span></span><strong className="text-rose-600 text-sm">{money(invoice.balanceDue)}</strong></button>)}</div></section>
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card"><h2 className="font-bold text-lg">Monthly recurring revenue</h2><p className="text-3xl font-extrabold mt-5">{money(mrr)}<span className="text-sm text-slate-500 font-normal"> / month</span></p><p className="text-sm text-slate-500 mt-3">Active plan prices before discounts and GST. Annual plans are divided by 12; draft, quotation and paused plans are excluded.</p><p className="text-sm mt-4"><strong>{active.filter(sub => sub.cadence === 'Monthly').length}</strong> monthly plans + <strong>{active.filter(sub => sub.cadence === 'Annual').length}</strong> annual plan.</p><button onClick={() => onNavigateTab('subscriptions')} className="mt-5 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold">View Subscriptions</button></section></div>
    </> : <section className="bg-white border rounded-3xl p-6"><h2 className="font-bold text-lg">Your workspace</h2><p className="text-sm text-slate-500 mt-2">Open your permitted modules from the sidebar. Financial summaries are available to users with reporting permission.</p><div className="flex gap-3 mt-5">{can(me?.permissions ?? [], 'products.view') && <button onClick={() => onNavigateTab('products')} className="flex gap-2 text-sm font-bold"><Receipt size={16}/>Products</button>}{can(me?.permissions ?? [], 'subscriptions.view') && <button onClick={() => onNavigateTab('subscriptions')} className="flex gap-2 text-sm font-bold"><Repeat size={16}/>Subscriptions</button>}</div></section>}
  </div>;
}
