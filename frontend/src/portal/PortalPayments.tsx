import React from 'react';
import type { Rec } from '../api/business';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { indiaDate, money } from '../lib/india';
import { portalApi } from './portalApi';

export function PortalPayments({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const list = useAsync(() => portalApi.payments(), []);
  const rows = list.data?.data ?? [];
  const total = rows.filter((p: Rec) => p.status === 'recorded').reduce((s: number, p: Rec) => s + Number(p.amount), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#080d16] tracking-tight">Payments & History</h1>
        <p className="text-sm text-slate-500 mt-1">Payments the business has recorded against your invoices.</p>
      </div>
      <div className="bg-[#1e232d] text-white rounded-3xl p-6 card-elevation-dark max-w-sm"><div className="text-[10px] font-mono uppercase text-[#c1f100] font-bold">Total paid</div><div className="text-3xl font-extrabold font-mono mt-2">{money(total)}</div><p className="text-xs text-slate-300 mt-2">{rows.filter((p: Rec) => p.status === 'recorded').length} recorded payments</p></div>
      <div className="bg-white rounded-3xl border border-slate-200 card-elevation-light overflow-hidden">
        {list.loading && !list.data ? <LoadingBlock label="Loading payments" /> : list.error ? <div className="p-6"><ErrorBlock error={list.error} onRetry={list.reload} /></div> : rows.length === 0 ? <EmptyBlock title="No payments yet" hint="Payments appear here after the business records them." /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs text-left min-w-[560px]">
            <thead className="bg-[#eff4f9] text-slate-500 text-[10px] uppercase font-mono"><tr><th className="p-4">Date</th><th className="p-4">Invoice</th><th className="p-4">Method</th><th className="p-4">Reference</th><th className="p-4">Status</th><th className="p-4 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((p: Rec) => <tr key={p.id} className="hover:bg-slate-50"><td className="p-4">{indiaDate(p.paid_on)}</td><td className="p-4"><button type="button" onClick={() => onOpenInvoice(p.invoice_id)} className="font-mono font-bold hover:underline">{p.invoice_number}</button></td><td className="p-4 capitalize">{String(p.method).replace('_', ' ')}</td><td className="p-4 font-mono">{p.reference ?? '—'}</td><td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${p.status === 'recorded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{p.status === 'recorded' ? 'Settled' : 'Voided'}</span></td><td className="p-4 text-right font-mono font-bold">{money(Number(p.amount))}</td></tr>)}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
