import React, { useState } from 'react';
import type { QueuedBillingItem, BillingRunHistory } from '../types';
import { money, roundMoney } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';

interface BatchBillingRunViewProps {
  queuedItems: QueuedBillingItem[];
  historyRuns: BillingRunHistory[];
  onRunBilling: (asOf: string) => Promise<void>;
  canRun: boolean;
}

export function BatchBillingRunView({ queuedItems, historyRuns, onRunBilling, canRun }: BatchBillingRunViewProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const [busy, setBusy] = useState(false);
  const ready = queuedItems.filter(item => item.validationStatus !== 'Paused / Excluded');
  const paused = queuedItems.length - ready.length;
  const total = roundMoney(ready.reduce((sum, item) => sum + item.estimatedAmount, 0));

  async function run() {
    setBusy(true);
    try {
      await onRunBilling(asOf);
    } finally {
      setBusy(false);
    }
  }

  return <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold">Batch Billing Run & Automation</h1>
        <p className="text-sm text-slate-500 mt-2">Creates one invoice per due subscription period. Re-running never bills a period twice; failures are listed and can be retried.</p>
      </div>
      {canRun && <div className="flex items-end gap-2">
        <label className="text-xs font-bold text-slate-600">Billing date<input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="block mt-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm" /></label>
        <button className="demo-primary" disabled={busy} onClick={run}>{busy ? 'Running…' : 'Run billing'}</button>
      </div>}
    </div>
    <DemoMetrics items={[
      { label: 'Active subscriptions', value: queuedItems.length - paused, hint: 'Currently billing' },
      { label: 'Due now', value: ready.filter(item => item.billingPeriod !== '—').length, hint: 'With a billing period on or before today' },
      { label: 'Paused', value: paused, hint: 'Excluded from billing' },
      { label: 'Plan value before tax', value: money(total), hint: 'Sum of subscription lines' },
    ]} />
    <section className="bg-white rounded-3xl border border-slate-200 shadow-card p-6">
      <h2 className="font-bold text-lg">Run history</h2>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm text-left min-w-[640px]">
          <thead className="text-xs text-slate-500"><tr><th className="py-3">Run</th><th>Started</th><th>Trigger</th><th>Created</th><th>Skipped</th><th>Result</th></tr></thead>
          <tbody>
            {historyRuns.map(runRow => <tr key={runRow.id} className="border-t"><td className="py-3 font-mono">{runRow.id}</td><td>{runRow.executedAt}</td><td>{runRow.triggerMode}</td><td>{runRow.invoicesCreated}</td><td>{runRow.skipped}</td><td>{runRow.executionTime}</td></tr>)}
            {historyRuns.length === 0 && <tr><td colSpan={6} className="py-6 text-slate-500">No billing runs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
