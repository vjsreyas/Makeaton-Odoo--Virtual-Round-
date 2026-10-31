import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Send, 
  Search, 
  Filter, 
  ShieldAlert, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ReceivablesAccount } from '../types';

interface ReceivablesViewProps {
  accounts: ReceivablesAccount[];
  onSelectInvoice: (invoiceId: string) => void;
}

export const ReceivablesView: React.FC<ReceivablesViewProps> = ({
  accounts: initialAccounts,
  onSelectInvoice
}) => {
  const [accounts, setAccounts] = useState<ReceivablesAccount[]>(initialAccounts);
  const [filterMode, setFilterMode] = useState<'All' | 'OverdueOnly'>('OverdueOnly');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchedList, setDispatchedList] = useState<string[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  const handleTriggerDunning = (acc: ReceivablesAccount) => {
    setDispatchedList(prev => [...prev, acc.id]);
    alert(`Triggered Dunning escalation notice for ${acc.customerName} (${acc.dunningStage}).`);
  };

  const filteredAccounts = accounts.filter(acc => {
    if (filterMode === 'OverdueOnly' && acc.agingBucket === 'Current') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!acc.customerName.toLowerCase().includes(q) && !acc.invoiceRef.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Outstanding & Overdue Receivables
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dunning lifecycle automation, aging bucket stratification, and automated overdue escalations across contract balances.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => alert('Exporting Receivables aging report...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Report CSV</span>
          </button>
          <button 
            onClick={() => alert('Next automated dunning batch cycle scheduled for 23:59 UTC.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e232d] hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-[#c1f100]" />
            <span>Schedule Dunning Run</span>
          </button>
          <button 
            onClick={() => alert('Dispatched reminder ping to all 14 overdue accounts.')}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Bulk Remind Overdue</span>
          </button>
        </div>
      </div>

      {/* 5 Stratified Aging Bucket Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Bucket 1: Not Due */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>BUCKET 01</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">Pre-billing OK</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-2">Not Due (Current)</div>
            <div className="text-2xl font-extrabold text-[#171c20] tracking-tight mt-1 font-mono">
              $53,900.00
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>74 Invoices</span>
            <span className="font-mono text-slate-400">Due: 1-30d</span>
          </div>
        </div>

        {/* Bucket 2: 1-30 Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>BUCKET 02</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">Mild Overdue</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-2">1-30 Days Overdue</div>
            <div className="text-2xl font-extrabold text-amber-600 tracking-tight mt-1 font-mono">
              $9,420.00
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>6 Invoices</span>
            <span className="text-amber-700 font-semibold font-mono">Dunning Tier 1</span>
          </div>
        </div>

        {/* Bucket 3: 31-60 Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>BUCKET 03</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">Throttled</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-2">31-60 Days Overdue</div>
            <div className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1 font-mono">
              $6,850.00
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>4 Invoices</span>
            <span className="text-rose-700 font-semibold font-mono">Dunning Tier 2</span>
          </div>
        </div>

        {/* Bucket 4: 61-90 Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>BUCKET 04</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 font-bold">Urgent Legal</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-2">61-90 Days Overdue</div>
            <div className="text-2xl font-extrabold text-rose-700 tracking-tight mt-1 font-mono">
              $2,150.00
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>2 Invoices</span>
            <span className="text-rose-800 font-bold font-mono">Escalation III</span>
          </div>
        </div>

        {/* Bucket 5: 90+ Days */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>BUCKET 05</span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">Zero Default</span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-2">90+ Days (Default Risk)</div>
            <div className="text-2xl font-extrabold text-slate-400 tracking-tight mt-1 font-mono">
              $0.00
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>0 Invoices</span>
            <span className="font-mono">Bad debt $0</span>
          </div>
        </div>
      </div>

      {/* Master Dark Stratified Banner */}
      <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              TOTAL STRATIFIED PORTFOLIO
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight mt-1 font-mono">
              $72,320.00
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              OVERDUE EXPOSURE
            </div>
            <div className="text-3xl font-extrabold text-[#c1f100] tracking-tight mt-1 font-mono">
              25.47% <span className="text-xs text-slate-400 font-sans font-normal">($18,420.00 at risk)</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              AUTO-RECOVERY SLA
            </div>
            <div className="text-xl font-bold text-emerald-400 tracking-tight mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" />
              <span>98.4% On Schedule</span>
            </div>
          </div>

          <div className="text-right sm:text-left lg:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              NEXT DUNNING CYCLE
            </div>
            <div className="text-lg font-mono font-bold text-slate-300 mt-2 flex items-center gap-1.5 lg:justify-end">
              <span className="w-2 h-2 rounded-full bg-[#c1f100] animate-pulse"></span>
              <span>3h 48m 12s</span>
            </div>
          </div>
        </div>

        {/* Stratified Breakdown Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-700/60">
          <div className="w-full h-3 rounded-full bg-slate-800 flex overflow-hidden">
            <div className="bg-slate-400 h-full" style={{ width: '74.5%' }} title="Current: 74.5%"></div>
            <div className="bg-[#c1f100] h-full" style={{ width: '13.0%' }} title="1-30d: 13.0%"></div>
            <div className="bg-amber-400 h-full" style={{ width: '9.4%' }} title="31-60d: 9.4%"></div>
            <div className="bg-rose-500 h-full" style={{ width: '3.1%' }} title="61-90d: 3.1%"></div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Current (74.5%)
            </span>
            <span className="flex items-center gap-1.5 text-white">
              <span className="w-2 h-2 rounded-full bg-[#c1f100]"></span>
              1-30d Overdue (13.0%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              31-60d Overdue (9.4%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              61-90d Legal Escalation (3.1%)
            </span>
            <span className="text-slate-500 font-mono">
              90+ Default: $0 (0.0%)
            </span>
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('All')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterMode === 'All'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Outstanding (42 • $72,320.00)
            </button>
            <button
              onClick={() => setFilterMode('OverdueOnly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterMode === 'OverdueOnly'
                  ? 'bg-[#c1f100] text-[#171c20] shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Overdue Only (14 • $18,420.00)
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by customer, invoice ID, or domain..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c1f100]"
            />
          </div>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 pl-6 pr-2 w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer" />
                </th>
                <th className="py-3.5 px-4">Customer Account & Contact</th>
                <th className="py-3.5 px-4">Invoice & Origination</th>
                <th className="py-3.5 px-4">Due Date & Terms</th>
                <th className="py-3.5 px-4 text-center">Aging Bucket</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4">Dunning Lifecycle</th>
                <th className="py-3.5 pr-6 pl-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 pl-6 pr-2">
                    <input type="checkbox" className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1e232d] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {acc.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{acc.customerName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold">
                            {acc.tierTag}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{acc.customerEmail}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      onClick={() => onSelectInvoice(acc.invoiceRef)}
                      className="font-mono font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                      <span>{acc.invoiceRef}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                    <div className="text-[11px] text-slate-400 mt-0.5">{acc.originationDate}</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className={`font-semibold ${acc.agingBucket !== 'Current' ? 'text-rose-600' : 'text-slate-800'}`}>
                      {acc.dueDate}
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {acc.agingDays && acc.agingDays > 30 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                        <span>{acc.agingDays} Days Overdue</span>
                      </span>
                    ) : acc.agingDays ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#c1f100] text-[#171c20] font-bold text-[11px]">
                        <span>{acc.agingDays} Days Overdue</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                        <span>Net Due (In 4d)</span>
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(acc.balanceDue)}
                    </div>
                    <div className="text-[10px] text-slate-400">Total: {formatCurrency(acc.totalInvoiceAmount)}</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      {acc.dunningStage.includes('Throttled') && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
                      {acc.dunningStage.includes('Retry') && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                      {acc.dunningStage.includes('Courtesy') && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                      {acc.dunningStage.includes('Scheduled') && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                      <span>{acc.dunningStage}</span>
                    </span>
                  </td>

                  <td className="py-4 pr-6 pl-4 text-center">
                    <button
                      onClick={() => handleTriggerDunning(acc)}
                      disabled={dispatchedList.includes(acc.id)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        dispatchedList.includes(acc.id)
                          ? 'bg-slate-100 text-slate-400'
                          : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      {dispatchedList.includes(acc.id) ? 'Dispatched' : 'Ping Notice'}
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
