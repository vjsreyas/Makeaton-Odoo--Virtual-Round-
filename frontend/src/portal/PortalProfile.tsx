import React, { useEffect, useState } from 'react';
import type { Rec } from '../api/business';
import { ApiError, describeError, fieldErrors } from '../api/errors';
import { PrimaryButton, TextInput } from '../components/ui/Form';
import { ErrorBlock, InlineError, LoadingBlock } from '../components/ui/States';
import { useAsync } from '../hooks';
import { notify } from '../lib/notify';
import { portalApi } from './portalApi';

export function PortalProfile({ businessName }: { businessName: string }) {
  const profile = useAsync(() => portalApi.profile(), []);
  const [form, setForm] = useState<Rec | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    setFields({});
    try {
      setForm(await portalApi.updateProfile({ name: form.name, phone: form.phone || null, billing_address: form.billing_address || null }));
      notify('Profile saved.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#080d16] tracking-tight">Company & Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Your billing details as held by {businessName}.</p>
      </div>
      {profile.loading && !form ? <LoadingBlock label="Loading profile" /> : profile.error ? <ErrorBlock error={profile.error} onRetry={profile.reload} /> : form && (
        <form onSubmit={submit} noValidate className="bg-white rounded-3xl border border-slate-200 card-elevation-light p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <TextInput id="pf-name" label="Name" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fields.name} required />
            <TextInput id="pf-email" label="Email (contact the business to change)" value={form.email ?? ''} disabled readOnly />
            <TextInput id="pf-phone" label="Phone" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fields.phone} />
            <TextInput id="pf-tax" label="Tax ID (contact the business to change)" value={form.tax_id ?? ''} disabled readOnly />
          </div>
          <TextInput id="pf-address" label="Billing address" value={form.billing_address ?? ''} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} error={fields.billing_address} />
          <InlineError message={error} />
          <PrimaryButton type="submit" loading={busy}>Save profile</PrimaryButton>
        </form>
      )}
    </div>
  );
}
