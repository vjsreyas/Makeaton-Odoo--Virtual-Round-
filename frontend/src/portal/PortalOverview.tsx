import React from 'react';
import { AlertTriangle, ArrowRight, Calendar, Layers, Wallet } from 'lucide-react';
import type { Rec } from '../api/business';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { indiaDate, money } from '../lib/india';
import { statusPill } from './InvoiceDrawer';
import { portalApi, type PortalRoute } from './portalApi';

export function PortalOverview({ firstName, onRoute, onOpenInvoice }: { firstName: string; onRoute: (r: PortalRoute) => void; onOpenInvoice: (id: string) => void }) {
  const summary = useAsync(() => portalApi.summary(), []);
  const subs = useAsync(() => portalApi.subscriptions(), []);
  const s = summary.data;
  const nextCharge = (subs.data?.data ?? []).filter((x) => x.status === 'active' && x.next_period_start).sort((a, b) => String(a.next_period_start).localeCompare(String(b.next_period_start)))[0];
  const overdue = (s?.recent_invoices ?? []).filter((i: Rec) => i.is_overdue);
  const overdueTotal = overdue.reduce((sum: number, i: Rec) => sum + Number(i.balance), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#c1f100]" />Workspace cockpit</span>
        <h1 className="text-3xl font-extrabold text-[#080d16] tracking-tight mt-1">Welcome, {firstName}</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">Here is the consolidated overview of your subscriptions and invoices with <strong className="text-slate-800">{s?.business?.name ?? 'your business'}</strong>.</p>
      </div>
      {summary.loading && !s ? <LoadingBlock label="Loading your overview" /> : summary.error ? <ErrorBlock error={summary.error} onRetry={summary.reload} /> : s && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 card-elevation-light flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2"><span className="text-[10px] font-mono uppercase tracking-wider font-bold">Active subscriptions</span><Layers className="w-4 h-4" /></div>
                <span className="text-3xl font-extrabold text-[#080d16]">{s.active_subscriptions}</span>
              </div>
              <button type="button" onClick={() => onRoute('subscriptions')} className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-800 hover:underline flex items-center gap-1">View subscriptions <ArrowRight className="w-3 h-3" /></button>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 card-elevation-light">
              <div className="flex items-center justify-between text-slate-400 mb-2"><span className="text-[10px] font-mono uppercase tracking-wider font-bold">Next billing date</span><Calendar className="w-4 h-4" /></div>
              <div className="text-2xl font-extrabold text-[#080d16] font-mono">{nextCharge ? indiaDate(nextCharge.next_period_start) : '—'}</div>
              <p className="text-xs text-slate-500 mt-2 font-mono">{nextCharge ? <>Est. <strong className="text-slate-800">{money(Number(nextCharge.subtotal))}</strong> before tax • {nextCharge.number}</> : 'No upcoming billing'}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200 card-elevation-light">
              <div className="flex items-center justify-between text-slate-400 mb-2"><span className="text-[10px] font-mono uppercase tracking-wider font-bold">Total outstanding</span><Wallet className="w-4 h-4" /></div>
              <div className="text-3xl font-extrabold text-[#080d16] font-mono">{money(Number(s.outstanding_balance))}</div>
              <p className="text-xs text-slate-500 mt-2">Confirmed invoices not yet fully paid</p>
            </div>
            <div className="bg-[#1e232d] text-white rounded-3xl p-5 border border-slate-800 card-elevation-dark flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#c1f100]">Action required</span><span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full">{s.overdue_invoices} overdue</span></div>
                <div className="text-3xl font-extrabold font-mono">{s.overdue_invoices ? money(overdueTotal) : money(0)}</div>
                <p className="text-xs text-slate-300 mt-2">{s.overdue_invoices ? 'Past their due date. Please arrange payment.' : 'Nothing is past due.'}</p>
              </div>
              {overdue[0] && <button type="button" onClick={() => onOpenInvoice(overdue[0].id)} className="mt-4 w-full py-2.5 bg-[#c1f100] hover:bg-[#b0de00] text-[#080d16] font-bold text-xs rounded-full flex items-center justify-center gap-1.5 lime-glow"><AlertTriangle className="w-3.5 h-3.5" /> Review {overdue[0].number}</button>}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 card-elevation-light p-6">
              <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg text-[#080d16]">Recent invoices</h2><button type="button" onClick={() => onRoute('invoices')} className="text-xs font-bold hover:underline">View all</button></div>
              {s.recent_invoices.length === 0 ? <p className="text-sm text-slate-500 py-6">No invoices yet.</p> : (
                <div className="overflow-x-auto"><table className="w-full text-xs text-left">
                  <thead className="text-[10px] uppercase font-mono text-slate-400"><tr><th className="py-2">Invoice</th><th>Due</th><th>Status</th><th className="text-right">Balance</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{s.recent_invoices.map((i: Rec) => { const pill = statusPill(i); return (
                    <tr key={i.id} onClick={() => onOpenInvoice(i.id)} className="cursor-pointer hover:bg-slate-50"><td className="py-3 font-mono font-bold">{i.number}</td><td>{indiaDate(i.due_date)}</td><td><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pill.cls}`}>{pill.label}</span></td><td className="text-right font-mono font-bold">{money(Number(i.balance))}</td></tr>); })}</tbody>
                </table></div>
              )}
            </section>
            <section className="bg-white rounded-3xl border border-slate-200 card-elevation-light p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3"><h2 className="font-bold text-lg text-[#080d16]">Recent payments</h2><button type="button" onClick={() => onRoute('payments')} className="text-xs font-bold hover:underline">History</button></div>
                {s.recent_payments.length === 0 ? <p className="text-sm text-slate-500">No payments recorded yet.</p> : s.recent_payments.map((p: Rec) => (
                  <div key={p.id} className="flex justify-between py-2 text-xs border-t border-slate-100"><span className="capitalize">{String(p.method).replace('_', ' ')} • {p.invoice_number}<span className="block text-[10px] text-slate-400">{indiaDate(p.paid_on)}</span></span><strong className="font-mono">{money(Number(p.amount))}</strong></div>
                ))}
              </div>
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">Upcoming renewals</h3>
                {s.upcoming_renewals.length === 0 ? <p className="text-xs text-slate-500">None in the next 30 days.</p> : s.upcoming_renewals.map((r: Rec) => <div key={r.id} className="flex justify-between text-xs py-1"><span className="font-mono">{r.number}</span><span>{indiaDate(r.expiry_date)}</span></div>)}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
