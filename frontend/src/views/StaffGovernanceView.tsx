import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Check, 
  X, 
  UserCheck,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import { StaffMember } from '../types';

interface StaffGovernanceViewProps {
  staffMembers: StaffMember[];
  onAddMember: (member: StaffMember) => void;
  onUpdateRole: (id: string, newRole: 'Admin' | 'Staff') => void;
}

export const StaffGovernanceView: React.FC<StaffGovernanceViewProps> = ({
  staffMembers: initialMembers,
  onAddMember,
  onUpdateRole
}) => {
  const [members, setMembers] = useState<StaffMember[]>(initialMembers);
  const [activeTab, setActiveTab] = useState<'Directory' | 'Matrix' | 'Sessions'>('Directory');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'Staff'>('Staff');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    const added: StaffMember = {
      id: `staff-${Date.now()}`,
      name: newName,
      email: newEmail,
      role: newRole,
      accessScope: newRole === 'Admin' ? 'Full Platform Clearance' : 'Revenue Ops Scoped: Invoices & Subscriptions',
      twoFactor: 'Pending Setup on Onboarding',
      lastLogin: 'Never logged in',
      location: 'Remote',
      ip: 'Invited (expires in 4d)',
      status: 'Invited'
    };
    const next = [...members, added];
    setMembers(next);
    onAddMember(added);
    setShowInviteModal(false);
    setNewEmail('');
    setNewName('');
    alert(`Invite token issued to ${newEmail} with role: ${newRole}.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              SECOPS :: RBAC NODE // Core Access Gateway
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">
            Staff & Roles Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage internal team directory, role governance (Admin vs Staff), ephemeral session tokens, and strict kernel-enforced permission barriers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={() => alert('Exporting full SecOps Security Audit Log...')}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security Audit Log</span>
          </button>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-5 py-2 bg-[#c1f100] hover:bg-[#b2e000] text-[#171c20] rounded-full text-xs font-extrabold tracking-tight shadow-sm transition-all glow-kinetic active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>TEAM DIRECTORY</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              14 <span className="text-xs font-normal text-slate-500 font-sans">Registered</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-800">4 Admins</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">10 Scoped Staff</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>PENDING INVITES</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              2 <span className="text-xs font-normal text-slate-500 font-sans">Pending Acceptance</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 font-mono">
            Tokens auto-expire in 4 days
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>ACTIVE SESSIONS</span>
              <KeyRound className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-extrabold text-[#171c20] tracking-tight mt-3">
              18 <span className="text-xs font-normal text-slate-500 font-sans">Live Tokens</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>14 Web Browser</span>
            <span>4 Scoped API</span>
          </div>
        </div>

        {/* Card 4 (Dark Obsidian Card) */}
        <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>KERNEL GUARDRAIL</span>
              <Lock className="w-4 h-4 text-[#c1f100]" />
            </div>
            <div className="text-xl font-extrabold text-white tracking-tight mt-3">
              Last Admin Shield: <span className="text-[#c1f100]">ACTIVE</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 leading-tight">
            Sole admin deletion protection is active. Platform requires 1 super-privileged root identity at all times.
          </div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('Directory')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'Directory'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Directory ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('Matrix')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'Matrix'
                  ? 'bg-[#1e232d] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Role Permission Matrix
            </button>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Auto-synced via SAML/SCIM Okta Bridge
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-2">
                <th className="pb-3">User Identity</th>
                <th className="pb-3">Role Privilege</th>
                <th className="pb-3">Access Scope</th>
                <th className="pb-3">2FA Factor</th>
                <th className="pb-3">Last Login & Geolocation</th>
                <th className="pb-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1e232d] text-[#c1f100] font-bold flex items-center justify-center text-xs shrink-0">
                        {m.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{m.name}</span>
                          {m.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-[#c1f100] text-[#171c20] text-[9px] font-extrabold uppercase">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{m.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 whitespace-nowrap">
                    <button
                      onClick={() => onUpdateRole(m.id, m.role === 'Admin' ? 'Staff' : 'Admin')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        m.role === 'Admin'
                          ? 'bg-[#1e232d] text-[#c1f100] shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Click to toggle privilege"
                    >
                      {m.role}
                    </button>
                  </td>

                  <td className="py-4 text-slate-600 text-[11px]">
                    {m.accessScope}
                  </td>

                  <td className="py-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {m.twoFactor}
                  </td>

                  <td className="py-4 text-slate-600 text-[11px] whitespace-nowrap">
                    <div className="font-medium text-slate-900">{m.lastLogin}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{m.location} ({m.ip})</div>
                  </td>

                  <td className="py-4 text-center whitespace-nowrap">
                    {m.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Invited
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permission Matrix Quick Reference (Dark Card matching Screenshot 13) */}
      <div className="bg-[#1e232d] text-white rounded-3xl p-6 shadow-dark-card space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#c1f100] font-bold">
              GOVERNANCE DIGEST
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
              Role Permission Matrix Quick Reference
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Enforced by Zero-Trust Role Guard</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin Role Column */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">Admin Role</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                Full Clearance
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unrestricted operational control over systemic financial architecture and administrative infrastructure.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Global Control:</strong> Add, promote, demote, and deactivate Staff users</span>
              </div>
              <div className="flex items-start gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Fiscal Governance:</strong> Create and override Tax Nexuses, Discounts, & Billing Runs</span>
              </div>
              <div className="flex items-start gap-2 text-slate-200">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Settings & Audit:</strong> Rotate root encryption secrets and review terminal logs</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Privilege Weight: 100</span>
              <span className="text-slate-300">4 Members Assigned</span>
            </div>
          </div>

          {/* Staff Role Column */}
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-white text-sm">Staff Role</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 font-bold text-[10px]">
                Scoped Operator
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Task-oriented privilege restricted strictly to business catalog management and active customer billing ops.
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-200">
                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Subscriptions & Invoices:</strong> Create, adjust line items, dispatch, and review</span>
              </div>
              <div className="flex items-start gap-2 text-slate-200">
                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Billing Cycle Execution:</strong> Trigger queued recurring invoice batches</span>
              </div>
              <div className="flex items-start gap-2 text-rose-400">
                <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong className="text-rose-300">Discounts, Taxes, Staff & Engine Settings:</strong> 403 Forbidden</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Privilege Weight: 40</span>
              <span className="text-slate-300">8 Members Assigned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Staff Member</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Blake"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="j.blake@brightloop.io"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Role Privilege</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('Staff')}
                    className={`py-2 rounded-xl border text-center font-bold ${newRole === 'Staff' ? 'bg-[#1e232d] text-[#c1f100]' : 'border-slate-200 text-slate-600'}`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('Admin')}
                    className={`py-2 rounded-xl border text-center font-bold ${newRole === 'Admin' ? 'bg-[#1e232d] text-[#c1f100]' : 'border-slate-200 text-slate-600'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-full text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#c1f100] text-[#171c20] font-extrabold shadow-md glow-kinetic"
                >
                  Issue Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
