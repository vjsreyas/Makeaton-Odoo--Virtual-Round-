import React from 'react';
import { useAuth } from '../auth/AuthContext';

export function PortalPlaceholder() {
  const { me } = useAuth();
  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-3">
        <h1 className="text-xl font-extrabold text-[#171c20] tracking-tight">Customer portal</h1>
        <p className="text-sm text-slate-600">
          You are signed in as a customer of <strong>{me?.business?.name ?? 'your business'}</strong>.
        </p>
        <p className="text-sm text-slate-500">
          Subscriptions, invoices and payments are not available yet. They will appear here when the backend portal
          endpoints are released.
        </p>
      </div>
    </div>
  );
}
