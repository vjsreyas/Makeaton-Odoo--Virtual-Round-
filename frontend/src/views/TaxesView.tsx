import React, { useState } from 'react';
import { 
  Landmark, 
  Plus, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Calculator, 
  Sliders, 
  Check, 
  RotateCcw,
  Zap
} from 'lucide-react';
import { TaxRegime } from '../types';

interface TaxesViewProps {
  taxRegimes: TaxRegime[];
  onUpdateRegimes: (regimes: TaxRegime[]) => void;
}

export const TaxesView: React.FC<TaxesViewProps> = ({
  taxRegimes: initialRegimes,
  onUpdateRegimes
}) => {
  const [regimes, setRegimes] = useState<TaxRegime[]>(initialRegimes);
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(initialRegimes[0]);

  // Form State
  const [name, setName] = useState(initialRegimes[0].name);
  const [rate, setRate] = useState(initialRegimes[0].rate);
  const [sacCode, setSacCode] = useState(initialRegimes[0].sacHsnCode || '998314');
  const [computationMethod, setComputationMethod] = useState<'Exclusive' | 'Inclusive'>('Exclusive');
  const [dualGstAllocation, setDualGstAllocation] = useState(true);
  const [stateNexus, setStateNexus] = useState('Karnataka (29) - Intra-state [CGST + SGST]');

  // Live Sandbox state
  const [testSubtotal, setTestSubtotal] = useState(1000.00);

  // Calculations for Sandbox
  const calculatedTax = (testSubtotal * rate) / 100;
  const splitCgst = dualGstAllocation ? calculatedTax / 2 : calculatedTax;
  const splitSgst = dualGstAllocation ? calculatedTax / 2 : 0;
  const totalPayable = testSubtotal + calculatedTax;

  const handleSelectRegime = (r: TaxRegime) => {
    setSelectedRegime(r);
    setName(r.name);
    setRate(r.rate);
    setSacCode(r.sacHsnCode || '');
    setComputationMethod(r.type === 'Inclusive' ? 'Inclusive' : 'Exclusive');
    setDualGstAllocation(r.regionalSplitRule.includes('CGST'));
  };

  const handleSaveRule = () => {
    const updated: TaxRegime = {
      ...selectedRegime,
      name,
      rate: Number(rate),
      sacHsnCode: sacCode,
      type: computationMethod === 'Inclusive' ? 'Inclusive' : 'Exclusive'
    };
    const next = regimes.map(r => r.id === updated.id ? updated : r);
    setRegimes(next);
    onUpdateRegimes(next);
    alert(`Tax regime ${name} successfully configured and sealed into ledger engine.`);
  };

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
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              ENGINE :: REVOPS CORE • SNAPSHOT ENFORCED
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Taxes & Jurisdictional Rates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous tax calculation matrix, multi-jurisdiction rate schedules (GST, VAT, Sales Tax), and immutable ledger snapshot invariants across past invoices.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => alert('Generating Tax Audit Report...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tax Audit Report</span>
          </button>
          <button 
            onClick={() => {
              const newRegime: TaxRegime = {
                id: `tx-${Date.now()}`,
                code: `TX-CUSTOM-${Math.floor(Math.random() * 900) + 100}`,
                name: 'New Custom Tax Rule',
                rate: 10.00,
                type: 'Exclusive',
                sacHsnCode: '998811',
                regionalSplitRule: 'Standard Sourcing',
                appliesScope: 'Configured accounts'
              };
              setRegimes([...regimes, newRegime]);
              handleSelectRegime(newRegime);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Tax Rate</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Active Tax Rules</span>
              <Landmark className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              6 <span className="text-xs font-normal text-slate-500 font-sans">Active Regimes</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Dual domestic & sovereign trade
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Collected Tax (MTD)</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                +14.2%
              </span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              $82,410.00
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Split: 74% GST, 19% VAT, 7% US</span>
            <span className="font-mono font-bold text-emerald-600">$11,200 remitted</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Default System Rate</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              GST 18%
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Dual CGST (9%) + SGST (9%) fallback
          </div>
        </div>

        {/* Metric 4 (Dark Obsidian Card) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Compliance Invariant</span>
              <ShieldCheck className="w-4 h-4 text-[#c1f100]" />
            </div>
            <div className="text-3xl font-extrabold text-[#c1f100] tracking-tight mt-3">
              100%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Immutable snapshots on issued invoices
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-700/60 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero mutation vulnerability</span>
          </div>
        </div>
      </div>

      {/* Split View: Tax Regimes Table & Editor + Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Regimes Table & Precedence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Configured Tax Regimes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Frontend precedence list evaluated sequentially during billing dispatch</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                {regimes.length} Active Rules
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                    <th className="pb-3">Tax Name & Description</th>
                    <th className="pb-3 text-right">Rate</th>
                    <th className="pb-3 text-center">Type</th>
                    <th className="pb-3">Regional Split Rule</th>
                    <th className="pb-3">Applies Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regimes.map((r) => {
                    const isSelected = selectedRegime.id === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => handleSelectRegime(r)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? 'bg-slate-50/70 border-l-4 border-l-[#c1f100]' : ''
                        }`}
                      >
                        <td className="py-4 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{r.name}</span>
                            {r.isDefault && (
                              <span className="px-1.5 py-0.2 rounded bg-[#c1f100] text-[#171c20] text-[9px] font-bold">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {r.code}</div>
                        </td>
                        <td className="py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {r.rate.toFixed(2)}%
                        </td>
                        <td className="py-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {r.type}
                          </span>
                        </td>
                        <td className="py-4 text-slate-600 font-mono text-[11px]">
                          {r.regionalSplitRule}
                        </td>
                        <td className="py-4 text-slate-500 text-[11px]">
                          {r.appliesScope}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Sourcing Determination */}
          <div className="p-4 rounded-3xl bg-slate-100/70 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white text-slate-700 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Dynamic Sourcing Determination</div>
                <div className="text-[11px] text-slate-500">
                  Engine applies origin place of supply for domestic shipments and customer billing jurisdiction for SaaS API licenses.
                </div>
              </div>
            </div>
            <button 
              onClick={() => alert('Opening Nexus Management ruleset...')}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-sm"
            >
              Manage Nexus Rules
            </button>
          </div>

          {/* Evaluation Precedence Algorithm */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-700" />
              <span>Evaluation Precedence Algorithm</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">STAGE 1</span>
                <div className="font-bold text-slate-900 mt-1">Customer Exemption</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Checks LUT, Reverse-Charge, or Tax Exemption Certificate on file.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">STAGE 2</span>
                <div className="font-bold text-slate-900 mt-1">Product Category</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Overrides default with category-bound codes (e.g. HSN/SAC special 5%).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">STAGE 3</span>
                <div className="font-bold text-slate-900 mt-1">State Nexus Default</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Applies standard destination territorial rate matrix with IGST/CGST split.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Tax Rule Editor & Live Sandbox (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tax Rule Editor */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tax Rule Editor</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                DRAFTING
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tax Regime Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-[#c1f100]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Rate Percentage (%)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">SAC / HSN Code</label>
                  <input
                    type="text"
                    value={sacCode}
                    onChange={(e) => setSacCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Computation Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setComputationMethod('Exclusive')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      computationMethod === 'Exclusive'
                        ? 'border-[#1e232d] bg-slate-50 font-bold text-slate-900 shadow-sm'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="font-bold">Exclusive</div>
                    <div className="text-[10px] text-slate-400">Added on top of subtotal</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setComputationMethod('Inclusive')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      computationMethod === 'Inclusive'
                        ? 'border-[#1e232d] bg-slate-50 font-bold text-slate-900 shadow-sm'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="font-bold">Inclusive</div>
                    <div className="text-[10px] text-slate-400">Extracted from gross</div>
                  </button>
                </div>
              </div>

              {/* Dual GST toggle */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Indian GST Dual Allocation</div>
                  <div className="text-[11px] text-slate-500">Split into CGST (50%) and SGST (50%)</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDualGstAllocation(!dualGstAllocation)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${dualGstAllocation ? 'bg-[#1e232d]' : 'bg-slate-300'}`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${dualGstAllocation ? 'left-5' : 'left-1'}`}></span>
                </button>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Destination State Nexus (Place of Supply)</label>
                <select
                  value={stateNexus}
                  onChange={(e) => setStateNexus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium"
                >
                  <option value="Karnataka (29) - Intra-state [CGST + SGST]">Karnataka (29) - Intra-state [CGST + SGST]</option>
                  <option value="Maharashtra (27) - Inter-state [IGST]">Maharashtra (27) - Inter-state [IGST]</option>
                  <option value="Delhi (07) - Inter-state [IGST]">Delhi (07) - Inter-state [IGST]</option>
                  <option value="International Export [LUT]">International Export [LUT]</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectRegime(selectedRegime)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Reset Form
                </button>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="flex-1 py-2 rounded-full bg-[#1e232d] hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save Rule Configuration
                </button>
              </div>
            </div>
          </div>

          {/* Live Calculation Sandbox (Dark Card with Lime Output) */}
          <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#c1f100]" />
                <h3 className="text-sm font-bold text-white">Live Calculation Sandbox</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-[#c1f100] font-bold">
                Realtime V4
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Test Subtotal Amount (USD / INR Eq.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    value={testSubtotal}
                    onChange={(e) => setTestSubtotal(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Base / Net Amount:</span>
                  <span className="font-bold text-white">{formatCurrency(testSubtotal)}</span>
                </div>
                {dualGstAllocation ? (
                  <>
                    <div className="flex justify-between text-emerald-400">
                      <span>• CGST ({(rate / 2).toFixed(1)}%):</span>
                      <span>+{formatCurrency(splitCgst)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>• SGST ({(rate / 2).toFixed(1)}%):</span>
                      <span>+{formatCurrency(splitSgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-emerald-400">
                    <span>• Tax ({rate}%):</span>
                    <span>+{formatCurrency(calculatedTax)}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-between">
                <span className="font-bold text-slate-300">Total Payable</span>
                <span className="text-2xl font-black font-mono text-[#c1f100]">
                  {formatCurrency(totalPayable)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
