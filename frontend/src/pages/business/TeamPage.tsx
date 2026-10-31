import React, { useState } from 'react';
import { Plus, Search, ShieldCheck, UserCog } from 'lucide-react';
import { teamApi } from '../../api/endpoints';
import { ApiError, describeError, fieldErrors } from '../../api/errors';
import type { PermissionCatalog, TeamMember, TeamQuery } from '../../api/types';
import { PermissionPicker } from '../../components/PermissionPicker';
import { Badge } from '../../components/ui/Badge';
import { DarkButton, PrimaryButton, SecondaryButton, TextInput, inputClass } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyBlock, ErrorBlock, InlineError, InlineNotice, LoadingBlock } from '../../components/ui/States';
import { useAsync, useDebounced } from '../../hooks';

const PAGE_SIZE = 10;

function statusBadge(member: TeamMember) {
  if (member.status === 'invited') return <Badge tone="amber">Invited</Badge>;
  if (member.status === 'inactive') return <Badge tone="rose">Inactive</Badge>;
  return <Badge tone="green">Active</Badge>;
}

function AddMemberModal({
  catalog,
  onClose,
  onCreated,
}: {
  catalog: PermissionCatalog;
  onClose: () => void;
  onCreated: (member: TeamMember) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<string[]>(catalog.defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      onCreated(await teamApi.create({ full_name: fullName.trim(), email: email.trim(), permissions }));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_MEMBER') setFields({ email: 'This person is already on the team.' });
      else if (err instanceof ApiError && err.status === 422) setFields(fieldErrors(err));
      else setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Add staff member" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput id="member-name" label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={fields.full_name} required />
          <TextInput id="member-email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        </div>
        <PermissionPicker catalog={catalog} value={permissions} onChange={setPermissions} disabled={busy} />
        {fields.permissions && <p className="text-[11px] font-semibold text-rose-600" role="alert">{fields.permissions}</p>}
        <InlineNotice>New people receive an email invitation to set their password.</InlineNotice>
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>Add member</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

function EditPermissionsModal({
  member,
  catalog,
  onClose,
  onSaved,
}: {
  member: TeamMember;
  catalog: PermissionCatalog;
  onClose: () => void;
  onSaved: (member: TeamMember) => void;
}) {
  const [permissions, setPermissions] = useState<string[]>(member.permissions);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSaved(await teamApi.setPermissions(member.id, permissions));
    } catch (err) {
      const mapped = fieldErrors(err);
      setError(mapped.permissions ?? describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Permissions for ${member.full_name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <PermissionPicker catalog={catalog} value={permissions} onChange={setPermissions} disabled={busy} />
        <InlineError message={error} />
        <div className="flex justify-end gap-2">
          <SecondaryButton type="button" onClick={onClose} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" loading={busy}>Save permissions</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function TeamPage() {
  const catalog = useAsync((signal) => teamApi.catalog(signal), []);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | 'business_admin' | 'business_staff'>('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [toggling, setToggling] = useState<TeamMember | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query: TeamQuery = {
    q: debounced || undefined,
    role: role || undefined,
    is_active: active === '' ? undefined : active === 'true',
    sort: 'created_at',
    page,
    page_size: PAGE_SIZE,
  };
  const list = useAsync((signal) => teamApi.list(query, signal), [debounced, role, active, page]);

  const confirmToggle = async () => {
    if (!toggling) return;
    setBusy(true);
    setActionError(null);
    try {
      if (toggling.is_active) await teamApi.deactivate(toggling.id);
      else await teamApi.activate(toggling.id);
      setNotice(`${toggling.full_name} was ${toggling.is_active ? 'deactivated' : 'activated'}.`);
      setToggling(null);
      list.reload();
    } catch (err) {
      setActionError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
            Team • Live data
          </span>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-1">Staff & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Invite staff and choose exactly which modules each person can use. Business Admins are managed by the platform.
          </p>
        </div>
        <PrimaryButton type="button" onClick={() => setAdding(true)} disabled={!catalog.data}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Add staff member
        </PrimaryButton>
      </div>

      {notice && <InlineNotice tone="success">{notice}</InlineNotice>}
      {catalog.error ? <ErrorBlock error={catalog.error} onRetry={catalog.reload} /> : null}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              aria-label="Search team"
              className={`${inputClass} pl-10`}
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select aria-label="Filter by role" className={`${inputClass} sm:w-44`} value={role} onChange={(e) => { setRole(e.target.value as typeof role); setPage(1); }}>
            <option value="">All roles</option>
            <option value="business_admin">Business Admin</option>
            <option value="business_staff">Business Staff</option>
          </select>
          <select aria-label="Filter by activity" className={`${inputClass} sm:w-40`} value={active} onChange={(e) => { setActive(e.target.value as typeof active); setPage(1); }}>
            <option value="">Any state</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {list.loading && !list.data ? (
          <LoadingBlock label="Loading team" />
        ) : list.error ? (
          <ErrorBlock error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.data.length === 0 ? (
          <EmptyBlock title="No team members match" hint="Adjust the filters or add a staff member." />
        ) : (
          list.data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-4 font-bold">Member</th>
                      <th className="py-2 pr-4 font-bold">Role</th>
                      <th className="py-2 pr-4 font-bold">Status</th>
                      <th className="py-2 pr-4 font-bold">Access</th>
                      <th className="py-2 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.data.data.map((member) => {
                      const isAdmin = member.role === 'business_admin';
                      return (
                        <tr key={member.id}>
                          <td className="py-3 pr-4">
                            <div className="font-bold text-slate-900">{member.full_name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{member.email}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge tone={isAdmin ? 'dark' : 'slate'}>{isAdmin ? 'Business Admin' : 'Business Staff'}</Badge>
                          </td>
                          <td className="py-3 pr-4">{statusBadge(member)}</td>
                          <td className="py-3 pr-4 text-slate-600">
                            {isAdmin ? (
                              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> All business permissions</span>
                            ) : (
                              <span title={member.permissions.join(', ')}>{member.permissions.length} permission{member.permissions.length === 1 ? '' : 's'}</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isAdmin ? (
                              <div className="text-right text-[11px] text-slate-400">Managed by the platform</div>
                            ) : (
                              <div className="flex justify-end gap-1.5">
                                <SecondaryButton type="button" disabled={!catalog.data} onClick={() => setEditing(member)} aria-label={`Edit permissions for ${member.full_name}`}>
                                  <UserCog className="w-3.5 h-3.5" aria-hidden="true" /> Permissions
                                </SecondaryButton>
                                <DarkButton type="button" onClick={() => { setActionError(null); setToggling(member); }}>
                                  {member.is_active ? 'Deactivate' : 'Activate'}
                                </DarkButton>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={list.data.meta.page} totalPages={list.data.meta.total_pages} total={list.data.meta.total} onPage={setPage} />
            </>
          )
        )}
      </div>

      {adding && catalog.data && (
        <AddMemberModal
          catalog={catalog.data}
          onClose={() => setAdding(false)}
          onCreated={(member) => {
            setAdding(false);
            setNotice(`${member.full_name} was added to the team.`);
            list.reload();
          }}
        />
      )}
      {editing && catalog.data && (
        <EditPermissionsModal
          member={editing}
          catalog={catalog.data}
          onClose={() => setEditing(null)}
          onSaved={(member) => {
            setEditing(null);
            setNotice(`Permissions updated for ${member.full_name}.`);
            list.reload();
          }}
        />
      )}
      {toggling && (
        <ConfirmDialog
          title={toggling.is_active ? 'Deactivate team member' : 'Activate team member'}
          message={
            toggling.is_active
              ? `${toggling.full_name} will lose access to this business immediately.`
              : `${toggling.full_name} will regain access with their saved permissions.`
          }
          confirmLabel={toggling.is_active ? 'Deactivate' : 'Activate'}
          busy={busy}
          error={actionError}
          onConfirm={confirmToggle}
          onCancel={() => setToggling(null)}
        />
      )}
    </div>
  );
}
