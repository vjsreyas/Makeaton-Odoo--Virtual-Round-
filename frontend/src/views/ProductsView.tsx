import { money } from '../lib/india';
import { DemoMetrics } from '../components/DemoMetrics';
import { demoNotice } from '../mock/demo';
import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Download, 
  CheckCircle2, 
  Sliders, 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  Search, 
  Trash2,
  Edit3
} from 'lucide-react';
import { ProductItem, ProductVariant } from '../types';

interface ProductsViewProps {
  products: ProductItem[];
  onUpdateProduct: (product: ProductItem) => void;
  onAddProduct: (product: ProductItem) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products: initialProducts,
  onUpdateProduct,
  onAddProduct
}) => {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(initialProducts[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Editable fields in configurator
  const [productName, setProductName] = useState(initialProducts[0]?.name || '');
  const [productType, setProductType] = useState(initialProducts[0]?.type || 'Software Platform');
  const [salesBasePrice, setSalesBasePrice] = useState(initialProducts[0]?.salesBasePrice || 2499.00);
  const [costPrice, setCostPrice] = useState(initialProducts[0]?.costPrice || 650.00);
  const [notes, setNotes] = useState(initialProducts[0]?.internalNotes || '');
  const [variants, setVariants] = useState<ProductVariant[]>(initialProducts[0]?.variants || []);

  const handleSelectProduct = (prod: ProductItem) => {
    setSelectedProduct(prod);
    setProductName(prod.name);
    setProductType(prod.type);
    setSalesBasePrice(prod.salesBasePrice);
    setCostPrice(prod.costPrice);
    setNotes(prod.internalNotes);
    setVariants([...prod.variants]);
  };

  const handleAddVariant = () => {
    const newV: ProductVariant = {
      id: `v-${Date.now()}`,
      attribute: 'Addon',
      value: 'Additional storage',
      extraPrice: 150.00,
      effectivePrice: salesBasePrice + 150.00
    };
    setVariants([...variants, newV]);
  };

  const handleSaveProduct = () => {
    const margin = Number((((salesBasePrice - costPrice) / salesBasePrice) * 100).toFixed(1));
    const updated: ProductItem = {
      ...selectedProduct,
      name: productName,
      type: productType,
      salesBasePrice: Number(salesBasePrice),
      costPrice: Number(costPrice),
      marginPercent: margin,
      variantsCount: variants.length,
      internalNotes: notes,
      variants
    };

    setProducts(products.map(p => p.id === updated.id ? updated : p));
    setSelectedProduct(updated);
    onUpdateProduct(updated);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(val);
  };

  const currentMargin = salesBasePrice > 0 
    ? (((salesBasePrice - costPrice) / salesBasePrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              CATALOG MATRIX • SKU ORCHESTRATION
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Products & Variant Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Service, software, and physical items catalog with dynamic variant pricing models and inventory linkage.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => demoNotice('Exporting Catalog CSV...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Import Catalog CSV</span>
          </button>
          <button 
            onClick={() => {
              const newP: ProductItem = {
                id: `prod-${Date.now()}`,
                sku: `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
                name: 'New Business Plan',
                type: 'Software Platform',
                salesBasePrice: 1999.00,
                costPrice: 500.00,
                marginPercent: 75.0,
                variantsCount: 1,
                internalNotes: 'Monthly software plan for a small business.',
                variants: [
                  { id: 'v-new', attribute: 'Tier', value: 'Default', extraPrice: 0, effectivePrice: 1999.00 }
                ]
              };
              setProducts([...products, newP]);
              handleSelectProduct(newP);
            }}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      <DemoMetrics items={[{ label: 'Products', value: products.length, hint: 'Software and support for small businesses' },{ label: 'Price variants', value: products.reduce((sum,p) => sum + p.variants.length,0), hint: 'Optional additions to the base price' },{ label: 'Lowest base price', value: money(Math.min(...products.map(p => p.salesBasePrice))), hint: 'Before GST; billing period is set by the plan' },{ label: 'Odoo variant', value: money(560), hint: 'Added per ERP user to the ₹5,000 base price' }]} />
      {/* Split View: Catalog Entities Table & Right Configurator Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Catalog Entities (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Catalog Entities</h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                {products.length} registered
              </span>
            </div>
            <span className="text-xs text-emerald-600 font-mono font-semibold">REALTIME LEDGER</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                  <th className="pb-3">Product & SKU</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Sales Price</th>
                  <th className="pb-3 text-right">Cost Price</th>
                  <th className="pb-3 text-center">Variants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isSelected = selectedProduct.id === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-slate-50/70 border-l-4 border-l-[#c1f100]' : ''
                      }`}
                    >
                      <td className="py-4 pr-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {p.sku}</div>
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#1e232d] text-white text-[10px] font-semibold">
                          {p.type}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(p.salesBasePrice)}
                      </td>
                      <td className="py-4 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="py-4 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-bold">
                          {p.variantsCount} Variants
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Automated Subscription Safeguard Note */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold text-slate-800">Automated Subscription Safeguard:</span> Product prices are used by the linked plan when creating a new subscription. Demo changes affect this tab only.
            </p>
          </div>
        </div>

        {/* Right: Configurator (Dark Obsidian Card - 5 cols) */}
        <div className="lg:col-span-5 bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#c1f100] text-[#171c20] text-[10px] font-mono font-extrabold">
                CONFIGURATOR
              </span>
              <span className="text-[11px] font-mono text-slate-400">SKU: {selectedProduct.sku}</span>
            </div>
            <Sliders className="w-4 h-4 text-slate-400" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Configure Product: {productName}
            </h3>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-bold mb-1">Product Name *</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#c1f100]"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#c1f100]"
              >
                <option value="Software Platform">Software Platform</option>
                <option value="Professional Service">Professional Service</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Add-on">Add-on</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Sales Base Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    value={salesBasePrice}
                    onChange={(e) => setSalesBasePrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Cost Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Margin alert */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>+{currentMargin}% Margin OK</span>
              </span>
              <span className="text-slate-400 text-[11px]">System warns if Cost &gt; Sales</span>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Internal Notes & Hooks</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#c1f100]"
              />
            </div>

            {/* Configured Variants Table */}
            <div className="pt-2 border-t border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Configured Variants</div>
                  <div className="text-[10px] text-slate-400">Dynamic pricing rule modifiers</div>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Variant</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {variants.map((v, i) => (
                  <div key={v.id || i} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 uppercase">{v.attribute}:</span>
                      <span className="font-semibold text-white">{v.value}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400 font-bold">
                        +{formatCurrency(v.extraPrice)}
                      </span>
                      <span className="font-mono font-bold text-white">
                        {formatCurrency(v.effectivePrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configurator Action buttons */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleSelectProduct(selectedProduct)}
                className="px-4 py-2 rounded-full text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                className="flex-1 py-2 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-extrabold tracking-tight transition-all active:scale-95 shadow-lg glow-kinetic cursor-pointer"
              >
                Save Product & Variants
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
