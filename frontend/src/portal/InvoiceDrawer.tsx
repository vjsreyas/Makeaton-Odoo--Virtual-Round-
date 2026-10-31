import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import type { Rec } from '../api/business';
import { fetchText } from '../api/client';
import { describeError } from '../api/errors';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { indiaDate, money } from '../lib/india';
import { notify } from '../lib/notify';
import { portalApi } from './portalApi';

export function statusPill(invoice: Rec): { label: string; cls: string } {
  if (invoice.is_overdue) return { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (invoice.status === 'paid') return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (invoice.status === 'cancelled') return { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  return { label: 'Confirmed', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
}

export function InvoiceDrawer({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const detail = useAsync((signal) => (invoiceId ? portalApi.invoice(invoiceId) : Promise.resolve(null)), [invoiceId]);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [invoiceId, onClose]);

  if (!invoiceId) return null;
  const inv = detail.data;
  const pill = inv ? statusPill(inv) : null;

  const print = async () => {
    setPrinting(true);
    try {
      const html = await fetchText(`/portal/invoices/${invoiceId}/print`);
      window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#080d16]/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label="Invoice details" className="relative w-full max-w-xl bg-white h-full overflow-y-auto card-elevation-dark flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#dee3e8] sticky top-0 bg-white z-10">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Invoice</div>
            <h2 className="text-lg font-extrabold text-[#080d16]">{inv?.number ?? '…'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {pill && <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${pill.cls}`}>{pill.label}</span>}
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-6 space-y-6 flex-1">
          {detail.loading && !inv ? <LoadingBlock label="Loading invoice" /> : detail.error ? <ErrorBlock error={detail.error} onRetry={detail.reload} /> : inv && (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#eff4f9] rounded-2xl border border-slate-200"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Issued</div><div className="font-bold text-[#080d16] mt-1">{indiaDate(inv.issue_date)}</div></div>
                <div className="p-3 bg-[#eff4f9] rounded-2xl border border-slate-200"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Due</div><div className="font-bold text-[#080d16] mt-1">{indiaDate(inv.due_date)}{inv.is_overdue ? ` • ${inv.days_overdue}d overdue` : ''}</div></div>
                <div className="p-3 bg-[#eff4f9] rounded-2xl border border-slate-200 col-span-2"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Billing period</div><div className="font-bold text-[#080d16] mt-1">{indiaDate(inv.period_start)} – {indiaDate(inv.period_end)} • Subscription {inv.subscription_number}</div></div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#eff4f9] text-slate-500 text-[10px] uppercase font-mono"><tr><th className="p-3">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Tax</th><th className="p-3 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {inv.lines.map((l: Rec) => (
                      <tr key={l.id}><td className="p-3 font-semibold text-slate-900">{l.description}</td><td className="p-3 text-right">{l.quantity}</td><td className="p-3 text-right font-mono">{money(Number(l.unit_price))}</td><td className="p-3 text-right font-mono">{Number(l.tax_rate)}%</td><td className="p-3 text-right font-mono font-bold">{money(Number(l.line_total))}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="space-y-2 text-sm">
                {([['Subtotal', inv.subtotal, ''], ['Discount', inv.discount_total, '-'], ['Tax', inv.tax_total, ''], ['Total', inv.total, ''], ['Paid', inv.amount_paid, '']] as [string, string, string][]).map(([k, v, sign]) => (
                  <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-mono font-semibold">{sign}{money(Number(v))}</dd></div>
                ))}
                <div className="flex justify-between pt-3 border-t border-slate-200 text-base"><dt className="font-bold">Balance due</dt><dd className="font-mono font-extrabold text-[#080d16]">{money(Number(inv.balance))}</dd></div>
              </dl>
              {inv.payments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payments received</h3>
                  <div className="space-y-2">{inv.payments.map((p: Rec) => (
                    <div key={p.id} className="flex justify-between p-3 rounded-2xl bg-[#eff4f9] border border-slate-200 text-xs"><span className="capitalize font-semibold">{String(p.method).replace('_', ' ')} • {indiaDate(p.paid_on)}{p.reference ? ` • ${p.reference}` : ''}{p.status === 'voided' ? ' (voided)' : ''}</span><span className="font-mono font-bold">{money(Number(p.amount))}</span></div>
                  ))}</div>
                </div>
              )}
              <p className="text-[11px] text-slate-400 font-mono">Payments are recorded by the business after they receive your transfer. Use the invoice number as your payment reference.</p>
            </>
          )}
        </div>
        <div className="p-4 border-t border-[#dee3e8] sticky bottom-0 bg-white">
          <button type="button" onClick={print} disabled={!inv || printing} className="w-full py-2.5 rounded-full bg-[#1e232d] text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"><Printer className="w-4 h-4" /> Print / download statement</button>
        </div>
      </aside>
    </div>
  );
}
