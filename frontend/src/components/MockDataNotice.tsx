import React from 'react';
import { FlaskConical } from 'lucide-react';

export function MockDataNotice({ module }: { module: string }) {
  return (
    <div className="px-8 pt-6 max-w-7xl mx-auto">
      <div
        role="note"
        className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs"
      >
        <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-bold">Demo data.</span> {module} is not connected to the backend yet. What you see and any
          action you take here is simulated and is not saved.
        </div>
      </div>
    </div>
  );
}
