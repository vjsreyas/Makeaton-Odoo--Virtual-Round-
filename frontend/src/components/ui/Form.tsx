import React from 'react';
import { Check, X } from 'lucide-react';
import { Spinner } from './States';

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#c1f100] focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400';

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[11px] font-semibold text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  id,
  label,
  error,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string | null; hint?: string }) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
    </Field>
  );
}

export function PrimaryButton({
  loading,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] text-xs font-extrabold tracking-tight shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function DarkButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#1e232d] hover:bg-[#2a303c] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

const RULES: { label: string; test: (value: string) => boolean }[] = [
  { label: 'At least 9 characters', test: (v) => v.length >= 9 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A special character', test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

export function passwordMeetsPolicy(value: string): boolean {
  return value.length <= 128 && RULES.every((rule) => rule.test(value));
}

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]" aria-label="Password requirements">
      {RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>
            {ok ? <Check className="w-3 h-3" aria-hidden="true" /> : <X className="w-3 h-3" aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? 'met' : 'not met'}</span>
          </li>
        );
      })}
    </ul>
  );
}
