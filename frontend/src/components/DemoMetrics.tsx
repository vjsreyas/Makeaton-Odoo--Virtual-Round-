import React from 'react';
export function DemoMetrics({ items }: { items: { label: string; value: React.ReactNode; hint: string }[] }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{items.map(item => <div key={item.label} className="rounded-3xl bg-white border border-slate-200 p-5 shadow-card"><div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{item.label}</div><div className="text-2xl font-extrabold mt-3 text-slate-900 tabular-nums">{item.value}</div><p className="text-xs text-slate-500 mt-2">{item.hint}</p></div>)}</div>;
}
