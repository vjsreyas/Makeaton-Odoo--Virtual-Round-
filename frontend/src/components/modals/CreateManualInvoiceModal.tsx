import React, { useState } from 'react';
import { X, Receipt, Plus, Trash2 } from 'lucide-react';
import { Invoice, InvoiceLineItem } from '../../types';

interface CreateManualInvoiceModalProps {
  onClose: () => void;
  onCreateInvoice: (invoice: Invoice) => void;
}

export const CreateManualInvoiceModal: React.FC<CreateManualInvoiceModalProps> = ({
  onClose,
  onCreateInvoice
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subscriptionRef, setSubscriptionRef] = useState('#SUB-2026-000123');
  const [terms, setTerms] = useState('Manual / NET-30');
  const [lineItems, setLineItems] = useState<{ desc: string; qty: number; price: number }[]>([
    { desc: 'Custom Enterprise Professional Service Hours', qty: 20, price: 250 }
  ]);

  const addLine = () => {
    setLineItems([...lineItems, { desc: 'Platform Integration Surcharge', qty: 1, price: 1500 }]);
  };

  const removeLine = (idx: number) => {
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) return;

    const subtotal = lineItems.reduce((acc, l) => acc + (l.qty * l.price), 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    const newInv: Invoice = {
      id: `#INV-2026-009${Math.floor(Math.random() * 80) + 45}`,
      customerName,
      customerEmail,
      subscriptionRef,
      issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      dueDate: 'Nov 30, 2026',
      terms,
      billingType: 'Manual',
      totalAmount: total,
      paidAmount: 0,
      balanceDue: total,
      status: 'Confirmed',
      lineItems: lineItems.map((l, i) => ({
        id: `li-man-${i}`,
        description: l.desc,
        sku: 'MAN-SRV-01',
        quantity: l.qty,
        unitPrice: l.price,
        taxRate: 18,
        discount: 0,
        amount: l.qty * l.price
      })),
      payments: [],
      auditTrail: [
        {
          id: 'aud-man-1',
          title: 'Manual Invoice Generated',
          description: 'Created by Elena Rostova (Admin)',
          timestamp: 'Just now',
          type: 'info'
        }
      ]
    };

    onCreateInvoice(newInv);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-800" />
            <h3 className="text-base font-bold text-slate-900">Create Manual Invoice</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Global Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Billing Email *</label>
              <input
                type="email"
                required
                placeholder="billing@apex.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Subscription Ref</label>
              <input
                type="text"
                value={subscriptionRef}
                onChange={(e) => setSubscriptionRef(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Payment Terms</label>
              <select
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              >
                <option value="Manual / NET-15">Manual / NET-15</option>
                <option value="Manual / NET-30">Manual / NET-30</option>
                <option value="Manual / Due on Receipt">Manual / Due on Receipt</option>
              </select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Line Items & Billables</span>
              <button
                type="button"
                onClick={addLine}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.desc}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].desc = e.target.value;
                      setLineItems(updated);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].qty = Number(e.target.value);
                      setLineItems(updated);
                    }}
                    className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono font-bold"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].price = Number(e.target.value);
                      setLineItems(updated);
                    }}
                    className="w-24 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-right font-mono font-bold"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
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
              Seal & Dispatch Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
