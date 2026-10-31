import React, { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { biz, type Rec } from '../../api/business';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { Badge } from '../../components/ui/Badge';
import { PrimaryButton, SecondaryButton, TextInput, inputClass } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { EmptyBlock, ErrorBlock, InlineError, LoadingBlock } from '../../components/ui/States';
import { useAsync } from '../../hooks';
import { money } from '../../lib/india';
import { notify } from '../../lib/notify';

const FLAGS: [string, string][] = [['auto_close_on_expiry', 'Close automatically at expiry'], ['allow_early_close', 'Allow early closure'], ['allow_pause', 'Allow pausing'], ['allow_renewal', 'Allow renewal']];

function PlanModal({ plan, products, onClose, onSaved }: { plan: Rec | null; products: Rec[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<Rec>({
    name: plan?.name ?? '', product_id: plan?.product_id ?? products[0]?.id ?? '', price: plan?.price ?? '', billing_interval: plan?.billing_interval ?? 'monthly',
    min_quantity: plan?.min_quantity ?? 1, available_from: plan?.available_from ?? today, available_to: plan?.available_to ?? '',
    auto_close_on_expiry: plan?.auto_close_on_expiry ?? false, allow_early_close: plan?.allow_early_close ?? false, allow_pause: plan?.allow_pause ?? false, allow_renewal: plan?.allow_renewal ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const body: Rec = { ...form, min_quantity: Number(form.min_quantity), available_to: form.available_to || null };
    try {
      if (plan) {
        const { product_id, ...patch } = body;
        await biz.plans.update(plan.id, patch);
      } else await biz.plans.create(body);
      notify(plan ? 'Plan updated.' : 'Plan created.');
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextInput id="p-name" label="Plan name" value={form.name} onChange={set('name')} error={fields.name} required />
          <div className="space-y-1.5">
            <label htmlFor="p-product" className="block text-xs font-bold text-slate-700">Product</label>
            <select id="p-product" className={inputClass} value={form.product_id} onChange={set('product_id')} disabled={!!plan}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            {fields.product_id && <p className="text-[11px] font-semibold text-rose-600">{fields.product_id}</p>}
          </div>
          <TextInput id="p-price" label="Price" type="number" step="0.01" min="0" value={form.price} onChange={set('price')} error={fields.price} required />
          <div className="space-y-1.5">
            <label htmlFor="p-interval" className="block text-xs font-bold text-slate-700">Billing interval</label>
            <select id="p-interval" className={inputClass} value={form.billing_interval} onChange={set('billing_interval')}>{['daily', 'weekly', 'monthly', 'yearly'].map((i) => <option key={i} value={i}>{i}</option>)}</select>
          </div>
          <TextInput id="p-min" label="Minimum quantity" type="number" min="1" value={form.min_quantity} onChange={set('min_quantity')} error={fields.min_quantity} />
          <TextInput id="p-from" label="Available from" type="date" value={form.available_from} onChange={set('available_from')} error={fields.available_from} required />
          <TextInput id="p-to" label="Available until (optional)" type="date" value={form.available_to} onChange={set('available_to')} error={fields.available_to} />
        </div>
        <fieldset className="grid sm:grid-cols-2 gap-2">
          <legend className="text-xs font-bold text-slate-700 mb-1">Lifecycle options</legend>
          {FLAGS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={!!form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} /> {label}</label>
          ))}
        </fieldset>
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>{plan ? 'Save plan' : 'Create plan'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function PlansPage({ canCreate, canUpdate }: { canCreate: boolean; canUpdate: boolean }) {
  const plans = useAsync((signal) => biz.plans.list({}, signal), []);
  const products = useAsync((signal) => biz.products.list({ is_active: true }, signal), []);
  const [editing, setEditing] = useState<Rec | null | undefined>(undefined);
  const productList = products.data?.data ?? [];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Price, billing interval, minimum quantity, availability and which lifecycle actions customers and staff may use.</p>
        </div>
        {canCreate && <PrimaryButton type="button" disabled={productList.length === 0} onClick={() => setEditing(null)}><Plus className="w-4 h-4" aria-hidden="true" /> New plan</PrimaryButton>}
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6">
        {plans.loading && !plans.data ? <LoadingBlock label="Loading plans" /> : plans.error ? <ErrorBlock error={plans.error} onRetry={plans.reload} /> : plans.data && plans.data.data.length === 0 ? <EmptyBlock title="No plans yet" hint="Create a product first, then add a plan for it." /> : plans.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 pr-4">Plan</th><th className="py-2 pr-4">Price</th><th className="py-2 pr-4">Interval</th><th className="py-2 pr-4">Min qty</th><th className="py-2 pr-4">Available</th><th className="py-2 pr-4">Options</th><th className="py-2 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {plans.data.data.map((plan) => (
                  <tr key={plan.id}>
                    <td className="py-3 pr-4"><div className="font-bold text-slate-900">{plan.name}</div><div className="text-[11px] text-slate-500">{plan.product_name}</div></td>
                    <td className="py-3 pr-4 font-mono">{money(Number(plan.price))}</td>
                    <td className="py-3 pr-4 capitalize">{plan.billing_interval}</td>
                    <td className="py-3 pr-4 font-mono">{plan.min_quantity}</td>
                    <td className="py-3 pr-4 text-slate-600">{plan.available_from} → {plan.available_to ?? 'open'}</td>
                    <td className="py-3 pr-4 space-x-1">{!plan.is_active && <Badge tone="rose">Inactive</Badge>}{plan.allow_pause && <Badge>Pause</Badge>}{plan.allow_early_close && <Badge>Early close</Badge>}{plan.allow_renewal && <Badge>Renew</Badge>}{plan.auto_close_on_expiry && <Badge>Auto-close</Badge>}</td>
                    <td className="py-3"><div className="flex justify-end">{canUpdate && <SecondaryButton type="button" onClick={() => setEditing(plan)} aria-label={`Edit ${plan.name}`}><Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit</SecondaryButton>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing !== undefined && <PlanModal plan={editing} products={productList} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); plans.reload(); }} />}
    </div>
  );
}
