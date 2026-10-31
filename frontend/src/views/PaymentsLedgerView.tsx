import React, { useState } from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  RotateCw, 
  Plus, 
  Check, 
  ArrowUpRight, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { PaymentEntry } from '../types';

interface PaymentsLedgerViewProps {
  payments: PaymentEntry[];
  onOpenRecordPayment: () => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const PaymentsLedgerView: React.FC<PaymentsLedgerViewProps> = ({
  payments,
  onOpenRecordPayment,
  onSelectInvoice
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
              V1.8-LEDGER
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Payments Ledger & Settlement Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable transaction journal, multi-gateway reconciliation (Stripe, Adyen, ACH, UPI, Wire), and Automated audit trail.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => alert('Exporting Journal CSV...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Report Journal CSV</span>
          </button>
          <button 
            onClick={() => alert('Batch reconciling 178 settlements... Done! 100% gateway parity.')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Batch Reconcile</span>
          </button>
          <button 
            onClick={onOpenRecordPayment}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Settled */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Total Settled (MTD)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $446,120
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">+22.4% MoM</span>
            <span className="text-slate-400 font-mono">across 178 txns</span>
          </div>
        </div>

        {/* Metric 2: Gateway Success Rate */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Gateway Success Rate</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              99.4%
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Avg capture latency: <span className="font-bold font-mono text-emerald-600">142ms</span></span>
            <span className="text-[10px] text-emerald-700 font-bold">Operational</span>
          </div>
        </div>

        {/* Metric 3: Pending Reconciliation */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Pending Reconciliation</span>
              <RotateCw className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $8,450
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>3 manual wires</span>
            <span className="text-slate-400">awaiting bank match</span>
          </div>
        </div>

        {/* Metric 4: Reversals & Refunds */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Reversals & Refunds</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              $1,250
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-rose-600 font-semibold">2 chargebacks resolved</span>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">Synchronized</span>
          </div>
        </div>
      </div>

      {/* Immutable Ledger Entries Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Immutable Ledger Entries</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              178 Records
            </span>
          </div>
          <span className="text-xs text-emerald-600 font-mono flex items-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Real-time zero-tamper checksum
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                <th className="pb-3">Payment ID & Date</th>
                <th className="pb-3">Invoice Ref</th>
                <th className="pb-3">Customer Entity</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3 text-right">Amount Settled</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 whitespace-nowrap">
                    <div className="font-mono font-bold text-slate-900">{p.id}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.date}</div>
                  </td>
                  <td className="py-4 whitespace-nowrap">
                    <button
                      onClick={() => onSelectInvoice(p.invoiceRef)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 font-mono text-[11px] font-bold text-slate-800 transition-colors"
                    >
                      <span>{p.invoiceRef}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                  <td className="py-4">
                    <div className="font-bold text-slate-900">{p.customerName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.planTier}</div>
                  </td>
                  <td className="py-4 font-medium text-slate-700 whitespace-nowrap">
                    {p.paymentMethod}
                  </td>
                  <td className="py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-sm">
                    {formatCurrency(p.amountSettled)}
                  </td>
                  <td className="py-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{p.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs text-slate-500 font-mono">
          <div>
            Indexed on <span className="text-slate-800 font-bold">payments(invoice_id)</span> • Query Latency: <span className="text-emerald-700 font-bold">21ms</span>
          </div>
          <div>Showing 1 - 5 of 178</div>
        </div>
      </div>
    </div>
  );
};
