import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { Rec } from '../api/business';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { indiaDate, money } from '../lib/india';
import { statusPill } from './InvoiceDrawer';
import { portalApi } from './portalApi';

export function PortalInvoices({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const list = useAsync(() => portalApi.invoices(), []);
  const [tab, setTab] = useState<'all' | 'overdue' | 'confirmed' | 'paid'>('all');
  const [query, setQuery] = useState('');
  const rows = (list.data?.data ?? []).filter((i: Rec) => {
    if (tab === 'overdue' && !i.is_overdue) return false;
    if (tab === 'confirmed' && !(i.status === 'confirmed' && !i.is_overdue)) return false;
    if (tab === 'paid' && i.status !== 'paid') return false;
    return !query || String(i.number).toLowerCase().includes(query.toLowerCase());
  });
  const all = list.data?.data ?? [];
  const outstanding = all.filter((i) => i.status === 'confirmed').reduce((s, i) => s + Number(i.balance), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#080d16] tracking-tight">My Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">Your billing ledger. Open an invoice for line items, payments and a printable statement.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 card-elevation-light"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Outstanding</div><div className="text-2xl font-extrabold font-mono mt-2">{money(outstanding)}</div></div>
        <div className="bg-white rounded-3xl p-5 border border-slate-200 card-elevation-light"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Invoices</div><div className="text-2xl font-extrabold font-mono mt-2">{all.length}</div></div>
        <div className="bg-[#1e232d] text-white rounded-3xl p-5 card-elevation-dark"><div className="text-[10px] font-mono uppercase text-[#c1f100] font-bold">Overdue</div><div className="text-2xl font-extrabold font-mono mt-2">{all.filter((i) => i.is_overdue).length}</div></div>
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">{(['all', 'overdue', 'confirmed', 'paid'] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-full text-xs font-bold border capitalize ${tab === t ? 'bg-[#c1f100] border-[#c1f100] text-[#080d16] lime-glow-subtle' : 'bg-white border-slate-200 text-slate-600'}`}>{t}</button>)}</div>
        <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input aria-label="Search invoices" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice number" className="pl-9 pr-4 py-2 rounded-full border border-slate-200 bg-white text-xs" /></div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 card-elevation-light overflow-hidden">
        {list.loading && !list.data ? <LoadingBlock label="Loading invoices" /> : list.error ? <div className="p-6"><ErrorBlock error={list.error} onRetry={list.reload} /></div> : rows.length === 0 ? <EmptyBlock title="No invoices found" /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs text-left min-w-[640px]">
            <thead className="bg-[#eff4f9] text-slate-500 text-[10px] uppercase font-mono"><tr><th className="p-4">Invoice</th><th className="p-4">Issued</th><th className="p-4">Due</th><th className="p-4">Status</th><th className="p-4 text-right">Total</th><th className="p-4 text-right">Balance</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((i: Rec) => { const pill = statusPill(i); return (
              <tr key={i.id} onClick={() => onOpenInvoice(i.id)} className="cursor-pointer hover:bg-slate-50"><td className="p-4 font-mono font-bold">{i.number}</td><td className="p-4">{indiaDate(i.issue_date)}</td><td className="p-4">{indiaDate(i.due_date)}</td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pill.cls}`}>{pill.label}</span></td><td className="p-4 text-right font-mono">{money(Number(i.total))}</td><td className="p-4 text-right font-mono font-bold">{money(Number(i.balance))}</td></tr>); })}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
