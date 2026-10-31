import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';
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
  const [invoiceId, setInvoiceId] = useState(invoice?.id || '');
  const [amount, setAmount] = useState(invoice?.balanceDue ?? 0);
  const [method, setMethod] = useState('NEFT');
  const [methodDetail, setMethodDetail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0 || (invoice && amount > invoice.balanceDue)) return;
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
            <h3 className="text-base font-bold text-slate-900">Record demo payment</h3>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1" htmlFor="demo-payment-invoice">Target Invoice ID</label>
            <input
              type="text"
              id="demo-payment-invoice"
              value={invoiceId}
              readOnly
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1" htmlFor="demo-payment-amount">Payment amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={invoice?.balanceDue}
                required
                id="demo-payment-amount"
              value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1" htmlFor="demo-payment-method">Payment Method</label>
              <select
                id="demo-payment-method"
              value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-900"
              >
                <option value="NEFT">NEFT</option>
                <option value="Debit Card">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="IMPS">IMPS</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1" htmlFor="demo-payment-reference">UPI / bank reference or payment note</label>
            <input
              type="text"
              id="demo-payment-reference"
              value={methodDetail}
              onChange={(e) => setMethodDetail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>This records a sample payment in this tab only. No money is transferred.</span>
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
              Record demo payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
