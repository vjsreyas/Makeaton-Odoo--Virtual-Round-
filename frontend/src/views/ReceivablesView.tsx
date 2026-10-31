import { money } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';
import { demoNotice } from '../mock/demo';
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val);
  };

  const handleTriggerDunning = (acc: ReceivablesAccount) => {
    setDispatchedList(prev => [...prev, acc.id]);
    demoNotice(`Triggered payment reminder for ${acc.customerName} (${acc.agingBucket === 'Current' ? 'Not due yet' : 'Payment reminder due'}).`);
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
            See who owes you money, when it was due, and which customers need a reminder.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => demoNotice('Exporting Receivables aging report...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Report CSV</span>
          </button>
          <button 
            onClick={() => demoNotice('Next automated dunning batch cycle scheduled for 23:59 IST.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e232d] hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-[#c1f100]" />
            <span>Schedule Reminders</span>
          </button>
          <button 
            onClick={() => demoNotice('Dispatched reminder ping to all 14 overdue accounts.')}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Bulk Remind Overdue</span>
          </button>
        </div>
      </div>

      <DemoMetrics items={[{ label: 'Still to collect', value: money(accounts.reduce((sum,a) => sum+a.balanceDue,0)), hint: 'Only issued, unpaid invoices' },{ label: 'Not due yet', value: money(accounts.filter(a => a.agingBucket === 'Current').reduce((sum,a) => sum+a.balanceDue,0)), hint: 'Payment due in November' },{ label: '1–30 days overdue', value: money(accounts.filter(a => a.agingBucket === '1-30 Days').reduce((sum,a) => sum+a.balanceDue,0)), hint: 'A friendly reminder is appropriate' },{ label: 'More than 30 days overdue', value: money(accounts.filter(a => (a.agingDays ?? 0)>30).reduce((sum,a) => sum+a.balanceDue,0)), hint: 'No such invoices in this sample' }]} />
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
              All Outstanding ({accounts.length} • {money(accounts.reduce((sum,a) => sum+a.balanceDue,0))})
            </button>
            <button
              onClick={() => setFilterMode('OverdueOnly')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filterMode === 'OverdueOnly'
                  ? 'bg-[#c1f100] text-[#171c20] shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Overdue Only ({accounts.filter(a => a.agingBucket !== 'Current').length} • {money(accounts.filter(a => a.agingBucket !== 'Current').reduce((sum,a) => sum+a.balanceDue,0))})
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
                <th className="py-3.5 px-4">Reminder status</th>
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
                      <span>{acc.agingBucket === 'Current' ? 'Not due yet' : 'Payment reminder due'}</span>
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
