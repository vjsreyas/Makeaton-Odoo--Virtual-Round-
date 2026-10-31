import React, { useState } from 'react';
import { X, Repeat, Plus, CheckCircle2 } from 'lucide-react';
import { Subscription } from '../../types';

interface NewSubscriptionModalProps {
  onClose: () => void;
  onCreateSubscription: (sub: Subscription) => void;
}

export const NewSubscriptionModal: React.FC<NewSubscriptionModalProps> = ({
  onClose,
  onCreateSubscription
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerDomain, setCustomerDomain] = useState('');
  const [planName, setPlanName] = useState('Scale Enterprise Hybrid');
  const [tier, setTier] = useState('Metered (99.9%)');
  const [cadence, setCadence] = useState<'Monthly' | 'Annual' | 'Quarterly'>('Monthly');
  const [cadenceValue, setCadenceValue] = useState(12500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerDomain) return;

    const newSub: Subscription = {
      id: `#SUB-2026-000${Math.floor(Math.random() * 800) + 200}`,
      version: 'v1',
      customerName,
      customerDomain,
      customerLogoBg: 'bg-emerald-600',
      planName,
      tier,
      contractTerm: 'Mar 01, 2026 to Feb 28, 2027',
      nextBillingDate: 'Apr 01, 2026',
      nextBillingInDays: 31,
      status: 'Active',
      cadence,
      cadenceValue: Number(cadenceValue),
      billingMode: 'Auto Incurred',
      autoRenew: true,
      churnRisk: 'Low Risk'
    };

    onCreateSubscription(newSub);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-slate-800" />
            <h3 className="text-base font-bold text-slate-900">Provision New Subscription</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Customer Entity *</label>
              <input
                type="text"
                required
                placeholder="e.g. Zenith Dynamics Corp"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Domain *</label>
              <input
                type="text"
                required
                placeholder="e.g. zenithdynamics.io"
                value={customerDomain}
                onChange={(e) => setCustomerDomain(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Plan Structure</label>
              <select
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              >
                <option value="Scale Enterprise Hybrid">Scale Enterprise Hybrid</option>
                <option value="Growth Pro Metered">Growth Pro Metered</option>
                <option value="Starter Core Fixed">Starter Core Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Tier / SLA</label>
              <input
                type="text"
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Billing Cadence</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1">Cadence Base Amount ($)</label>
              <input
                type="number"
                required
                value={cadenceValue}
                onChange={(e) => setCadenceValue(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900"
              />
            </div>
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
              Initialize Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
