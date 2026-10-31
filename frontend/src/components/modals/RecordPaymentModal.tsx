import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice, PaymentEntry } from '../../types';

interface RecordPaymentModalProps {
  invoice?: Invoice | null;
  onClose: () => void;
  onSubmitPayment: (payment: {
    invoiceId: string;
    amount: number;
    method: string;
    methodDetail: string;
  }) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  onClose,
  onSubmitPayment
}) => {
  const [invoiceId, setInvoiceId] = useState(invoice?.id || '#INV-2026-00940');
  const [amount, setAmount] = useState(invoice?.balanceDue || 30618.20);
  const [method, setMethod] = useState('Stripe ACH');
  const [methodDetail, setMethodDetail] = useState('Direct Wire Remittance (Routing **0210)');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    onSubmitPayment({
      invoiceId,
      amount: Number(amount),
      method,
      methodDetail
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-800" />
            <h3 className="text-base font-bold text-slate-900">Record Payment Settlement</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1">Target Invoice ID</label>
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Settlement Amount ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900"
              >
                <option value="Stripe ACH">Stripe ACH</option>
                <option value="Stripe Card">Stripe Card</option>
                <option value="ACH Direct">ACH Direct</option>
                <option value="Bank Wire">Bank Wire</option>
                <option value="Wire Remittance">Wire Remittance</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">Gateway Details / Reference Notes</label>
            <input
              type="text"
              value={methodDetail}
              onChange={(e) => setMethodDetail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Immutable ledger entry will generate instant cryptographic audit trail stamp.</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-slate-500 font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] font-extrabold shadow-md glow-kinetic transition-all active:scale-95 cursor-pointer"
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
