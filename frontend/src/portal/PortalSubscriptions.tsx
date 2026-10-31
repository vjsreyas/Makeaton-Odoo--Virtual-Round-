import React, { useState } from 'react';
import type { Rec } from '../api/business';
import { describeError } from '../api/errors';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { indiaDate, money } from '../lib/india';
import { notify } from '../lib/notify';
import { portalApi } from './portalApi';

const LABELS: Record<string, string> = { confirm: 'Accept quotation', close: 'Close subscription', pause: 'Pause subscription', resume: 'Resume subscription' };
const API_ACTION: Record<string, 'accept' | 'pause' | 'resume' | 'close' | 'reject'> = { confirm: 'accept', close: 'close', pause: 'pause', resume: 'resume' };

export function PortalSubscriptions() {
  const list = useAsync(() => portalApi.subscriptions(), []);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'quotation'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const rows = (list.data?.data ?? []).filter((r) => filter === 'all' || r.status === filter);
  const activeId = selected ?? rows[0]?.id ?? null;
  const detail = useAsync(() => (activeId ? portalApi.subscription(activeId) : Promise.resolve(null)), [activeId, list.data]);
  const sub = detail.data;

  const act = async (action: string) => {
    if (!sub) return;
    if (action === 'close' && !window.confirm(`Close subscription ${sub.number}?`)) return;
    try {
      await portalApi.subscriptionAction(sub.id, API_ACTION[action]);
      notify('Done.');
      list.reload();
      detail.reload();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#080d16] tracking-tight">My Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">Your contracted plans, billing schedule and the actions your plan allows.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'paused', 'quotation'] as const).map((f) => (
          <button key={f} type="button" onClick={() => { setFilter(f); setSelected(null); }} className={`px-4 py-1.5 rounded-full text-xs font-bold border capitalize ${filter === f ? 'bg-[#c1f100] border-[#c1f100] text-[#080d16] lime-glow-subtle' : 'bg-white border-slate-200 text-slate-600'}`}>{f === 'quotation' ? 'Quotations' : f}</button>
        ))}
      </div>
      {list.loading && !list.data ? <LoadingBlock label="Loading subscriptions" /> : list.error ? <ErrorBlock error={list.error} onRetry={list.reload} /> : rows.length === 0 ? <EmptyBlock title="No subscriptions" hint="Nothing matches this filter." /> : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            {rows.map((r) => (
              <button key={r.id} type="button" onClick={() => setSelected(r.id)} className={`w-full text-left p-4 rounded-3xl border transition ${activeId === r.id ? 'bg-[#1e232d] text-white border-slate-800 card-elevation-dark' : 'bg-white border-slate-200 card-elevation-light hover:border-slate-300'}`}>
                <div className="flex justify-between items-start gap-2"><div><div className="text-[10px] font-mono opacity-70">{r.number}</div><div className="font-bold">{r.plan_name}</div></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${activeId === r.id ? 'bg-[#c1f100] text-[#080d16]' : 'bg-slate-100 text-slate-700'}`}>{r.status}</span></div>
                <div className="mt-3 font-mono text-lg font-bold">{money(Number(r.subtotal))}<span className="text-[10px] font-normal opacity-70"> / {r.billing_interval.replace('ly', '')}</span></div>
                <div className="text-[11px] opacity-70 mt-1">{r.next_period_start ? `Next billing ${indiaDate(r.next_period_start)}` : `Ends ${indiaDate(r.expiry_date)}`}</div>
              </button>
            ))}
          </div>
          <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 card-elevation-light p-6 space-y-5">
            {detail.loading && !sub ? <LoadingBlock label="Loading details" /> : detail.error ? <ErrorBlock error={detail.error} onRetry={detail.reload} /> : sub && (
              <>
                <div className="flex flex-wrap justify-between gap-3">
                  <div><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">{sub.number}</div><h2 className="text-xl font-extrabold text-[#080d16]">{sub.plan.name}</h2></div>
                  <span className="self-start px-3 py-1 rounded-full text-xs font-bold bg-[#c1f100]/30 border border-[#c1f100] capitalize">{sub.status}</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  {[['Contract start', indiaDate(sub.start_date)], ['Contract end', indiaDate(sub.expiry_date)], ['Payment terms', `Net ${sub.payment_terms_days} days`]].map(([k, v]) => <div key={k} className="p-3 bg-[#eff4f9] rounded-2xl border border-slate-200"><div className="text-[10px] font-mono uppercase text-slate-400 font-bold">{k}</div><div className="font-bold mt-1">{v}</div></div>)}
                </div>
                {sub.quotation_valid_until && sub.status === 'quotation' && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl p-3">This quotation is valid until {indiaDate(sub.quotation_valid_until)}.</p>}
                <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-xs text-left"><thead className="bg-[#eff4f9] text-slate-500 text-[10px] uppercase font-mono"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit price</th><th className="p-3 text-right">Tax</th><th className="p-3 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{sub.lines.map((l: Rec) => <tr key={l.id}><td className="p-3 font-semibold">{l.description}</td><td className="p-3 text-right">{l.quantity}</td><td className="p-3 text-right font-mono">{money(Number(l.unit_price))}</td><td className="p-3 text-right font-mono">{Number(l.tax_rate)}%</td><td className="p-3 text-right font-mono font-bold">{money(Number(l.amount))}</td></tr>)}</tbody></table></div>
                <dl className="text-sm space-y-1 max-w-xs ml-auto">
                  <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-mono">{money(Number(sub.totals.subtotal))}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-mono">{money(Number(sub.totals.tax_total))}</dd></div>
                  <div className="flex justify-between pt-2 border-t font-bold"><dt>Per {sub.billing_interval.replace('ly', '')}</dt><dd className="font-mono">{money(Number(sub.totals.total))}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2 pt-2">
                  {sub.allowed_actions.map((a: string) => <button key={a} type="button" onClick={() => act(a)} className={`px-4 py-2 rounded-full text-xs font-bold ${a === 'confirm' || a === 'resume' ? 'bg-[#c1f100] text-[#080d16] lime-glow-subtle' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{LABELS[a]}</button>)}
                  {sub.allowed_actions.length === 0 && <p className="text-xs text-slate-500">No self-service actions are available for this subscription. Contact {sub.customer?.name ? 'your account manager' : 'the business'} for changes.</p>}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
