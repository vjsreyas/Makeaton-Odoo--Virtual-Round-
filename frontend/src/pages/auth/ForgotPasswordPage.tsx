import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { PrimaryButton, TextInput } from '../../components/ui/Form';
import { InlineError, InlineNotice } from '../../components/ui/States';
import { AuthLayout } from '../../layouts/AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email and we will send a reset link if the account exists."
      footer={<Link to="/login" className="font-semibold hover:text-slate-800">Back to sign in</Link>}
    >
      {sent ? (
        <InlineNotice tone="success">
          If that email is registered, a reset link has been sent. The link is valid for 60 minutes.
        </InlineNotice>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextInput id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
          <InlineError message={error} />
          <PrimaryButton type="submit" loading={busy} className="w-full">Send reset link</PrimaryButton>
        </form>
      )}
    </AuthLayout>
  );
}
