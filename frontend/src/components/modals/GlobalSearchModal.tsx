import { money } from '../../lib/india';
import React, { useState, useEffect } from 'react';
import { Search, X, Receipt, Repeat, Package, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { Invoice, Subscription, ProductItem, NavigationTab } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  subscriptions: Subscription[];
  products: ProductItem[];
  onSelectInvoice: (id: string) => void;
  onNavigateTab: (tab: NavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  invoices,
  subscriptions,
  products,
  onSelectInvoice,
  onNavigateTab
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingInvoices = invoices.filter(i => 
    !q || i.id.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q)
  ).slice(0, 4);

  const matchingSubs = subscriptions.filter(s => 
    !q || s.id.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q)
  ).slice(0, 4);

  const matchingProds = products.filter(p => 
    !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  ).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subscriptions, invoices, customers, rules... (Esc to close)"
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c1f100]"
          />
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-4 pt-2">
          {/* Invoices Group */}
          {matchingInvoices.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices</span>
              </div>
              {matchingInvoices.map(inv => (
                <div
                  key={inv.id}
                  onClick={() => {
                    onSelectInvoice(inv.id);
                    onClose();
                  }}
                  className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900">{inv.id} • {inv.customerName}</div>
                    <div className="text-[11px] text-slate-400">{inv.terms} • Due {inv.dueDate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{money(inv.balanceDue)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subscriptions Group */}
          {matchingSubs.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5" />
                <span>Subscriptions</span>
              </div>
              {matchingSubs.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => {
                    onNavigateTab('subscriptions');
                    onClose();
                  }}
                  className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900">{sub.id} • {sub.customerName}</div>
                    <div className="text-[11px] text-slate-400">{sub.planName} • {sub.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{money(sub.cadenceValue)}/{sub.cadence === 'Annual' ? 'yr' : 'mo'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products Group */}
          {matchingProds.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Products & SKUs</span>
              </div>
              {matchingProds.map(prod => (
                <div
                  key={prod.id}
                  onClick={() => {
                    onNavigateTab('products');
                    onClose();
                  }}
                  className="p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900">{prod.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">SKU: {prod.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{money(prod.salesBasePrice)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Click a result to open it</span>
          <span className="font-mono">Brightloop</span>
        </div>
      </div>
    </div>
  );
};
