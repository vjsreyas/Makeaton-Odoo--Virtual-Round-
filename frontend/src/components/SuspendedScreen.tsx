import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { BrandWordmark } from './Brand';
import { ContextList } from './ContextList';
import { SecondaryButton } from './ui/Form';

export function SuspendedScreen() {
  const { logout, contexts } = useAuth();
  const navigate = useNavigate();
  const alternatives = contexts.filter((context) => context.business_status !== 'suspended');

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-6 gap-6">
      <BrandWordmark />
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-5" role="alert">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-extrabold text-slate-900">This business is suspended</h1>
        </div>
        <p className="text-sm text-slate-600">
          Access to this business has been suspended by the platform. Contact your administrator for details.
        </p>
        {alternatives.length > 0 && (
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Switch to another business</div>
            <ContextList />
          </div>
        )}
        <SecondaryButton
          type="button"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          Log out
        </SecondaryButton>
      </div>
    </div>
  );
}
