import React, { useState } from 'react';
import { authApi } from '../../api/endpoints';
import { ApiError, describeError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { ContextList } from '../../components/ContextList';
import { PrimaryButton, TextInput } from '../../components/ui/Form';
import { InlineError, InlineNotice } from '../../components/ui/States';

export function StartPage() {
  const { refreshMe, contexts } = useAuth();
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authApi.joinBusiness(slug.trim().toLowerCase());
      await refreshMe();
      setMessage(
        result.customer_id
          ? 'You joined this business as a customer. Pick it from the list above.'
          : 'This business already has a customer record for your email. We sent you a confirmation email; open it to link the record.',
      );
      setSlug('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setError('No active business was found with that identifier.');
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-4">
        <h1 className="text-xl font-extrabold text-[#171c20] tracking-tight">Choose a business</h1>
        <p className="text-sm text-slate-500">
          Your account is not attached to an active business yet. Select one below, or join a business as a customer.
        </p>
        {contexts.length > 0 && <ContextList />}
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Join a business as a customer</h2>
        <form onSubmit={onJoin} className="space-y-4">
          <TextInput id="slug" label="Business identifier" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          {message && <InlineNotice tone="success">{message}</InlineNotice>}
          <InlineError message={error} />
          <PrimaryButton type="submit" loading={busy}>Join business</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
