import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { InvoicesLedgerView } from './views/InvoicesLedgerView';
import { InvoiceDetailView } from './views/InvoiceDetailView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { BatchBillingRunView } from './views/BatchBillingRunView';
import { PaymentsLedgerView } from './views/PaymentsLedgerView';
import { ReceivablesView } from './views/ReceivablesView';
import { ProductsView } from './views/ProductsView';
import { TaxesView } from './views/TaxesView';
import { DiscountsView } from './views/DiscountsView';
import { StaffGovernanceView } from './views/StaffGovernanceView';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { NewSubscriptionModal } from './components/modals/NewSubscriptionModal';
import { CreateManualInvoiceModal } from './components/modals/CreateManualInvoiceModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';

import {
  INITIAL_INVOICES,
  INITIAL_SUBSCRIPTIONS,
  QUEUED_BILLING_ITEMS,
  BILLING_RUN_HISTORY,
  PAYMENT_ENTRIES,
  RECEIVABLES_ACCOUNTS,
  INITIAL_PRODUCTS,
  TAX_REGIMES,
  DISCOUNT_RULES,
  STAFF_MEMBERS
} from './data/mockData';

import {
  NavigationTab,
  Invoice,
  Subscription,
  PaymentEntry,
  BillingRunHistory,
  ProductItem,
  TaxRegime,
  DiscountRule,
  StaffMember
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('invoices');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('#INV-2026-00940');

  // Core Data State
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(INITIAL_SUBSCRIPTIONS);
  const [payments, setPayments] = useState<PaymentEntry[]>(PAYMENT_ENTRIES);
  const [historyRuns, setHistoryRuns] = useState<BillingRunHistory[]>(BILLING_RUN_HISTORY);
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [taxRegimes, setTaxRegimes] = useState<TaxRegime[]>(TAX_REGIMES);
  const [discounts, setDiscounts] = useState<DiscountRule[]>(DISCOUNT_RULES);
  const [staffList, setStaffList] = useState<StaffMember[]>(STAFF_MEMBERS);
  const [currentUser, setCurrentUser] = useState<StaffMember>(STAFF_MEMBERS[0]);

  // Modal visibility
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isNewSubscriptionOpen, setIsNewSubscriptionOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [targetPaymentInvoice, setTargetPaymentInvoice] = useState<Invoice | null>(null);

  // Navigation handlers
  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setCurrentTab('invoice-detail');
  };

  const handleOpenRecordPaymentForInvoice = (invoice: Invoice) => {
    setTargetPaymentInvoice(invoice);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenGenericRecordPayment = () => {
    setTargetPaymentInvoice(invoices.find(i => i.id === selectedInvoiceId) || invoices[0]);
    setIsRecordPaymentOpen(true);
  };

  const handleSubmitPayment = ({
    invoiceId,
    amount,
    method,
    methodDetail
  }: {
    invoiceId: string;
    amount: number;
    method: string;
    methodDetail: string;
  }) => {
    // 1. Add payment entry
    const newPayment: PaymentEntry = {
      id: `#PAY-00${payments.length + 32}`,
      date: `${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} • ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      invoiceRef: invoiceId,
      customerName: invoices.find(i => i.id === invoiceId)?.customerName || 'Vortex Robotics Ltd',
      planTier: 'Enterprise Plan',
      paymentMethod: method,
      amountSettled: amount,
      status: 'Settled',
      gateway: 'Stripe Direct'
    };
    setPayments([newPayment, ...payments]);

    // 2. Update invoice balance
    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        const newPaid = inv.paidAmount + amount;
        const newBal = Math.max(0, inv.totalAmount - newPaid);
        return {
          ...inv,
          paidAmount: newPaid,
          balanceDue: newBal,
          status: newBal === 0 ? 'Paid' : inv.status,
          payments: [
            ...inv.payments,
            {
              id: newPayment.id,
              date: newPayment.date,
              method,
              methodDetail,
              amount,
              status: 'Settled',
              recordedBy: currentUser.name
            }
          ],
          auditTrail: [
            {
              id: `aud-${Date.now()}`,
              title: 'Payment Settlement Recorded',
              description: `Received $${amount.toLocaleString()} via ${method} (${methodDetail}). Recorded by ${currentUser.name}.`,
              timestamp: 'Just now',
              type: 'success'
            },
            ...inv.auditTrail
          ]
        };
      }
      return inv;
    }));
  };

  const handleExecuteBatchRun = (newRun: BillingRunHistory) => {
    setHistoryRuns([newRun, ...historyRuns]);
  };

  const handleSwitchUserRole = (newRole: 'Admin' | 'Staff') => {
    setCurrentUser(prev => ({
      ...prev,
      role: newRole
    }));
  };

  const handleUpdateProduct = (prod: ProductItem) => {
    setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
  };

  const handleAddProduct = (prod: ProductItem) => {
    setProducts(prev => [...prev, prod]);
  };

  const handleUpdateDiscount = (disc: DiscountRule) => {
    setDiscounts(prev => prev.map(d => d.id === disc.id ? disc : d));
  };

  const handleAddDiscount = (disc: DiscountRule) => {
    setDiscounts(prev => [...prev, disc]);
  };

  const handleAddMember = (m: StaffMember) => {
    setStaffList(prev => [...prev, m]);
  };

  const handleUpdateStaffRole = (id: string, newRole: 'Admin' | 'Staff') => {
    setStaffList(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
  };

  // Find current invoice for detail view
  const currentInvoice = invoices.find(i => i.id === selectedInvoiceId) || invoices[0];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#171c20] flex flex-col font-sans">
      {/* Global Sticky Header */}
      <Header
        currentUser={currentUser}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenBillingModal={() => setCurrentTab('billing-run')}
        onOpenNewSubscription={() => setIsNewSubscriptionOpen(true)}
        onSwitchUserRole={handleSwitchUserRole}
        activeNotificationsCount={2}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          overdueCount={invoices.filter(i => i.status === 'Overdue').length}
          draftCount={invoices.filter(i => i.status === 'Draft').length}
        />

        {/* Main Central View Area */}
        <main className="flex-1 overflow-y-auto pb-16">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setCurrentTab}
              onSelectInvoice={handleSelectInvoice}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesLedgerView
              invoices={invoices}
              onSelectInvoice={handleSelectInvoice}
              onCreateManualInvoice={() => setIsCreateInvoiceOpen(true)}
            />
          )}

          {currentTab === 'invoice-detail' && currentInvoice && (
            <InvoiceDetailView
              invoice={currentInvoice}
              onBack={() => setCurrentTab('invoices')}
              onOpenRecordPayment={handleOpenRecordPaymentForInvoice}
              onNavigateToSubscription={(subId) => {
                setCurrentTab('subscriptions');
              }}
            />
          )}

          {currentTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              onOpenNewSubscription={() => setIsNewSubscriptionOpen(true)}
            />
          )}

          {currentTab === 'billing-run' && (
            <BatchBillingRunView
              queuedItems={QUEUED_BILLING_ITEMS}
              historyRuns={historyRuns}
              onExecuteBatch={handleExecuteBatchRun}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentsLedgerView
              payments={payments}
              onOpenRecordPayment={handleOpenGenericRecordPayment}
              onSelectInvoice={handleSelectInvoice}
            />
          )}

          {currentTab === 'receivables' && (
            <ReceivablesView
              accounts={RECEIVABLES_ACCOUNTS}
              onSelectInvoice={handleSelectInvoice}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              onUpdateProduct={handleUpdateProduct}
              onAddProduct={handleAddProduct}
            />
          )}

          {currentTab === 'taxes' && (
            <TaxesView
              taxRegimes={taxRegimes}
              onUpdateRegimes={setTaxRegimes}
            />
          )}

          {currentTab === 'discounts' && (
            <DiscountsView
              discounts={discounts}
              onUpdateDiscount={handleUpdateDiscount}
              onAddDiscount={handleAddDiscount}
            />
          )}

          {currentTab === 'staff' && (
            <StaffGovernanceView
              staffMembers={staffList}
              onAddMember={handleAddMember}
              onUpdateRole={handleUpdateStaffRole}
            />
          )}

          {currentTab === 'reports' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">Financial & Invoicing Reports</h1>
                  <p className="text-sm text-slate-500 mt-1">Exportable GAAP/IFRS ledger ledgers, dunning cadence reports, and cohort churn models.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Tax Nexus Reconciliation (GST/VAT)', desc: 'Full breakdown of CGST, SGST, IGST and EU VAT reverse charge filings.', count: '12 periods' },
                  { title: 'Dunning & Recovery Velocity', desc: 'Cohort conversion metrics across Stage 1, Stage 2 and Throttling intervals.', count: '98.4% SLA' },
                  { title: 'Subscription Invariant Audit', desc: 'SHA-256 sealed transaction logs for SOC2 compliance examinations.', count: '2,410 verified' }
                ].map((r, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-card space-y-3">
                    <h3 className="font-bold text-slate-900">{r.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="font-mono text-emerald-600 font-bold">{r.count}</span>
                      <button 
                        onClick={() => alert(`Generated export package for ${r.title}`)}
                        className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'settings' && (
            <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-[#171c20] tracking-tight">System & Engine Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Configure database transaction locks, idempotency keys, and payment gateway webhooks.</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 space-y-4 max-w-2xl text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Idempotency Lock TTL</div>
                    <div className="text-slate-500 text-[11px]">Strict protection against duplicate invoice generation runs</div>
                  </div>
                  <span className="font-mono font-bold text-slate-800">120 seconds</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900">Stripe Webhook Signature Verification</div>
                    <div className="text-slate-500 text-[11px]">HMAC-SHA256 direct authentication</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">ENFORCED</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">Worker Pool Concurrency</div>
                    <div className="text-slate-500 text-[11px]">Thread-safe invoice generation workers</div>
                  </div>
                  <span className="font-mono font-bold text-[#1e232d] bg-[#c1f100] px-2 py-0.5 rounded-md">8 WORKERS</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        invoices={invoices}
        subscriptions={subscriptions}
        products={products}
        onSelectInvoice={handleSelectInvoice}
        onNavigateTab={setCurrentTab}
      />

      {isRecordPaymentOpen && (
        <RecordPaymentModal
          invoice={targetPaymentInvoice}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setTargetPaymentInvoice(null);
          }}
          onSubmitPayment={handleSubmitPayment}
        />
      )}

      {isNewSubscriptionOpen && (
        <NewSubscriptionModal
          onClose={() => setIsNewSubscriptionOpen(false)}
          onCreateSubscription={(newSub) => {
            setSubscriptions([newSub, ...subscriptions]);
            alert(`Provisioned ${newSub.customerName} (${newSub.id})!`);
          }}
        />
      )}

      {isCreateInvoiceOpen && (
        <CreateManualInvoiceModal
          onClose={() => setIsCreateInvoiceOpen(false)}
          onCreateInvoice={(newInv) => {
            setInvoices([newInv, ...invoices]);
            handleSelectInvoice(newInv.id);
            alert(`Created manual invoice ${newInv.id} successfully!`);
          }}
        />
      )}
    </div>
  );
}
