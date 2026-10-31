import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/endpoints';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { PasswordChecklist, PrimaryButton, TextInput, passwordMeetsPolicy } from '../../components/ui/Form';
import { InlineError, InlineNotice } from '../../components/ui/States';
import { AuthLayout } from '../../layouts/AuthLayout';

type Mode = 'reset' | 'invite';

export function TokenPasswordPage({ mode }: { mode: Mode }) {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(mode === 'reset');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<{ passwordChanged: boolean } | null>(null);

  useEffect(() => {
    if (params.has('token')) navigate(location.pathname, { replace: true });
  }, []);

  const isInvite = mode === 'invite';
  const title = isInvite ? 'Accept your invitation' : 'Choose a new password';

  if (!token && !outcome) {
    return (
      <AuthLayout
        title={isInvite ? 'Invitation link incomplete' : 'Reset link incomplete'}
        subtitle="This link is missing its token. Open the link from your email again."
        footer={<Link to={isInvite ? '/login' : '/forgot-password'} className="font-semibold hover:text-slate-800">{isInvite ? 'Go to sign in' : 'Request a new link'}</Link>}
      >
        <span />
      </AuthLayout>
    );
  }

  if (outcome) {
    return (
      <AuthLayout title={isInvite ? 'Invitation accepted' : 'Password updated'} footer={<Link to="/login" className="font-semibold hover:text-slate-800">Go to sign in</Link>}>
        <InlineNotice tone="success">
          {outcome.passwordChanged
            ? 'Your password has been set. You can now sign in.'
            : 'Invitation accepted. Your existing password was kept. You can now sign in.'}
        </InlineNotice>
      </AuthLayout>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const local: Record<string, string> = {};
    const provided = password.length > 0;
    if (passwordRequired && !provided) local.new_password = 'Enter a new password.';
    if (provided && !passwordMeetsPolicy(password)) local.new_password = 'Password does not meet the requirements.';
    if (provided && password !== confirm) local.confirm = 'Passwords do not match.';
    if (Object.keys(local).length > 0) {
      setFields(local);
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const result = await authApi.resetPassword(provided ? { token, new_password: password } : { token });
      setOutcome({ passwordChanged: result.password_changed });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const mapped = fieldErrors(err);
        if (mapped.token) {
          setError(
            isInvite
              ? 'This invitation link is invalid or has expired. Ask the person who invited you to send a new one.'
              : 'This reset link is invalid or has expired. Request a new one.',
          );
        } else {
          if (mapped.new_password && !provided) setPasswordRequired(true);
          setFields(mapped);
        }
      } else {
        setError(describeError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={title}
      subtitle={
        isInvite
          ? 'New to Brightloop? Choose a password to activate your access. If you already have an account you can leave the password blank to keep it.'
          : 'Choose a new password for your account.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextInput
          id="new_password"
          label={isInvite && !passwordRequired ? 'New password (optional)' : 'New password'}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.new_password}
        />
        <PasswordChecklist value={password} />
        <TextInput id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} />
        <InlineError message={error} />
        <PrimaryButton type="submit" loading={busy} className="w-full">
          {isInvite ? 'Accept invitation' : 'Set new password'}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
