import React, { useState } from 'react';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { PasswordChecklist, PrimaryButton, TextInput, passwordMeetsPolicy } from '../../components/ui/Form';
import { InlineError, InlineNotice } from '../../components/ui/States';

export function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDone(false);
    const local: Record<string, string> = {};
    if (!passwordMeetsPolicy(next)) local.new_password = 'Password does not meet the requirements.';
    if (next !== confirm) local.confirm = 'Passwords do not match.';
    if (Object.keys(local).length > 0) {
      setFields(local);
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-8 space-y-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#171c20] tracking-tight">Change password</h1>
          <p className="text-sm text-slate-500 mt-1">Other devices signed in to your account will be signed out.</p>
        </div>
        {done && <InlineNotice tone="success">Your password has been changed.</InlineNotice>}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextInput id="current_password" label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={fields.current_password} required />
          <TextInput id="new_password" label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={fields.new_password} required />
          <PasswordChecklist value={next} />
          <TextInput id="confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} required />
          <InlineError message={error} />
          <PrimaryButton type="submit" loading={busy}>Update password</PrimaryButton>
        </form>
      </div>
    </div>
  );
}
