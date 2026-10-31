import React, { useState } from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Play, 
  AlertTriangle, 
  RotateCw, 
  FileCheck, 
  Download, 
  Layers, 
  ExternalLink, 
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QueuedBillingItem, BillingRunHistory } from '../types';

interface BatchBillingRunViewProps {
  queuedItems: QueuedBillingItem[];
  historyRuns: BillingRunHistory[];
  onExecuteBatch: (run: BillingRunHistory) => void;
}

export const BatchBillingRunView: React.FC<BatchBillingRunViewProps> = ({
  queuedItems: initialQueuedItems,
  historyRuns,
  onExecuteBatch
}) => {
  const [queuedItems, setQueuedItems] = useState<QueuedBillingItem[]>(initialQueuedItems);
  const [activeTab, setActiveTab] = useState<'Ready' | 'Warnings' | 'Excluded'>('Ready');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>(initialQueuedItems.map(q => q.id));
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [workerLogs, setWorkerLogs] = useState<string[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  const filteredItems = queuedItems.filter(item => {
    if (activeTab === 'Ready') return item.validationStatus.includes('Clean');
    if (activeTab === 'Warnings') return item.validationStatus.includes('Warning');
    if (activeTab === 'Excluded') return item.validationStatus.includes('Paused');
    return true;
  });

  const runBatchSimulation = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setProgress(5);
    setWorkerLogs(['[Init] Thread pool spawned with 8 concurrent worker routines.', '[Lock] Dual-key idempotency guard engaged (sub_id + period_start).']);

    let cur = 5;
    const interval = setInterval(() => {
      cur += 15;
      if (cur <= 95) {
        setProgress(cur);
        setWorkerLogs(prev => [
          ...prev, 
          `[Worker-${Math.floor(Math.random() * 8) + 1}] Processed batch partition chunk #${Math.ceil(cur / 15)}. Sealed hash snapshot.`
        ]);
      } else {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          setIsExecuting(false);
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });

          const newRun: BillingRunHistory = {
            id: `#RUN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
            executedAt: `${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} 00:00:01 UTC`,
            triggerMode: 'Scheduled Cron',
            evaluated: queuedItems.length,
            invoicesCreated: queuedItems.length,
            skipped: 0,
            totalVolume: 142450.00,
            executionTime: '0.78s (8-worker pool)'
          };
          onExecuteBatch(newRun);
        }, 500);
      }
    }, 180);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Banner and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-extrabold uppercase font-mono">
              v2.4
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs font-mono">14m 33s cycle pulse</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Batch Billing Run & Automation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Scheduled periodic invoicing run, idempotency engine, and manual catch-up execution.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 shadow-sm flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[10px] uppercase">RUN ANCHOR DATE</span>
            <span className="font-bold text-slate-900">March 01, 2026 (Today)</span>
          </div>
          <button 
            onClick={() => alert('Simulating dry-run with 0 write commits... All 48 records dry-run passed.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Simulate Dry Run</span>
          </button>
          <button 
            onClick={runBatchSimulation}
            disabled={isExecuting}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current stroke-none" />
            <span>{isExecuting ? 'Generating Batch...' : 'Generate Invoices Now'}</span>
          </button>
        </div>
      </div>

      {/* 4 Pre-Flight Ledger Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Pre-Flight Ledger</span>
              <FileCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              48 Subscriptions
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Ready for regeneration
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Estimated MTD Volume</span>
            <span className="text-xs font-mono font-bold text-slate-900">$142,450.00</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Idempotency Guard</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              Dual-Key Locked
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Zero double billing guarantee
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">Key:</span>
            <span className="text-slate-700 font-semibold truncate max-w-[160px]">sub_id + period_start</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Mixed-Cadence Backlog</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              0 Pending Periods
            </div>
            <div className="text-xs text-slate-500 mt-1">
              All historical cycles synchronized
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Reconciled up to:</span>
            <span className="font-mono font-semibold text-slate-800">Feb 28, 2026</span>
          </div>
        </div>

        {/* Card 4: Previous Execution (Dark Card) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400">Previous Execution</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                100% SUCCESS
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#c1f100] tracking-tight mt-3">
              184 / 184 Invoices
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Dispatched 0 internal halts
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Feb 01, 2026 Cycle</span>
            <span className="font-mono text-[#c1f100] font-bold">2.84s (100-chunk)</span>
          </div>
        </div>
      </div>

      {/* Dark Billing Engine Execution Pipeline Bar */}
      <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c1f100] text-[#171c20] flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Billing Engine Execution Pipeline</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  Thread-Safe Pool: 8 Workers
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Atomic write transactionality: Each invoice advances <span className="text-[#c1f100] font-mono">next_billing_date</span> atomically nested in 100ms interval under Postgres row locks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isExecuting 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{isExecuting ? `Running (${progress}%)` : 'Pipeline Standby By'}</span>
            </span>
          </div>
        </div>

        {/* Live Progress Bar when running */}
        {isExecuting && (
          <div className="space-y-2">
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-[#c1f100] rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="max-h-24 overflow-y-auto font-mono text-[11px] text-slate-400 space-y-1 p-2 bg-slate-900/60 rounded-xl">
              {workerLogs.map((log, i) => (
                <div key={i} className="text-emerald-400/90">{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicators Pill Strip */}
        <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">Batch Executor Ready ({queuedItems.length} queued operations)</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">Estimated Execution Duration: <span className="text-white font-bold font-mono">~0.75s</span></span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">48 Invoices Queued</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300">2 Dry-run Warnings</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300">0 Double-Bill Disapprovals</span>
          </div>
        </div>
      </div>

      {/* Upcoming Billing Queue */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upcoming Billing Queue (March 01, 2026)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Recurring periodic accounts on terms final charge issuance and payment auto-triggering</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('Ready')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'Ready'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Ready to Bill</span>
              <span className="w-2 h-2 rounded-full bg-[#c1f100]"></span>
            </button>
            <button
              onClick={() => setActiveTab('Warnings')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'Warnings'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Warnings / Review</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">2</span>
            </button>
            <button
              onClick={() => setActiveTab('Excluded')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'Excluded'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Excluded / Paused</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">1</span>
            </button>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                <th className="pb-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedQueueIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={() => {
                      if (selectedQueueIds.length === filteredItems.length) setSelectedQueueIds([]);
                      else setSelectedQueueIds(filteredItems.map(i => i.id));
                    }}
                    className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="pb-3">Subscription #</th>
                <th className="pb-3">Customer Entity & Contact</th>
                <th className="pb-3">Plan & Cadence</th>
                <th className="pb-3">Billing Period</th>
                <th className="pb-3 text-right">Est. Amount</th>
                <th className="pb-3 text-center">Validation Status</th>
                <th className="pb-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isSelected = selectedQueueIds.includes(item.id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) setSelectedQueueIds(selectedQueueIds.filter(id => id !== item.id));
                          else setSelectedQueueIds([...selectedQueueIds, item.id]);
                        }}
                        className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{item.subscriptionId}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.version}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-bold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{item.customerEmail}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-semibold text-slate-800">{item.planTier}</div>
                    </td>
                    <td className="py-4 whitespace-nowrap text-slate-600 font-mono">
                      {item.billingPeriod}
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{formatCurrency(item.estimatedAmount)}</div>
                      <div className="text-[10px] text-slate-400">{item.amountDetail}</div>
                    </td>
                    <td className="py-4 text-center whitespace-nowrap">
                      {item.validationStatus.includes('Clean') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Clean (Ready)</span>
                        </span>
                      )}
                      {item.validationStatus.includes('High Usage Spike') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Warning: High Usage</span>
                        </span>
                      )}
                      {item.validationStatus.includes('Expiring Discount') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          <span>Warning: Expiring Discount</span>
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-center">
                      <button 
                        onClick={() => alert(`Inspecting subscription ${item.subscriptionId}`)}
                        className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Floating Action Pill */}
        {selectedQueueIds.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#1e232d] text-white flex items-center justify-between shadow-dark-card">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c1f100] animate-pulse"></span>
              <span className="text-xs font-bold text-[#c1f100]">
                Selected {selectedQueueIds.length} of {queuedItems.length} subscriptions
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs text-slate-300 font-mono">
                Est. <span className="font-bold text-white">$142,450.00</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setSelectedQueueIds([])}
                className="px-3 py-1 rounded-full text-xs text-slate-400 hover:text-white"
              >
                Deselect All
              </button>
              <button 
                onClick={runBatchSimulation}
                disabled={isExecuting}
                className="px-4 py-1.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-extrabold tracking-tight transition-all active:scale-95 disabled:opacity-50"
              >
                Execute Batch Run ({selectedQueueIds.length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historical Billing Runs Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historical Billing Runs Ledger</h3>
            <p className="text-xs text-slate-400 mt-0.5">Immutable audit logs, performance timing telemetry, and JSON snapshot manifests</p>
          </div>
          <button 
            onClick={() => alert('Exporting Audit Ledger (CSV)...')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Ledger (CSV)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                <th className="pb-3">Run ID</th>
                <th className="pb-3">Executed At</th>
                <th className="pb-3">Trigger Mode</th>
                <th className="pb-3 text-center">Evaluated</th>
                <th className="pb-3 text-center">Invoices Created</th>
                <th className="pb-3 text-right">Total Volume</th>
                <th className="pb-3">Execution Time</th>
                <th className="pb-3 text-right">Log Export</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyRuns.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {run.id}
                  </td>
                  <td className="py-4 text-slate-600 whitespace-nowrap">
                    {run.executedAt}
                  </td>
                  <td className="py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {run.triggerMode}
                    </span>
                  </td>
                  <td className="py-4 text-center font-bold text-slate-900">
                    {run.evaluated}
                  </td>
                  <td className="py-4 text-center whitespace-nowrap">
                    <span className="font-bold text-emerald-600">{run.invoicesCreated} created</span>
                    {run.skipped > 0 && <span className="text-slate-400 text-[10px] ml-1">({run.skipped} skipped)</span>}
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(run.totalVolume)}
                  </td>
                  <td className="py-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {run.executionTime}
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => alert(`Exporting JSON manifest for ${run.id}`)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold"
                    >
                      JSON Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
