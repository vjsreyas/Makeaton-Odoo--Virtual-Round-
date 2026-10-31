import { money } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';
import { monthlyRevenue } from '../mock/summary';
import { demoNotice } from '../mock/demo';
import React, { useState, useMemo } from 'react';
import { 
  Repeat, 
  Plus, 
  Download, 
  FileText, 
  Search, 
  Calendar, 
  ChevronRight, 
  Check, 
  Pause, 
  RotateCw, 
  AlertCircle,
  TrendingUp,
  Clock,
  Building2,
  ExternalLink
} from 'lucide-react';
import { Subscription } from '../types';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  onSelectSubscription?: (sub: Subscription) => void;
  onOpenNewSubscription: () => void;
  onAction?: (sub: Subscription, action: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  onAction,
  onSelectSubscription,
  onOpenNewSubscription
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val);
  };

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      if (statusFilter !== 'All' && sub.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = sub.id.toLowerCase().includes(q);
        const matchesName = sub.customerName.toLowerCase().includes(q);
        const matchesPlan = sub.planName.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPlan) return false;
      }
      return true;
    });
  }, [subscriptions, statusFilter, searchQuery]);

  const selectedTotalWeight = useMemo(() => {
    return subscriptions
      .filter(s => selectedIds.includes(s.id))
      .reduce((acc, curr) => acc + curr.cadenceValue, 0);
  }, [subscriptions, selectedIds]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lifecycle management, sequence tracking, and contract renewals.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => demoNotice('Exporting Subscriptions Ledger (CSV)...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => demoNotice('Opening contract template gallery...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>From Template</span>
          </button>
          <button 
            onClick={onOpenNewSubscription}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Subscription</span>
          </button>
        </div>
      </div>

      <DemoMetrics items={[{ label: 'Active subscriptions', value: subscriptions.filter(s => s.status === 'Active').length, hint: 'Currently running customer plans' },{ label: 'Monthly recurring revenue', value: money(monthlyRevenue(subscriptions)), hint: 'Before GST; annual prices divided by 12' },{ label: 'Quotations', value: subscriptions.filter(s => s.status === 'Quotation').length, hint: 'Waiting for the customer to accept' },{ label: 'Paused subscriptions', value: subscriptions.filter(s => s.status === 'Paused').length, hint: 'No billing while paused' }]} />
      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by contract (#SUB-...) or customer name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c1f100] transition-all"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
            {(['All', 'Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === status
                    ? 'bg-[#1e232d] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              All Plans (3)
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              All Customers
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              Expiry: All dates
            </div>
          </div>

          <div className="text-slate-400 text-[11px] font-mono">
            Sort: <span className="font-semibold text-slate-700">next_billing_date</span>
          </div>
        </div>
      </div>

      {/* Floating Dark Command Pill for selected */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 flex items-center justify-between px-5 py-3 rounded-2xl bg-[#1e232d] text-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c1f100] animate-pulse"></span>
            <span className="text-xs font-bold text-[#c1f100]">
              {selectedIds.length} Subscriptions selected
            </span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-xs font-mono text-slate-300">
              {formatCurrency(selectedTotalWeight)} before GST (selected billing periods)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => subscriptions.filter(x => selectedIds.includes(x.id)).forEach(x => (x.actions ?? []).includes('pause') && onAction?.(x, 'pause'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Bulk Pause</span>
            </button>
            <button 
              onClick={() => subscriptions.filter(x => selectedIds.includes(x.id)).forEach(x => (x.actions ?? []).includes('send-quotation') && onAction?.(x, 'send-quotation'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2c3340] hover:bg-[#384152] text-xs font-semibold text-slate-200 transition-colors"
            >
              <span>Send Quotations</span>
            </button>
            <button 
              onClick={() => demoNotice()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#c1f100] text-[#171c20] text-xs font-extrabold transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Bulk Renew</span>
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 pl-6 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredSubs.length && filteredSubs.length > 0}
                    onChange={() => {
                      if (selectedIds.length === filteredSubs.length) setSelectedIds([]);
                      else setSelectedIds(filteredSubs.map(s => s.id));
                    }}
                    className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Sequence & ID</th>
                <th className="py-3.5 px-4">Customer Account</th>
                <th className="py-3.5 px-4">Plan & Tier</th>
                <th className="py-3.5 px-4">Contract Term</th>
                <th className="py-3.5 px-4">Next Billing</th>
                <th className="py-3.5 px-4 text-center">Lifecycle Status</th>
                <th className="py-3.5 px-4">Actions</th>
                <th className="py-3.5 pr-6 pl-4 text-right">Cadence / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.map((sub) => {
                const isSelected = selectedIds.includes(sub.id);
                return (
                  <tr 
                    key={sub.id}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="py-4 pl-6 pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) setSelectedIds(selectedIds.filter(id => id !== sub.id));
                          else setSelectedIds([...selectedIds, sub.id]);
                        }}
                        className="rounded border-slate-300 text-[#1e232d] focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{sub.id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-500">
                          {sub.version}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{sub.billingMode || 'Auto Incurred'}</div>
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${sub.customerLogoBg || 'bg-[#1e232d]'} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                          {sub.customerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{sub.customerName}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sub.customerDomain}</div>
                        </div>
                      </div>
                    </td>

                    {/* Plan & Tier */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{sub.planName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{sub.tier}</div>
                    </td>

                    {/* Term */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-600 font-mono">
                      {sub.contractTerm}
                    </td>

                    {/* Next Billing */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{sub.nextBillingDate}</span>
                        {sub.nextBillingInDays && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            in {sub.nextBillingInDays} days
                          </span>
                        )}
                        {sub.billingMode?.includes('Expiring') && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                            Renewal Due
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {sub.status === 'Active' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      )}
                      {sub.status === 'Confirmed' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                          <span>Confirmed</span>
                        </span>
                      )}
                      {sub.status === 'Quotation' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                          <span>Quotation</span>
                        </span>
                      )}
                      {sub.status === 'Paused' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-[11px] font-semibold">
                          <span>Paused</span>
                        </span>
                      )}
                      {sub.status === 'Draft' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          <span>Draft</span>
                        </span>
                      )}
                    </td>

                    {/* Cadence / Value */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex gap-1.5">{(sub.actions ?? []).map(action => (
                        <button key={action} onClick={() => onAction?.(sub, action)} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 capitalize">{action.replace('-', ' ')}</button>
                      ))}</div>
                    </td>
                    <td className="py-4 pr-6 pl-4 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(sub.cadenceValue)}
                      </div>
                      <div className="text-[10px] text-slate-400">/ {sub.cadence === 'Annual' ? 'year' : sub.cadence === 'Quarterly' ? 'quarter' : 'month'} before GST</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">1-{filteredSubs.length}</span> of <span className="font-bold text-slate-800">{subscriptions.length}</span> subscriptions
            <span className="mx-2">•</span>
            <span className="font-mono text-[11px]">Live data</span>
          </div>

          <span>Page 1 of 1 • all matching subscriptions shown</span>
        </div>
      </div>
    </div>
  );
};
