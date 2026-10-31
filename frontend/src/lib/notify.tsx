import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

type Listener = (toast: Toast) => void;
const listeners = new Set<Listener>();
let counter = 0;

export function notify(message: string, tone: Tone = 'success'): void {
  counter += 1;
  const toast = { id: counter, message, tone };
  listeners.forEach((listener) => listener(toast));
}

export function demoNotice(): void {
  notify('This feature is not available yet.', 'info');
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const listener: Listener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== toast.id)), 4500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'error' ? XCircle : toast.tone === 'info' ? Info : CheckCircle2;
        const palette = toast.tone === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : toast.tone === 'info' ? 'bg-white border-slate-200 text-slate-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900';
        return (
          <div key={toast.id} role="status" className={`flex items-start gap-2 px-4 py-3 rounded-2xl border shadow-lg text-xs font-semibold ${palette}`}>
            <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
