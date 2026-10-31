import { demoNotice } from '../mock/demo';
import React, { useState } from 'react';
import { 
  TrendingUp, 
  Repeat, 
  CreditCard, 
  Receipt, 
  AlertTriangle, 
  Download, 
  ArrowUpRight, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { NavigationTab } from '../types';

interface DashboardViewProps {
  onNavigateTab: (tab: NavigationTab) => void;
  onSelectInvoice: (invoiceId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onSelectInvoice
}) => {
  const [scope, setScope] = useState<'This Month' | 'Last Month' | 'Quarter' | 'Custom'>('This Month');
  const [remindedList, setRemindedList] = useState<string[]>([]);

  const handleRemind = (id: string, name: string) => {
    setRemindedList(prev => [...prev, id]);
    demoNotice(`Dunning Courtesy Notice dispatched to ${name}.`);
  };

  const revenueBars = [
    { month: 'NOV', invoiced: 340, target: 330 },
    { month: 'DEC', invoiced: 370, target: 360 },
    { month: 'JAN', invoiced: 410, target: 400 },
    { month: 'FEB', invoiced: 430, target: 420 },
    { month: 'MAR', invoiced: 460, target: 450 },
    { month: 'APR', invoiced: 470, target: 460 },
    { month: 'MAY', invoiced: 490, target: 480 },
    { month: 'JUN', invoiced: 500, target: 490 },
    { month: 'JUL', invoiced: 510, target: 500 },
    { month: 'AUG', invoiced: 520, target: 510, current: true },
    { month: 'SEP', invoiced: 540, target: 530, current: true },
    { month: 'OCT', invoiced: 560, target: 550, isTarget: true }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Top Filter Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200/80 rounded-full p-1 shadow-sm">
            {(['This Month', 'Last Month', 'Quarter', 'Custom'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setScope(tab)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  scope === tab
                    ? 'bg-[#1e232d] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm">
            All Plans (42 active)
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm">
            All Products (14 modules)
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs font-medium text-slate-700 shadow-sm">
            All Customers (940 accounts)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-full">
            <button className="px-3 py-1 rounded-full bg-[#c1f100] text-[#171c20] text-xs font-bold shadow-sm">
              Summary
            </button>
            <button 
              onClick={() => onNavigateTab('invoices')}
              className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Flat Table
            </button>
          </div>
          <button 
            onClick={() => demoNotice('Exporting complete ledger CSV snapshot...')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Synchronized Live Tag */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Scope anchor: MTD • Oct 31, 2026 (UTC-04:00) / Currency: USD ($)</span>
        </div>
        <span className="text-emerald-700 font-bold">100% Invariant match • Ready</span>
      </div>

      {/* 6 Metric KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active Subs
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            1,842
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-emerald-600 font-bold">+12.4% MoM</span>
            <span className="text-slate-400 font-mono">Ledger</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Collected</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            $446,120
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#c1f100] w-[86%]"></div>
            </div>
            <span className="font-bold text-slate-700">86.1% rate</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Invoiced Total
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            $518,440
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-mono">
            2,410 line invoices
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Outstanding
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            $72,320
          </div>
          <div className="mt-3 text-[10px] text-slate-500 font-semibold">
            42 Open Invoices
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Overdue</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-2">
            $18,420
          </div>
          <div className="mt-3 text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-center">
            14 Triage Actions
          </div>
        </div>

        {/* Metric 6: Normalized ARR (Dark Obsidian Pill) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-5 shadow-dark-card flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Normalized ARR</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#c1f100] text-[#171c20] text-[9px] font-bold">
              Live Run
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#c1f100] mt-2">
            $482,950
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-mono">
            ARR $5.795M
          </div>
        </div>
      </div>

      {/* Mid Section: Monthly Revenue Dynamics & Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monthly Revenue Dynamics Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Monthly Revenue Dynamics</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gross billing invoice volume against projected MTD milestone envelope</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1e232d]"></span>
                  Actual Invoiced
                </span>
                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-200"></span>
                  Target MTD
                </span>
              </div>
            </div>

            {/* Custom Bar Graph */}
            <div className="mt-8 flex items-end justify-between gap-2 h-44 pt-4 border-b border-slate-100">
              {revenueBars.map((bar) => {
                const heightPercent = (bar.invoiced / 600) * 100;
                return (
                  <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                    <div className="w-full flex items-end justify-center h-36">
                      <div 
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 group-hover:opacity-90 ${
                          bar.current ? 'bg-[#1e232d]' : bar.isTarget ? 'bg-[#c1f100]' : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-800 font-semibold">
                      {bar.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Average Contract Value</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">$3,840/mo</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Trailing 12M Gross</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">$5.241M</div>
            </div>
          </div>
        </div>

        {/* Right: Subscription Breakdown & Payment Channels */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-6">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Subscription Breakdown</h3>
              <span className="text-[11px] font-mono text-slate-400">2,298 Total</span>
            </div>

            {/* Donut representation */}
            <div className="flex items-center gap-6 mt-4">
              <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Active segment 76% */}
                  <path
                    className="text-[#c1f100]"
                    strokeDasharray="76.8, 100"
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold text-slate-900 leading-none">76%</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Active</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-[#1e232d]"></span>
                    Active
                  </span>
                  <span className="font-mono font-bold text-slate-900">1,765 (76.8%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Confirmed
                  </span>
                  <span className="font-mono text-slate-700">28 (1.9%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Quotation
                  </span>
                  <span className="font-mono text-slate-700">19 (1.8%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Paused
                  </span>
                  <span className="font-mono text-slate-700">21 (1.2%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Channels Breakdown */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Channels</h4>
              <span className="text-xs font-mono font-bold text-slate-900">$446,120 Settled</span>
            </div>
            <div className="space-y-2.5 text-xs mt-2">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Stripe: ACH</span>
                  <span className="font-mono">$210,000 (47.1%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1e232d] w-[47.1%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Stripe: Card</span>
                  <span className="font-mono">$145,000 (32.5%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-[32.5%] rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Direct Bank Wire</span>
                  <span className="font-mono">$78,000 (17.5%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[17.5%] rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Overdue Invoices Triage & Upcoming Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Invoices Triage */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Overdue Invoices Triage</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  14 Needs Action
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Accounts where status=Confirmed, due_date &lt; today and balance &gt; 0</p>
            </div>
            <button
              onClick={() => onNavigateTab('receivables')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {[
              { id: '#INV-2026-0941', name: 'Axiom Dynamic Systems', days: 42, amount: 7450.00 },
              { id: '#INV-2026-0902', name: 'NexaHorizon Logistics', days: 26, amount: 4890.00 },
              { id: '#INV-2026-9114', name: 'QuantuLab Robotics Corp', days: 18, amount: 3120.00 },
              { id: '#INV-2026-9180', name: 'Spheron Telemetry Inc', days: 12, amount: 1850.00 },
              { id: '#INV-2026-9220', name: 'CloudPeak Data Systems', days: 8, amount: 1110.00 }
            ].map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div 
                  onClick={() => onSelectInvoice(item.id)}
                  className="cursor-pointer hover:opacity-80"
                >
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{item.id}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                    {item.days} Days Late
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    ${item.amount.toLocaleString()}.00
                  </span>
                  <button
                    onClick={() => handleRemind(item.id, item.name)}
                    disabled={remindedList.includes(item.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      remindedList.includes(item.id)
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm'
                    }`}
                  >
                    {remindedList.includes(item.id) ? 'Reminded' : '1-Click Remind'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Upcoming Renewals</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                  $115k Pipeline
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">38 subscriptions approaching term expiry within 30 days</p>
            </div>
            <button
              onClick={() => onNavigateTab('subscriptions')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>View Subscriptions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Vanguard Biotech Labs</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Low Risk
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Enterprise Grid SLA $48,000/yr • <span className="text-slate-400 font-mono">Expires in 4 days</span>
                </div>
              </div>
              <button 
                onClick={() => demoNotice('Dispatched 1-Click Renewal Notice')}
                className="px-3.5 py-1.5 rounded-full bg-[#1e232d] text-[#c1f100] hover:bg-slate-800 text-xs font-bold transition-all"
              >
                1-Click Renew
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Apex Quantum Media</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Semi-Active
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Growth Pro (50 seats) $32,000/yr • <span className="text-slate-400 font-mono">Expires in 14 days</span>
                </div>
              </div>
              <button 
                onClick={() => demoNotice('Reviewing contract terms...')}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all shadow-sm"
              >
                Review
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Triton Security Grid</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    Churn Risk
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Standard Infrastructure $12,720/yr • <span className="text-slate-400 font-mono">Expires in 21 days</span>
                </div>
              </div>
              <button 
                onClick={() => demoNotice('Opening retention playbook for Triton Security Grid...')}
                className="px-3 py-1.5 rounded-full bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-all shadow-sm"
              >
                Engage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
