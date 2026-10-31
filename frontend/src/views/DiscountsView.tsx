import { demoNotice } from '../mock/demo';
import React, { useState } from 'react';
import { 
  Percent, 
  Plus, 
  Download, 
  Clock, 
  CheckCircle2, 
  Sliders, 
  RotateCw, 
  AlertCircle, 
  ShieldCheck, 
  Search, 
  Sparkles,
  Zap,
  BarChart3
} from 'lucide-react';
import { DiscountRule } from '../types';

interface DiscountsViewProps {
  discounts: DiscountRule[];
  onUpdateDiscount: (rule: DiscountRule) => void;
  onAddDiscount: (rule: DiscountRule) => void;
}

export const DiscountsView: React.FC<DiscountsViewProps> = ({
  discounts: initialDiscounts,
  onUpdateDiscount,
  onAddDiscount
}) => {
  const [discounts, setDiscounts] = useState<DiscountRule[]>(initialDiscounts);
  const [selectedRule, setSelectedRule] = useState<DiscountRule>(initialDiscounts[0]);

  // Form State
  const [ruleName, setRuleName] = useState(initialDiscounts[0].name);
  const [code, setCode] = useState(initialDiscounts[0].code);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(initialDiscounts[0].type);
  const [value, setValue] = useState(initialDiscounts[0].value);
  const [limit, setLimit] = useState(initialDiscounts[0].usageLimit);
  const [minSubtotal, setMinSubtotal] = useState(initialDiscounts[0].minSubtotal);
  const [scope, setScope] = useState(initialDiscounts[0].targetScope);
  const [startDate, setStartDate] = useState(initialDiscounts[0].startDate);
  const [endDate, setEndDate] = useState(initialDiscounts[0].endDate);

  const handleSelectRule = (r: DiscountRule) => {
    setSelectedRule(r);
    setRuleName(r.name);
    setCode(r.code);
    setDiscountType(r.type);
    setValue(r.value);
    setLimit(r.usageLimit);
    setMinSubtotal(r.minSubtotal);
    setScope(r.targetScope);
    setStartDate(r.startDate);
    setEndDate(r.endDate);
  };

  const handleSaveRule = () => {
    const updated: DiscountRule = {
      ...selectedRule,
      name: ruleName,
      code,
      type: discountType,
      value: Number(value),
      usageLimit: Number(limit),
      minSubtotal: Number(minSubtotal),
      targetScope: scope,
      startDate,
      endDate
    };
    const next = discounts.map(d => d.id === updated.id ? updated : d);
    setDiscounts(next);
    onUpdateDiscount(updated);
    demoNotice(`Promotion rule ${code} updated and updated in the local demo list.`);
  };

  const handleTestRun = () => {
    demoNotice(`[Simulation Test Run]\nTesting coupon: ${code}\nEligible: YES\nSubtotal: $2,500.00\nDiscount: ${discountType === 'percentage' ? `${value}% (-$${(2500 * value / 100).toFixed(2)})` : `$${value}.00`}\nStatus: Passing Atomic DB Lock Invariant.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              REV OPS POLICY ENGINE • ACTIVE_INVARIANTS: OK
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Discounts & Promotional Rules Engine
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated coupon rules, atomic usage counters, stackability policies, and line-item promotions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => demoNotice('Exporting Discounts Registry CSV...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => {
              const newD: DiscountRule = {
                id: `disc-${Date.now()}`,
                name: 'New Custom Offer',
                code: `PROMO-${Math.floor(Math.random() * 900) + 100}`,
                type: 'percentage',
                value: 10,
                appliesTo: 'Whole subscription',
                window: 'Valid 30 days',
                daysLeft: 30,
                usageCount: 0,
                usageLimit: 250,
                minSubtotal: 200,
                targetScope: 'Whole Subscription Subtotal',
                startDate: '2026-03-01',
                endDate: '2026-03-31',
                status: 'Active'
              };
              setDiscounts([...discounts, newD]);
              handleSelectRule(newD);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Discount Rule</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Rules</span>
              <Percent className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              8 <span className="text-xs font-normal text-slate-500 font-sans">Active</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-emerald-600 font-semibold font-mono">
            +$38,420 promo savings MTD
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Total Redemptions</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              1,429 <span className="text-xs font-normal text-slate-500 font-sans">Uses</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>84% of total active capacity</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Budget Utilization</span>
              <span className="font-mono text-slate-400 text-xs font-normal">/ $60,000</span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $42,150
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>70.2% burn rate</span>
            <span className="font-bold text-emerald-600 font-mono">$17,850 left</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Expiring / Exhausted</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-amber-600 tracking-tight mt-3">
              3 <span className="text-xs font-normal text-slate-500 font-sans">Rules</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            2 expiring this week, 1 cap reached
          </div>
        </div>
      </div>

      {/* Split View: Rules Registry & Rule Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Rules Registry Table (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Rules Registry</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                  {discounts.length} total
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Policy: GREEDY_SINGLE_HIGHEST</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                    <th className="pb-3">Rule & Code</th>
                    <th className="pb-3">Type / Value</th>
                    <th className="pb-3">Applies To</th>
                    <th className="pb-3">Window</th>
                    <th className="pb-3 text-center">Counter</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((d) => {
                    const isSelected = selectedRule.id === d.id;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => handleSelectRule(d)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50/70 border-l-4 border-l-[#c1f100]' : ''
                        }`}
                      >
                        <td className="py-4 pr-3">
                          <div className="font-bold text-slate-900">{d.name}</div>
                          <div className="font-mono text-[10px] font-bold text-slate-600 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                            {d.code}
                          </div>
                        </td>
                        <td className="py-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 text-sm">
                            {d.type === 'percentage' ? `${d.value}% off` : `$${d.value}.00 credit`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {d.type === 'percentage' ? 'Perpetual Tier' : 'Fixed discount'}
                          </div>
                        </td>
                        <td className="py-4 text-slate-600 text-[11px]">
                          {d.appliesTo}
                        </td>
                        <td className="py-4 whitespace-nowrap text-slate-500 text-[11px]">
                          <div>{d.window}</div>
                        </td>
                        <td className="py-4 text-center whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">
                            {d.usageCount} / {d.usageLimit}
                          </div>
                          <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${d.usageCount >= d.usageLimit ? 'bg-rose-500' : 'bg-[#c1f100]'}`}
                              style={{ width: `${Math.min(100, (d.usageCount / d.usageLimit) * 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-4 text-center whitespace-nowrap">
                          {d.status === 'Active' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Active
                            </span>
                          )}
                          {d.status === 'Exhausted' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              Exhausted
                            </span>
                          )}
                          {d.status === 'Scheduled' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                              Scheduled
                            </span>
                          )}
                          {d.status === 'Expired' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-medium">
                              Expired
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Redemption Velocity Bar Chart (Last 7 Days) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Redemption Velocity (Last 7 Days)</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Aggregation: Daily</span>
            </div>

            <div className="flex items-end justify-between gap-3 h-32 pt-2">
              {[
                { day: 'Mon', count: 142 },
                { day: 'Tue', count: 198 },
                { day: 'Wed', count: 256 },
                { day: 'Thu', count: 312, peak: true },
                { day: 'Fri', count: 185 },
                { day: 'Sat', count: 92 },
                { day: 'Sun', count: 74 }
              ].map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-600">{item.count}</span>
                  <div className="w-full flex items-end justify-center h-20">
                    <div
                      className={`w-full max-w-[36px] rounded-t-xl transition-all ${
                        item.peak ? 'bg-[#c1f100]' : 'bg-slate-200'
                      }`}
                      style={{ height: `${(item.count / 350) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Dark Rule Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[#c1f100]" />
                  <span>Rule Inspector</span>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[#c1f100] text-[10px] font-mono font-bold">
                SIMULATION
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">RULE NAME</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">COUPON CODE</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[#c1f100] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">TYPE TOGGLE</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`py-1 rounded-lg font-bold text-xs transition-all ${
                        discountType === 'percentage'
                          ? 'bg-[#c1f100] text-[#171c20]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`py-1 rounded-lg font-bold text-xs transition-all ${
                        discountType === 'fixed'
                          ? 'bg-[#c1f100] text-[#171c20]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      $ Fixed
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">VALUE AMOUNT</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {discountType === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">USAGE LIMIT</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">MIN SUBTOTAL</label>
                  <input
                    type="number"
                    value={minSubtotal}
                    onChange={(e) => setMinSubtotal(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">MIN QUANTITY</label>
                  <input
                    type="number"
                    defaultValue={1}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">TARGET SCOPE</label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                >
                  <option value="Whole Subscription Subtotal">Whole Subscription Subtotal</option>
                  <option value="Specific Line Items">Specific Line Items</option>
                  <option value="First Invoice Cycle Only">First Invoice Cycle Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">START DATE</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">END DATE</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="flex-1 py-2.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] font-extrabold text-xs shadow-md glow-kinetic transition-all cursor-pointer active:scale-95"
                >
                  Save Ruleset
                </button>
                <button
                  type="button"
                  onClick={handleTestRun}
                  className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Test Run
                </button>
              </div>
            </div>
          </div>

          {/* Atomic Locking Guarantee & Best Single Discount Policy */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-card space-y-3 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Atomic Locking Guarantee</div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-mono">
                  Server invariant: Engine enforces atomic DB locks via UPDATE usages WHERE used &lt; limit to eliminate race condition over-redemption in concurrent billing batches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
