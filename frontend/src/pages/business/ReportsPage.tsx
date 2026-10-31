import React from 'react';
import { biz } from '../../api/business';
import { ErrorBlock, LoadingBlock } from '../../components/ui/States';
import { DemoMetrics } from '../../components/DemoMetrics';
import { useAsync } from '../../hooks';
import { money } from '../../lib/india';

export function ReportsPage() {
  const dash = useAsync(() => biz.reports.dashboard(), []);
  const revenue = useAsync(() => biz.reports.revenue(), []);
  const rec = useAsync(() => biz.reports.receivables(), []);
  const summary = useAsync(() => biz.reports.summary(), []);
  const loading = dash.loading || revenue.loading || rec.loading || summary.loading;
  const error = dash.error || revenue.error || rec.error || summary.error;
  const d = dash.data;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Financial & Invoicing Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Revenue is cash received; invoiced and outstanding figures exclude cancelled invoices.</p>
      </div>
      {loading && !d ? <LoadingBlock label="Loading reports" /> : error ? <ErrorBlock error={error} onRetry={() => { dash.reload(); revenue.reload(); rec.reload(); summary.reload(); }} /> : d && (
        <>
          <DemoMetrics items={[
            { label: 'Active subscriptions', value: d.active_subscriptions, hint: 'Currently billing' },
            { label: 'Monthly recurring revenue', value: money(Number(d.mrr)), hint: 'Active plans, before discounts and tax' },
            { label: 'Revenue collected', value: money(Number(d.revenue_collected)), hint: `${d.payments_count} recorded payments` },
            { label: 'Outstanding', value: money(Number(d.outstanding_total)), hint: `${d.overdue.count} overdue • ${money(Number(d.overdue.amount))}` },
          ]} />
          <div className="grid lg:grid-cols-2 gap-5">
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
              <h2 className="font-bold text-lg">Receivables aging</h2>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {(rec.data?.buckets ?? []).map((b: { bucket: string; count: number; amount: string }) => (
                  <div key={b.bucket} className="py-3 flex justify-between"><span>{b.bucket === 'current' ? 'Not yet due' : `${b.bucket} days overdue`} <span className="text-slate-400">({b.count})</span></span><strong>{money(Number(b.amount))}</strong></div>
                ))}
              </div>
            </section>
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
              <h2 className="font-bold text-lg">Revenue by payment method</h2>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {(revenue.data?.by_method ?? []).map((m: { method: string; count: number; amount: string }) => (
                  <div key={m.method} className="py-3 flex justify-between"><span className="capitalize">{m.method.replace('_', ' ')} <span className="text-slate-400">({m.count})</span></span><strong>{money(Number(m.amount))}</strong></div>
                ))}
                {(revenue.data?.by_method ?? []).length === 0 && <p className="py-3 text-slate-500">No payments recorded yet.</p>}
              </div>
            </section>
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
              <h2 className="font-bold text-lg">Subscriptions by status</h2>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {(summary.data?.by_status ?? []).map((s: { status: string; count: number }) => (<div key={s.status} className="py-3 flex justify-between capitalize"><span>{s.status}</span><strong>{s.count}</strong></div>))}
              </div>
            </section>
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-card">
              <h2 className="font-bold text-lg">Top customers by revenue</h2>
              <div className="mt-4 divide-y divide-slate-100 text-sm">
                {(revenue.data?.top_customers ?? []).map((c: { id: string; name: string; amount: string }) => (<div key={c.id} className="py-3 flex justify-between"><span>{c.name}</span><strong>{money(Number(c.amount))}</strong></div>))}
                {(revenue.data?.top_customers ?? []).length === 0 && <p className="py-3 text-slate-500">No revenue yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
