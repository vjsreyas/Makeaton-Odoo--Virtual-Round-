import React, { useState } from 'react';
import { MailPlus, Pencil, Plus, Search } from 'lucide-react';
import { biz, type Rec } from '../../api/business';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import { Badge } from '../../components/ui/Badge';
import { PrimaryButton, SecondaryButton, TextInput, inputClass } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyBlock, ErrorBlock, InlineError, LoadingBlock } from '../../components/ui/States';
import { useAsync, useDebounced } from '../../hooks';
import { money } from '../../lib/india';
import { notify } from '../../lib/notify';

function CustomerModal({ customer, onClose, onSaved }: { customer: Rec | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: customer?.name ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '', billing_address: customer?.billing_address ?? '', tax_id: customer?.tax_id ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      if (customer) await biz.customers.update(customer.id, { name: form.name, phone: form.phone || null, billing_address: form.billing_address || null, tax_id: form.tax_id || null });
      else await biz.customers.create({ ...form, phone: form.phone || null, billing_address: form.billing_address || null, tax_id: form.tax_id || null });
      notify(customer ? 'Customer updated.' : 'Customer created.');
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') setFields({ email: 'A customer with this email already exists.' });
      else if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={customer ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput id="c-name" label="Name" value={form.name} onChange={set('name')} error={fields.name} required />
        <TextInput id="c-email" label="Email" type="email" value={form.email} onChange={set('email')} error={fields.email} required disabled={!!customer} />
        <TextInput id="c-phone" label="Phone" value={form.phone} onChange={set('phone')} error={fields.phone} />
        <TextInput id="c-address" label="Billing address" value={form.billing_address} onChange={set('billing_address')} error={fields.billing_address} />
        <TextInput id="c-tax" label="Tax ID" value={form.tax_id} onChange={set('tax_id')} error={fields.tax_id} />
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>{customer ? 'Save changes' : 'Create customer'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function CustomersPage({ canCreate, canUpdate }: { canCreate: boolean; canUpdate: boolean }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [editing, setEditing] = useState<Rec | null | undefined>(undefined);
  const list = useAsync((signal) => biz.customers.list({ q: debounced || undefined, page, page_size: 10 }, signal), [debounced, page]);

  const invite = async (customer: Rec) => {
    try {
      await biz.customers.invite(customer.id);
      notify(`Invitation sent to ${customer.email}.`);
      list.reload();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">People and companies you bill. Invite them to see their own subscriptions and invoices.</p>
        </div>
        {canCreate && (
          <PrimaryButton type="button" onClick={() => setEditing(null)}>
            <Plus className="w-4 h-4" aria-hidden="true" /> New customer
          </PrimaryButton>
        )}
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input aria-label="Search customers" className={`${inputClass} pl-10`} placeholder="Search by name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {list.loading && !list.data ? <LoadingBlock label="Loading customers" /> : list.error ? <ErrorBlock error={list.error} onRetry={list.reload} /> : list.data && list.data.data.length === 0 ? <EmptyBlock title="No customers yet" hint="Create your first customer to start a subscription." /> : list.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th className="py-2 pr-4">Customer</th><th className="py-2 pr-4">Portal</th><th className="py-2 pr-4">Subscriptions</th><th className="py-2 pr-4">Outstanding</th><th className="py-2 text-right">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {list.data.data.map((customer) => (
                    <tr key={customer.id}>
                      <td className="py-3 pr-4"><div className="font-bold text-slate-900">{customer.name}</div><div className="font-mono text-[11px] text-slate-500">{customer.email}</div></td>
                      <td className="py-3 pr-4">{customer.has_login ? <Badge tone="green">Has login</Badge> : <Badge tone="slate">No login</Badge>}</td>
                      <td className="py-3 pr-4 font-mono">{customer.subscriptions_count}</td>
                      <td className="py-3 pr-4 font-mono">{money(Number(customer.outstanding))}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1.5">
                          {canUpdate && <SecondaryButton type="button" onClick={() => setEditing(customer)} aria-label={`Edit ${customer.name}`}><Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit</SecondaryButton>}
                          {canUpdate && !customer.has_login && <SecondaryButton type="button" onClick={() => invite(customer)} aria-label={`Invite ${customer.name}`}><MailPlus className="w-3.5 h-3.5" aria-hidden="true" /> Invite</SecondaryButton>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={list.data.meta.page} totalPages={list.data.meta.total_pages} total={list.data.meta.total} onPage={setPage} />
          </>
        )}
      </div>
      {editing !== undefined && <CustomerModal customer={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); list.reload(); }} />}
    </div>
  );
}
