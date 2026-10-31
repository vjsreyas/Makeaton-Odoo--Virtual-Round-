import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { describeError, fieldErrors } from '../../api/errors';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { safeNext } from '../../auth/guards';
import { homePathFor } from '../../auth/permissions';
import { PrimaryButton, TextInput } from '../../components/ui/Form';
import { InlineError, InlineNotice } from '../../components/ui/States';
import { AuthLayout } from '../../layouts/AuthLayout';

export function LoginPage() {
  const { login, endReason, clearEndReason } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const me = await login(email.trim(), password);
      clearEndReason();
      navigate(safeNext(params.get('next')) ?? homePathFor(me.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BUSINESS_SUSPENDED') {
        navigate('/', { replace: true });
        return;
      }
      if (err instanceof ApiError && err.status === 422) {
        setFields(fieldErrors(err));
      } else if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(describeError(err));
      }
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to Brightloop"
      subtitle="Use the email address and password for your account."
      footer={
        <>
          <Link to="/forgot-password" className="font-semibold hover:text-slate-800">
            Forgot password?
          </Link>
          <span aria-hidden="true">•</span>
          <Link to="/register" className="font-semibold hover:text-slate-800">
            Create a customer account
          </Link>
        </>
      }
    >
      {endReason === 'expired' && <InlineNotice>Your session has ended. Please sign in again.</InlineNotice>}
      {endReason === 'signed_out' && <InlineNotice tone="success">You have been signed out.</InlineNotice>}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextInput
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fields.email}
          required
        />
        <TextInput
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fields.password}
          required
        />
        <InlineError message={error} />
        <PrimaryButton type="submit" loading={busy} className="w-full">
          Sign in
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
