import React, { useMemo, useState } from 'react';
import { biz, type Rec } from '../../api/business';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { PrimaryButton, SecondaryButton, TextInput, inputClass } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { InlineError } from '../ui/States';
import { notify } from '../../lib/notify';

interface Props {
  customers: Rec[];
  plans: Rec[];
  products: Rec[];
  templates: Rec[];
  onClose: () => void;
  onCreated: () => void;
}

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function NewSubscriptionModal({ customers, plans, products, templates, onClose, onCreated }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const activePlans = plans.filter((p) => p.is_active);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [templateId, setTemplateId] = useState('');
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? '');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [start, setStart] = useState(today);
  const [expiry, setExpiry] = useState(addYears(today, 1));
  const [activate, setActivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const template = templates.find((t) => t.id === templateId);
  const plan = activePlans.find((p) => p.id === (template?.plan_id ?? planId));
  const product = useMemo(() => products.find((p) => p.id === plan?.product_id), [products, plan]);
  const variants: Rec[] = (product?.variants ?? []).filter((v: Rec) => v.is_active);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const body: Rec = { customer_id: customerId, start_date: start, expiry_date: expiry };
      if (template) body.template_id = template.id;
      else {
        body.plan_id = planId;
        body.lines = [{ product_id: plan?.product_id, variant_id: variantId || null, quantity: Number(quantity) }];
      }
      const created = await biz.subscriptions.create(body);
      if (activate) {
        await biz.subscriptions.action(created.id, 'send-quotation');
        await biz.subscriptions.action(created.id, 'confirm');
        try {
          await biz.subscriptions.action(created.id, 'activate');
        } catch (err) {
          notify(`${created.number} was created and confirmed, but not activated: ${describeError(err)}`, 'info');
          onCreated();
          return;
        }
      }
      notify(`Subscription ${created.number} created${activate ? ' and activated' : ' as a draft'}.`);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const mapped = fieldErrors(err);
        setFields(mapped);
        if (Object.keys(mapped).length === 0) setError(err.message);
      } else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const select = (id: string, label: string, value: string, set: (v: string) => void, options: { value: string; label: string }[], error?: string, disabled?: boolean) => (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700">{label}</label>
      <select id={id} className={inputClass} value={value} onChange={(e) => set(e.target.value)} disabled={disabled}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      {error && <p className="text-[11px] font-semibold text-rose-600" role="alert">{error}</p>}
    </div>
  );

  return (
    <Modal title="New subscription" onClose={onClose} wide>
      {customers.length === 0 || activePlans.length === 0 ? (
        <p className="text-sm text-slate-600">Create at least one customer and one active plan before starting a subscription.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            {select('s-customer', 'Customer', customerId, setCustomerId, customers.map((c) => ({ value: c.id, label: `${c.name} (${c.email})` })), fields.customer_id)}
            {templates.length > 0 && select('s-template', 'Quotation template (optional)', templateId, setTemplateId, [{ value: '', label: 'None' }, ...templates.filter((t) => t.is_active).map((t) => ({ value: t.id, label: t.name }))])}
            {select('s-plan', 'Plan', template?.plan_id ?? planId, setPlanId, activePlans.map((p) => ({ value: p.id, label: `${p.name} (${p.billing_interval})` })), fields.plan_id, !!template)}
            {!template && select('s-variant', 'Variant', variantId, setVariantId, [{ value: '', label: 'No variant' }, ...variants.map((v) => ({ value: v.id, label: `${v.attribute}: ${v.value} (+${v.extra_price})` }))], fields['lines[0].variant_id'])}
            {!template && <TextInput id="s-qty" label={`Quantity (minimum ${plan?.min_quantity ?? 1})`} type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} error={fields['lines[0].quantity']} />}
            <TextInput id="s-start" label="Start date" type="date" value={start} onChange={(e) => setStart(e.target.value)} error={fields.start_date} required />
            <TextInput id="s-expiry" label="Expiry date" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} error={fields.expiry_date} required />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /> Send quotation, confirm and activate immediately</label>
          <InlineError message={error} />
          <div className="flex justify-end gap-2">
            <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" loading={busy}>Create subscription</PrimaryButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
