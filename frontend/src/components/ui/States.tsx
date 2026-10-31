import React from 'react';
import { AlertTriangle, Inbox, Loader2, ShieldAlert } from 'lucide-react';
import { describeError } from '../../api/errors';

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <Spinner className="w-5 h-5 text-[#1e232d]" />
        <span>{label}…</span>
      </div>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="py-12 flex items-center justify-center gap-3 text-sm font-semibold text-slate-500" role="status" aria-live="polite">
      <Spinner className="w-5 h-5" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3" role="alert">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <div className="font-semibold">{describeError(error)}</div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 px-3 py-1 rounded-full bg-white border border-rose-200 text-xs font-bold text-rose-800 hover:bg-rose-100"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold" role="alert">
      {message}
    </div>
  );
}

export function InlineNotice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' }) {
  const palette =
    tone === 'success'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : 'bg-slate-50 border-slate-200 text-slate-700';
  return (
    <div className={`px-4 py-3 rounded-xl border text-xs font-semibold ${palette}`} role="status">
      {children}
    </div>
  );
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 flex flex-col items-center text-center gap-2 text-slate-500">
      <Inbox className="w-8 h-8 text-slate-300" aria-hidden="true" />
      <div className="text-sm font-bold text-slate-700">{title}</div>
      {hint && <div className="text-xs max-w-sm">{hint}</div>}
    </div>
  );
}

export function NotAllowed({ message }: { message?: string }) {
  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 text-center space-y-3" role="alert">
        <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" aria-hidden="true" />
        <h2 className="text-lg font-extrabold text-slate-900">You do not have access to this section</h2>
        <p className="text-sm text-slate-500">
          {message ?? 'Your account does not include the permission required for this page. Ask a Business Admin to grant it.'}
        </p>
      </div>
    </div>
  );
}
