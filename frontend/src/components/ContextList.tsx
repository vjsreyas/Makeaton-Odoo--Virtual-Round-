import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Lock } from 'lucide-react';
import { describeError } from '../api/errors';
import type { ContextInfo, SwitchContextRequest } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { homePathFor, roleLabel } from '../auth/permissions';
import { InlineError } from './ui/States';

export function toSwitchRequest(context: ContextInfo): SwitchContextRequest {
  if (context.type === 'platform') return { context: 'platform' };
  return { business_id: context.business_id ?? undefined, type: context.type };
}

export function ContextList({ onSwitched }: { onSwitched?: () => void }) {
  const { me, contexts, switchContext } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCurrent = (context: ContextInfo) =>
    me?.active_context.type === context.type && me?.active_context.business_id === context.business_id;

  const choose = async (context: ContextInfo) => {
    const key = `${context.type}:${context.business_id ?? 'platform'}`;
    setPending(key);
    setError(null);
    try {
      const next = await switchContext(toSwitchRequest(context));
      onSwitched?.();
      navigate(homePathFor(next.role), { replace: true });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPending(null);
    }
  };

  if (contexts.length === 0) {
    return <p className="text-xs text-slate-500">You do not belong to any business yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      {contexts.map((context) => {
        const key = `${context.type}:${context.business_id ?? 'platform'}`;
        const suspended = context.business_status === 'suspended';
        const current = isCurrent(context);
        return (
          <button
            key={key}
            type="button"
            disabled={suspended || current || pending !== null}
            onClick={() => choose(context)}
            aria-current={current ? 'true' : undefined}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-all ${
              current
                ? 'bg-[#1e232d] text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 disabled:opacity-60 disabled:hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Building2 className={`w-4 h-4 shrink-0 ${current ? 'text-[#c1f100]' : 'text-slate-400'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block font-bold truncate">{context.business_name ?? 'Brightloop Platform'}</span>
                <span className={`block text-[10px] ${current ? 'text-slate-300' : 'text-slate-500'}`}>
                  {roleLabel(context.type)}
                </span>
              </span>
            </span>
            {current && <Check className="w-4 h-4 text-[#c1f100]" aria-label="Current context" />}
            {suspended && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                <Lock className="w-3 h-3" aria-hidden="true" /> Suspended
              </span>
            )}
          </button>
        );
      })}
      <InlineError message={error} />
    </div>
  );
}
