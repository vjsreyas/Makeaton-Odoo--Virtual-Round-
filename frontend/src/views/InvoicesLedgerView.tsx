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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
            <span className="text-slate-500 text-xs font-mono">Real-Time Sync 0.4s ago</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Invoices Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated invoicing runs, dunning tracking, and receivables reconciliation.
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
            onClick={() => alert(`Dispatching batch notices to ${selectedInvoiceIds.length} recipients...`)}
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

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Invoiced */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Total Invoiced (MTD)</span>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $518,440.00
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Confirmed + Paid across 184 cycles
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              +10.2% vs last MTD
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              184 Valid
            </span>
          </div>
        </div>

        {/* Card 2: Collected Capital */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Collected Capital</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                86.1% Rate
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $446,120.00
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Reconciled via Stripe, ACH & Wire
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Target threshold</div>
              <div className="text-[11px] font-bold text-emerald-600">+$6,720.00</div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              Today
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding Balance */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Outstanding Balance</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $72,320.00
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Awaiting scheduled auto-debit & terms
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700">42 Unpaid Invoices</span>
            <span className="text-slate-500 font-mono">Net-30 avg: 9d Left</span>
          </div>
        </div>

        {/* Card 4: Critical Overdue (Obsidian Dark Command Container) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c1f100]/5 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Critical Overdue
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                14 Overdue
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#c1f100] tracking-tight mt-3">
              $18,420.00
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Due date passed with active balance &gt; $0
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <span className="text-[11px] text-rose-400 font-semibold">2 at Risk</span>
            <button 
              onClick={() => setOverdueOnly(true)}
              className="text-[11px] text-[#c1f100] hover:underline flex items-center gap-0.5 font-bold"
            >
              <span>Dunning Step 3</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

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
              14 Overdue Accounts
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
              This Month <span className="font-bold">(Feb 2026)</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              Amount: <span className="font-bold">$0 - $50k+</span>
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
              onClick={() => alert(`Confirmed ${selectedInvoiceIds.length} invoices.`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirm Selected</span>
            </button>
            <button 
              onClick={() => alert(`Emailing PDFs for ${selectedInvoiceIds.length} invoices...`)}
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
            Showing <span className="font-bold text-slate-800">1-{filteredInvoices.length}</span> of <span className="font-bold text-slate-800">2,410</span> invoices
            <span className="mx-2">•</span>
            <span className="font-mono text-[11px]">Server query: 28ms</span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 disabled:opacity-50 font-medium"
            >
              Previous
            </button>
            <button className="w-7 h-7 rounded-full bg-[#1e232d] text-white font-bold flex items-center justify-center text-xs">
              1
            </button>
            <button className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs hover:bg-slate-100">
              2
            </button>
            <button className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs hover:bg-slate-100">
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs hover:bg-slate-100">
              241
            </button>
            <button className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Service Reliability Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Automated Dunning Run</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#c1f100] text-[#171c20] text-[9px] font-bold">
                ACTIVE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Scheduled today at 23:59 UTC</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Payment Gateway Latency</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Stripe + Adyen Direct • <span className="font-mono text-emerald-600 font-bold">142ms Avg</span></div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Compliance & GST Audit</div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% tax checksum passed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
