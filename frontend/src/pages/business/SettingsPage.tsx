import React, { useEffect, useState } from 'react';
import { biz, type Rec } from '../../api/business';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { PrimaryButton, TextInput } from '../../components/ui/Form';
import { ErrorBlock, InlineError, LoadingBlock } from '../../components/ui/States';
import { useAsync } from '../../hooks';
import { notify } from '../../lib/notify';

export function SettingsPage() {
  const settings = useAsync(() => biz.settings.get(), []);
  const [form, setForm] = useState<Rec | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => { if (settings.data) setForm(settings.data); }, [settings.data]);

  if (settings.loading && !form) return <LoadingBlock label="Loading settings" />;
  if (settings.error) return <div className="p-8"><ErrorBlock error={settings.error} onRetry={settings.reload} /></div>;
  if (!form) return null;
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...(p as Rec), [key]: e.target.value }));
  const toggle = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...(p as Rec), [key]: e.target.checked }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const saved = await biz.settings.patch({
        auto_confirm_invoices: form.auto_confirm_invoices, customer_self_service: form.customer_self_service, default_payment_terms_days: Number(form.default_payment_terms_days),
        legal_name: form.legal_name || null, address: form.address || null, tax_id: form.tax_id || null, contact_email: form.contact_email || null,
      });
      setForm(saved);
      notify('Settings saved.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Business settings</h1>
        <p className="text-sm text-slate-500 mt-1">{form.name} • {form.currency} • {form.timezone}</p>
      </div>
      <form onSubmit={submit} className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-5" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextInput id="st-legal" label="Legal name" value={form.legal_name ?? ''} onChange={set('legal_name')} error={fields.legal_name} />
          <TextInput id="st-contact" label="Contact email" type="email" value={form.contact_email ?? ''} onChange={set('contact_email')} error={fields.contact_email} />
          <TextInput id="st-tax" label="Tax ID" value={form.tax_id ?? ''} onChange={set('tax_id')} error={fields.tax_id} />
          <TextInput id="st-terms" label="Default payment terms (days)" type="number" min={0} max={365} value={form.default_payment_terms_days} onChange={set('default_payment_terms_days')} error={fields.default_payment_terms_days} />
        </div>
        <TextInput id="st-address" label="Address" value={form.address ?? ''} onChange={set('address')} error={fields.address} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.auto_confirm_invoices} onChange={toggle('auto_confirm_invoices')} /> Confirm invoices automatically when billing runs create them</label>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={!!form.customer_self_service} onChange={toggle('customer_self_service')} /> Let customers accept quotations and pause, resume or close eligible subscriptions</label>
        <InlineError message={error} />
        <PrimaryButton type="submit" loading={busy}>Save settings</PrimaryButton>
      </form>
    </div>
  );
}
