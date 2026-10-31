import React, { useState } from 'react';
import { Building2, MailPlus, Pencil, Plus, Search } from 'lucide-react';
import { platformApi } from '../../api/endpoints';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import type { PlatformBusiness, PlatformBusinessQuery } from '../../api/types';
import { Badge } from '../../components/ui/Badge';
import { DarkButton, PrimaryButton, SecondaryButton, TextInput, inputClass } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyBlock, ErrorBlock, InlineError, InlineNotice, LoadingBlock } from '../../components/ui/States';
import { useAsync, useDebounced } from '../../hooks';

const PAGE_SIZE = 10;

function CreateBusinessModal({ onClose, onCreated }: { onClose: () => void; onCreated: (business: PlatformBusiness) => void }) {
  const [form, setForm] = useState({ name: '', slug: '', admin_full_name: '', admin_email: '', timezone: '', currency: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      const created = await platformApi.create({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        admin_full_name: form.admin_full_name.trim(),
        admin_email: form.admin_email.trim(),
        ...(form.timezone.trim() ? { timezone: form.timezone.trim() } : {}),
        ...(form.currency.trim() ? { currency: form.currency.trim().toUpperCase() } : {}),
      });
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLUG_TAKEN') setFields({ slug: 'This identifier is already in use.' });
      else if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New business" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput id="name" label="Business name" value={form.name} onChange={set('name')} error={fields.name} required />
          <TextInput id="slug" label="Identifier (slug)" hint="Lowercase letters, digits and hyphens" value={form.slug} onChange={set('slug')} error={fields.slug} required />
          <TextInput id="admin_full_name" label="Administrator name" value={form.admin_full_name} onChange={set('admin_full_name')} error={fields.admin_full_name} required />
          <TextInput id="admin_email" label="Administrator email" type="email" value={form.admin_email} onChange={set('admin_email')} error={fields.admin_email} required />
          <TextInput id="timezone" label="Timezone (optional)" placeholder="Asia/Kolkata" value={form.timezone} onChange={set('timezone')} error={fields.timezone} />
          <TextInput id="currency" label="Currency (optional)" placeholder="INR" maxLength={3} value={form.currency} onChange={set('currency')} error={fields.currency} />
        </div>
        <InlineNotice>The administrator receives an email invitation to set a password.</InlineNotice>
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>Create business</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EditBusinessModal({ business, onClose, onSaved }: { business: PlatformBusiness; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(business.name);
  const [legalName, setLegalName] = useState(business.legal_name ?? '');
  const [contactEmail, setContactEmail] = useState(business.contact_email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await platformApi.update(business.id, {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        contact_email: contactEmail.trim() || null,
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Edit ${business.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput id="edit-name" label="Business name" value={name} onChange={(e) => setName(e.target.value)} error={fields.name} required />
        <TextInput id="edit-legal" label="Legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} error={fields.legal_name} />
        <TextInput id="edit-contact" label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} error={fields.contact_email} />
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>Save changes</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

type Pending = { kind: 'suspend' | 'activate' | 'resend'; business: PlatformBusiness };

export function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlatformBusiness | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query: PlatformBusinessQuery = { q: debounced || undefined, status: status || undefined, sort: '-created_at', page, page_size: PAGE_SIZE };
  const list = useAsync((signal) => platformApi.list(query, signal), [debounced, status, page]);

  const runPending = async () => {
    if (!pending) return;
    setActionBusy(true);
    setActionError(null);
    try {
      if (pending.kind === 'suspend') await platformApi.suspend(pending.business.id);
      if (pending.kind === 'activate') await platformApi.activate(pending.business.id);
      if (pending.kind === 'resend') {
        const result = await platformApi.resendAdminInvite(pending.business.id);
        setNotice(`Invitation re-sent (${result.invites_sent}).`);
      } else {
        setNotice(`${pending.business.name} is now ${pending.kind === 'suspend' ? 'suspended' : 'active'}.`);
      }
      setPending(null);
      list.reload();
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setActionBusy(false);
    }
  };

  const confirmCopy = pending && {
    suspend: { title: 'Suspend business', message: `Suspend ${pending.business.name}? All its users lose access immediately.`, label: 'Suspend' },
    activate: { title: 'Reactivate business', message: `Reactivate ${pending.business.name}?`, label: 'Activate' },
    resend: { title: 'Resend invitation', message: `Send a new administrator invitation for ${pending.business.name}? Older links stop working.`, label: 'Resend' },
  }[pending.kind];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Businesses</h1>
          <p className="text-sm text-slate-500 mt-1">Provision and manage customer businesses. Only profile data and counts are shown.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" aria-hidden="true" /> New business
        </PrimaryButton>
      </div>

      {notice && <InlineNotice tone="success">{notice}</InlineNotice>}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              aria-label="Search businesses"
              className={`${inputClass} pl-10`}
              placeholder="Search by name or identifier"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Filter by status"
            className={`${inputClass} sm:w-48`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | 'active' | 'suspended');
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {list.loading && !list.data ? (
          <LoadingBlock label="Loading businesses" />
        ) : list.error ? (
          <ErrorBlock error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyBlock title="No businesses found" hint="Create a business to invite its first administrator." />
        ) : (
          list.data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-4 font-bold">Business</th>
                      <th className="py-2 pr-4 font-bold">Status</th>
                      <th className="py-2 pr-4 font-bold">Locale</th>
                      <th className="py-2 pr-4 font-bold">Admins</th>
                      <th className="py-2 pr-4 font-bold">Staff</th>
                      <th className="py-2 pr-4 font-bold">Customers</th>
                      <th className="py-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.data.data.map((business) => (
                      <tr key={business.id} className="align-middle">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1e232d] text-[#c1f100] flex items-center justify-center">
                              <Building2 className="w-4 h-4" aria-hidden="true" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{business.name}</div>
                              <div className="font-mono text-[11px] text-slate-500">{business.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge tone={business.status === 'active' ? 'green' : 'rose'}>
                            {business.status === 'active' ? 'Active' : 'Suspended'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{business.currency} • {business.timezone}</td>
                        <td className="py-3 pr-4 font-mono">{business.admin_count}</td>
                        <td className="py-3 pr-4 font-mono">{business.staff_count}</td>
                        <td className="py-3 pr-4 font-mono">{business.customer_count}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-1.5">
                            <SecondaryButton type="button" onClick={() => setEditing(business)} aria-label={`Edit ${business.name}`}>
                              <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                            </SecondaryButton>
                            <SecondaryButton type="button" onClick={() => { setActionError(null); setPending({ kind: 'resend', business }); }} aria-label={`Resend invitation for ${business.name}`}>
                              <MailPlus className="w-3.5 h-3.5" aria-hidden="true" /> Invite
                            </SecondaryButton>
                            <DarkButton type="button" onClick={() => { setActionError(null); setPending({ kind: business.status === 'active' ? 'suspend' : 'activate', business }); }}>
                              {business.status === 'active' ? 'Suspend' : 'Activate'}
                            </DarkButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={list.data.meta.page} totalPages={list.data.meta.total_pages} total={list.data.meta.total} onPage={setPage} />
            </>
          )
        )}
      </div>

      {creating && (
        <CreateBusinessModal
          onClose={() => setCreating(false)}
          onCreated={(business) => {
            setCreating(false);
            setNotice(`${business.name} was created. An invitation was sent to its administrator.`);
            list.reload();
          }}
        />
      )}
      {editing && (
        <EditBusinessModal
          business={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('Business updated.');
            list.reload();
          }}
        />
      )}
      {pending && confirmCopy && (
        <ConfirmDialog
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.label}
          busy={actionBusy}
          error={actionError}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
