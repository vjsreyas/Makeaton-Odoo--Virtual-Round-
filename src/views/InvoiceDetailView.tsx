import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  X, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Shield, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  Printer, 
  FileText,
  Building,
  HelpCircle
} from 'lucide-react';
import { Invoice } from '../types';

interface InvoiceDetailViewProps {
  invoice: Invoice;
  onBack: () => void;
  onOpenRecordPayment: (invoice: Invoice) => void;
  onNavigateToSubscription: (subId: string) => void;
}

export const InvoiceDetailView: React.FC<InvoiceDetailViewProps> = ({
  invoice,
  onBack,
  onOpenRecordPayment,
  onNavigateToSubscription
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  // Calculations
  const untaxedSubtotal = invoice.lineItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
  const totalDiscount = invoice.lineItems.reduce((acc, i) => acc + (i.discount || 0), 0);
  const taxableBase = untaxedSubtotal - totalDiscount;
  const totalTax = taxableBase * 0.18; // 18% standard dual
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const grandTotal = taxableBase + totalTax;
  const paidToDate = invoice.paidAmount;
  const balanceDue = grandTotal - paidToDate;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Header / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Invoices Ledger</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-extrabold text-[#171c20] font-mono tracking-tight">
              {invoice.id}
            </h1>
            {invoice.status === 'Overdue' && (
              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Overdue ({invoice.overdueDays || 24} days)
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              Confirmed • Awaiting Payment
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => alert(`Emailing invoice ${invoice.id} to ${invoice.customerEmail}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Send via Email</span>
          </button>
          <button
            onClick={() => alert('Invoice cancellation requested for approval.')}
            className="p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm transition-all"
            title="Cancel Invoice"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenRecordPayment(invoice)}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Customer Credentials Card & Financial Terms Dark Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1e232d] text-[#c1f100] font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md">
                VR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {invoice.customerName}
                  </h2>
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center" title="Verified Customer">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {invoice.customerAddress || 'Level 4, Horizon Towers, Outer Ring Rd, Bangalore, KA, 560103'}
                </div>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                    GST IN: 27AABCV9682R1ZM
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                    PAN: AABCV9682R
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                    SEZ Export Tier 1
                  </span>
                </div>
              </div>
            </div>

            {/* Origin Subscription Link Pill */}
            <button
              onClick={() => onNavigateToSubscription(invoice.subscriptionRef)}
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
            >
              <span className="text-slate-400 text-[10px] uppercase font-mono">ORIGIN SUBSCRIPTION</span>
              <span className="font-mono font-bold text-slate-900">{invoice.subscriptionRef}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Financial Terms Card (Dark Obsidian Container) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400">Financial Terms</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                NET-15
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-[11px] text-slate-400">Issue Date</div>
                <div className="text-sm font-bold text-white mt-0.5">{invoice.issueDate}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Payment Due</div>
                <div className="text-sm font-bold text-white mt-0.5">{invoice.dueDate}</div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Cycle: <span className="font-mono text-slate-200">{invoice.cyclePeriod || 'Jan 01 - Jan 31, 2026'}</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              24d Delinquent
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Timeline & Lifecycle Stage */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1: Draft */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Draft</div>
              <div className="text-[11px] text-slate-400">Generated Feb 01, 00:00</div>
            </div>
          </div>

          {/* Step 2: Confirmed & Issued */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1e232d] text-[#c1f100] flex items-center justify-center shrink-0 ring-4 ring-slate-100">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Confirmed & Issued</div>
              <div className="text-[11px] text-slate-500 font-semibold">Due Feb 15, 2026</div>
            </div>
          </div>

          {/* Step 3: Paid in Full */}
          <div className="flex items-start gap-3 opacity-60">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Paid in Full</div>
              <div className="text-[11px] text-rose-600 font-semibold font-mono">{formatCurrency(balanceDue)} remaining</div>
            </div>
          </div>
        </div>

        {/* Immutability Seal Banner */}
        <div className="mt-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-600">
          <Shield className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold text-slate-800">Read-Only Immutable Snapshot:</span> All line metrics, pricing tiers, and tax vectors were permanently sealed at batch-generation. Subsequent price changes, customer address revisions, or subscription plan upgrades will not mutate this historical invoice record.
          </p>
        </div>
      </div>

      {/* Line Items & Entitlements */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Line Items & Entitlements</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            2 Billed Units
          </span>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                <th className="pb-3">Product & Description</th>
                <th className="pb-3">SKU / Code</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-center">Tax (GST)</th>
                <th className="pb-3 text-right">Discount</th>
                <th className="pb-3 text-right">Amount (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="font-bold text-slate-900 text-sm">{item.description}</div>
                    {item.subDescription && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.subDescription}</div>
                    )}
                  </td>
                  <td className="py-4 px-2 font-mono text-slate-600 font-medium">
                    {item.sku}
                  </td>
                  <td className="py-4 px-2 text-center font-bold text-slate-900">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-2 text-right font-mono text-slate-800">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-semibold">
                      {item.taxRate}% Dual
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right font-mono font-semibold text-emerald-600">
                    {item.discount > 0 ? (
                      <div>
                        <span>-{formatCurrency(item.discount)}</span>
                        {item.discountCode && (
                          <div className="text-[9px] text-slate-400 font-sans">{item.discountCode}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">$0.00</span>
                    )}
                  </td>
                  <td className="py-4 pl-4 text-right font-mono font-bold text-slate-900 text-sm">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Summary Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-slate-200">
          {/* Payment Instructions & Dunning Notice */}
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                Payment Instructions
              </div>
              <p className="text-slate-700 font-mono leading-relaxed">
                Wire Remittance via Swift <span className="font-bold">BRKTUS33XXX</span> • Routing <span className="font-bold">#021000021</span> • Account <span className="font-bold">981104820191</span>. Always mention invoice identifier <span className="font-bold text-slate-900">{invoice.id}</span> on bank remittance advice.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-900">Smart Dunning Policy</div>
                <div className="text-amber-800 text-[11px] mt-0.5">
                  Automated grace interval expires in 4 calendar days prior to SLA pause.
                </div>
              </div>
            </div>
          </div>

          {/* Totals Calculation Column */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Untaxed Subtotal</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(untaxedSubtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Promotional Discount (SPRING-26)</span>
              <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>CGST (9.0%)</span>
              <span className="font-mono">{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>SGST (9.0%)</span>
              <span className="font-mono">{formatCurrency(sgst)}</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Total taxes (18.0%)</span>
              <span className="font-mono text-slate-900">{formatCurrency(totalTax)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="font-mono text-base">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paid to Date</span>
              </span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(paidToDate)}</span>
            </div>

            {/* BALANCE DUE (Immediate Settlement) - Dark Obsidian Pill with Neon Lime */}
            <div className="mt-4 p-4 rounded-2xl bg-[#1e232d] text-white flex items-center justify-between shadow-dark-card">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Balance Due
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  Immediate Settlement
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-[#c1f100] tracking-tight">
                {formatCurrency(balanceDue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Payments Applied & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments Applied Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Payments Applied</h3>
            </div>
            <button
              onClick={() => onOpenRecordPayment(invoice)}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Payment</span>
            </button>
          </div>

          <div className="space-y-3">
            {invoice.payments.map((p) => (
              <div key={p.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{p.id}</div>
                  <div className="text-[11px] text-slate-400">{p.date}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{p.method}</div>
                  <div className="text-[11px] text-slate-500">{p.methodDetail}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">{formatCurrency(p.amount)}</div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Collection Progress bar */}
          <div className="pt-2">
            <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span>Collection Progress</span>
              <span className="font-mono font-bold text-slate-800">
                {((paidToDate / grandTotal) * 100).toFixed(2)}% Settled ({formatCurrency(paidToDate)} / {formatCurrency(grandTotal)})
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#c1f100] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (paidToDate / grandTotal) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Audit Trail Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Audit Trail</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {invoice.auditTrail.length} events logged
            </span>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {invoice.auditTrail.map((ev, idx) => (
              <div key={ev.id || idx} className="flex items-start gap-4 relative">
                <div className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shrink-0 z-10 ${
                  ev.type === 'success' ? 'bg-emerald-500 text-white' :
                  ev.type === 'error' ? 'bg-rose-500 text-white' :
                  ev.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-[#1e232d] text-[#c1f100]'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ev.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{ev.timestamp}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
