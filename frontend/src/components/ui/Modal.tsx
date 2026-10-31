import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DarkButton, SecondaryButton } from './Form';

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-dark-card p-6 space-y-4`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-slate-600">{message}</p>
      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold" role="alert">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </SecondaryButton>
        <DarkButton type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </DarkButton>
      </div>
    </Modal>
  );
}
