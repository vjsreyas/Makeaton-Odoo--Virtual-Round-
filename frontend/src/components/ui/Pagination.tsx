import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="flex items-center justify-between pt-4 text-xs text-slate-500" aria-label="Pagination">
      <span>
        {total} {total === 1 ? 'result' : 'results'}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-full border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-slate-700">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-full border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
