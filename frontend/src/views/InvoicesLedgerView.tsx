import { money } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';
import { invoiceSummary } from '../mock/summary';
import { demoNotice } from '../mock/demo';
import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Printer, 
  Send, 
  Plus, 
  Filter, 
  RotateCcw, 
  ChevronRight, 
  Search, 
  Check, 
  X, 
  Calendar, 
  ShieldCheck, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoicesLedgerViewProps {
  invoices: Invoice[];
  onSelectInvoice: (invoiceId: string) => void;
  onCreateManualInvoice: () => void;
}

export const InvoicesLedgerView: React.FC<InvoicesLedgerViewProps> = ({
  invoices,
  onSelectInvoice,
  onCreateManualInvoice
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled'>('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(['#INV-2026-00940', '#INV-2026-00939', '#INV-2026-00938']);
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (overdueOnly && inv.status !== 'Overdue') return false;
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = inv.id.toLowerCase().includes(q);
        const matchesCustomer = inv.customerName.toLowerCase().includes(q);
        const matchesEmail = inv.customerEmail.toLowerCase().includes(q);
        const matchesSub = inv.subscriptionRef.toLowerCase().includes(q);
        if (!matchesId && !matchesCustomer && !matchesEmail && !matchesSub) return false;
      }
      return true;
    });
  }, [invoices, overdueOnly, statusFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedInvoiceIds.includes(id)) {
      setSelectedInvoiceIds(selectedInvoiceIds.filter(i => i !== id));
    } else {
      setSelectedInvoiceIds([...selectedInvoiceIds, id]);
    }
  };

  const selectedSum = useMemo(() => {
    return invoices
      .filter(i => selectedInvoiceIds.includes(i.id))
      .reduce((acc, curr) => acc + curr.balanceDue, 0);
  }, [invoices, selectedInvoiceIds]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val);
  };

  const exportCSV = () => {
    const headers = "Invoice ID,Customer,Subscription,Issue Date,Due Date,Total,Paid,Balance,Status\n";
    const rows = filteredInvoices.map(i => 
      `"${i.id}","${i.customerName}","${i.subscriptionRef}","${i.issueDate}","${i.dueDate}",${i.totalAmount},${i.paidAmount},${i.balanceDue},"${i.status}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `brightloop-invoices-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Banner and Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              LEDGER TERMINAL
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs font-mono">INR • IST</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Invoices Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            See each invoice, the amount received, and what the customer still owes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Merged PDF</span>
          </button>
          <button 
            onClick={() => demoNotice(`Dispatching batch notices to ${selectedInvoiceIds.length} recipients...`)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Selected</span>
          </button>
          <button 
            onClick={onCreateManualInvoice}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b5e300] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Manual Invoice</span>
          </button>
        </div>
      </div>

      <DemoMetrics items={[{ label: 'Invoiced this month', value: money(invoiceSummary(invoices).invoiced), hint: 'Issued invoices only; drafts excluded' },{ label: 'Payments received', value: money(invoiceSummary(invoices).collected), hint: 'Sum of the payments on these invoices' },{ label: 'Still to collect', value: money(invoiceSummary(invoices).outstanding), hint: 'Invoice total minus payments' },{ label: 'Overdue', value: money(invoiceSummary(invoices).overdueAmount), hint: 'Balance past the payment due date' }]} />
      {/* Filters and Search Bar Container */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number (INV-...), cust..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c1f100] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {(['All', 'Draft', 'Confirmed', 'Paid', 'Cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-[#1e232d] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Overdue Only Toggle */}
          <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
            <button
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                overdueOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                overdueOnly ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300'
              }`}>
                {overdueOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
              <span>Overdue Only</span>
            </button>
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">
              {invoices.filter(invoice => invoice.status === 'Overdue').length} Overdue Accounts
            </span>
          </div>
        </div>

        {/* Secondary Dropdown Filter Strip */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap text-slate-600">
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Customer: <span className="font-bold">All Entities (148)</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Plan Tier: <span className="font-bold">Enterprise & Scale</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              This Month <span className="font-bold">(Oct 2026)</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Amount: <span className="font-bold">₹0 - ₹50k+</span>
            </div>
            <button 
              onClick={() => {
                setStatusFilter('All');
                setOverdueOnly(false);
                setSearchQuery('');
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-700 px-2 py-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-[11px]">Default view: 25 / page</span>
            <button 
              onClick={exportCSV} 
              title="Export CSV"
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => window.print()} 
              title="Print Table"
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Dark Command Dock (Selected Invoices Action Bar) */}
      {selectedInvoiceIds.length > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between px-5 py-3 rounded-2xl bg-[#1e232d] text-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c1f100] animate-pulse"></span>
            <span className="text-xs font-bold text-[#c1f100]">
              {selectedInvoiceIds.length} invoices selected
            </span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-xs font-mono text-slate-300">
              Sum: <span className="font-bold text-white">{formatCurrency(selectedSum)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => demoNotice(`Confirmed ${selectedInvoiceIds.length} invoices.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirm Selected</span>
            </button>
            <button 
              onClick={() => demoNotice(`Emailing PDFs for ${selectedInvoiceIds.length} invoices...`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-[#c1f100]" />
              <span>Email PDF</span>
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Batch Print</span>
            </button>
            <button 
              onClick={() => {
                if (confirm(`Cancel draft status for selected?`)) {
                  setSelectedInvoiceIds([]);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Drafts</span>
            </button>
            <button 
              onClick={() => setSelectedInvoiceIds([])}
              className="p-1 rounded-full text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices Master Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 pl-6 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Subscription Ref</th>
                <th className="py-3.5 px-4">Issue & Due Date</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 pr-6 pl-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.map((inv) => {
                const isSelected = selectedInvoiceIds.includes(inv.id);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => onSelectInvoice(inv.id)}
                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${
                      isSelected ? 'bg-slate-50/50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-4 pl-6 pr-2" onClick={(e) => toggleSelectOne(inv.id, e)}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* Invoice ID and Terms */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                        <span>{inv.id}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {inv.terms}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{inv.customerEmail}</div>
                      {inv.customerGstPan && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{inv.customerGstPan}</div>
                      )}
                    </td>

                    {/* Subscription Ref */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                        <span className="text-slate-400">SUB</span>
                        <span>{inv.subscriptionRef.replace('#SUB-', '')}</span>
                      </span>
                    </td>

                    {/* Issue & Due Date */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{inv.issueDate}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Due: {inv.dueDate}</div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.totalAmount)}
                    </td>

                    {/* Paid */}
                    <td className="py-4 px-4 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatCurrency(inv.paidAmount)}
                    </td>

                    {/* Balance Due */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <span className={`font-mono font-bold ${
                        inv.balanceDue > 0 ? (inv.status === 'Overdue' ? 'text-rose-600' : 'text-slate-900') : 'text-slate-400'
                      }`}>
                        {formatCurrency(inv.balanceDue)}
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 pr-6 pl-4 text-center whitespace-nowrap">
                      {inv.status === 'Overdue' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          <span>Overdue ({inv.overdueDays} days)</span>
                        </span>
                      )}
                      {inv.status === 'Paid' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Paid</span>
                        </span>
                      )}
                      {inv.status === 'Confirmed' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          <span>Confirmed</span>
                        </span>
                      )}
                      {inv.status === 'Draft' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          <span>Draft</span>
                        </span>
                      )}
                      {inv.status === 'Cancelled' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-500 text-[11px] font-semibold">
                          <span>Cancelled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Server Performance Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">1-{filteredInvoices.length}</span> of <span className="font-bold text-slate-800">{invoices.length}</span> invoices
            <span className="mx-2">•</span>
            <span className="font-mono text-[11px]">Live data</span>
          </div>

          <span>Page 1 of 1 • all matching invoices shown</span>
        </div>
      </div>

      <p className="text-xs text-slate-500">INR • Amounts include the tax shown on each invoice.</p>
    </div>
  );
};
