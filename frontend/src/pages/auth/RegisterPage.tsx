import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { publicApi, authApi } from '../../api/endpoints';
import { PasswordChecklist, PrimaryButton, TextInput, passwordMeetsPolicy } from '../../components/ui/Form';
import { InlineError, InlineNotice, LoadingBlock } from '../../components/ui/States';
import { useAsync } from '../../hooks';
import { AuthLayout } from '../../layouts/AuthLayout';

function SlugPicker() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState('');
  return (
    <AuthLayout
      title="Create a customer account"
      subtitle="Enter the business identifier you were given to register with that business."
      footer={<Link to="/login" className="font-semibold hover:text-slate-800">Back to sign in</Link>}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (slug.trim()) navigate(`/register/${encodeURIComponent(slug.trim().toLowerCase())}`);
        }}
      >
        <TextInput id="slug" label="Business identifier" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        <PrimaryButton type="submit" className="w-full">Continue</PrimaryButton>
      </form>
    </AuthLayout>
  );
}

function RegisterForm({ slug }: { slug: string }) {
  const business = useAsync((signal) => publicApi.business(slug, signal), [slug]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ linked: boolean } | null>(null);

  if (business.loading) {
    return (
      <AuthLayout title="Create a customer account">
        <LoadingBlock label="Looking up business" />
      </AuthLayout>
    );
  }
  if (business.error instanceof ApiError && business.error.status === 404) {
    return (
      <AuthLayout
        title="Business not available"
        subtitle="This business does not exist or is not accepting registrations."
        footer={<Link to="/register" className="font-semibold hover:text-slate-800">Try another identifier</Link>}
      >
        <span />
      </AuthLayout>
    );
  }
  if (business.error || !business.data) {
    return (
      <AuthLayout title="Create a customer account">
        <InlineError message={describeError(business.error)} />
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Account created" footer={<Link to="/login" className="font-semibold hover:text-slate-800">Go to sign in</Link>}>
        <InlineNotice tone="success">
          {done.linked
            ? `Your account for ${business.data.name} is ready. You can sign in now.`
            : `Your account was created. ${business.data.name} already has a customer record for this email address, so we sent a confirmation email. Open it to link that record and set your password.`}
        </InlineNotice>
      </AuthLayout>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const local: Record<string, string> = {};
    if (!passwordMeetsPolicy(password)) local.password = 'Password does not meet the requirements.';
    if (password !== confirm) local.confirm = 'Passwords do not match.';
    if (Object.keys(local).length > 0) {
      setFields(local);
      return;
    }
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const result = await authApi.register({
        business_slug: slug,
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      setDone({ linked: result.customer_id !== null });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_ALREADY_REGISTERED') {
        setError('This email already has a Brightloop account. Sign in, then join this business from your account menu.');
      } else if (err instanceof ApiError && err.status === 422) {
        setFields(fieldErrors(err));
      } else {
        setError(describeError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={`Create your account`}
      subtitle={`Customer registration for ${business.data.name}.`}
      footer={<Link to="/login" className="font-semibold hover:text-slate-800">Already have an account? Sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextInput id="full_name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={fields.full_name} required />
        <TextInput id="email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <TextInput id="password" label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} required />
        <PasswordChecklist value={password} />
        <TextInput id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={fields.confirm} required />
        <InlineError message={error} />
        <PrimaryButton type="submit" loading={busy} className="w-full">Create account</PrimaryButton>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { slug } = useParams();
  return slug ? <RegisterForm slug={slug.toLowerCase()} /> : <SlugPicker />;
}
