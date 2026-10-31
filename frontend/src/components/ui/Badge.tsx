import React from 'react';

const TONES = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  rose: 'bg-rose-100 text-rose-800',
  slate: 'bg-slate-100 text-slate-700',
  dark: 'bg-[#1e232d] text-[#c1f100]',
} as const;

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${TONES[tone]}`}>{children}</span>;
}
