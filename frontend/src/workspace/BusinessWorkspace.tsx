import React, { useMemo, useState } from 'react';
import { biz, type Rec } from '../api/business';
import { fetchText } from '../api/client';
import { describeError } from '../api/errors';
import { loadLiveWorkspace, mapInvoice, methodCode, placeholderDiscount, placeholderProduct, placeholderTax } from '../adapters/liveData';
import { useAuth } from '../auth/AuthContext';
import { canAccessTab, firstAccessibleTab } from '../auth/navigation';
import { can, isBusinessAdmin } from '../auth/permissions';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { NewSubscriptionModal } from '../components/modals/NewSubscriptionModal';
import { RecordPaymentModal } from '../components/modals/RecordPaymentModal';
import { ErrorBlock, LoadingBlock, NotAllowed } from '../components/ui/States';
import { useAsync } from '../hooks';
import { notify, Toaster } from '../lib/notify';
import { CustomersPage } from '../pages/business/CustomersPage';
import { PlansPage } from '../pages/business/PlansPage';
import { ReportsPage } from '../pages/business/ReportsPage';
import { SettingsPage } from '../pages/business/SettingsPage';
import { TeamPage } from '../pages/business/TeamPage';
import type { Invoice, NavigationTab, ProductItem, Subscription, TaxRegime, DiscountRule } from '../types';
import { BatchBillingRunView } from '../views/BatchBillingRunView';
import { DashboardView } from '../views/DashboardView';
import { DiscountsView } from '../views/DiscountsView';
import { InvoiceDetailView } from '../views/InvoiceDetailView';
import { InvoicesLedgerView } from '../views/InvoicesLedgerView';
import { PaymentsLedgerView } from '../views/PaymentsLedgerView';
import { ProductsView } from '../views/ProductsView';
import { ReceivablesView } from '../views/ReceivablesView';
import { SubscriptionsView } from '../views/SubscriptionsView';
import { TaxesView } from '../views/TaxesView';

const todayIso = () => new Date().toISOString().slice(0, 10);

export function BusinessWorkspace() {
  const { me } = useAuth();
  const permissions = me?.permissions ?? [];
  const currency = me?.business?.currency ?? 'INR';
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => firstAccessibleTab(permissions));
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null | undefined>(undefined);
  const [newSubOpen, setNewSubOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const live = useAsync(() => loadLiveWorkspace(permissions, currency), [version]);
  const data = live.data;
  const invoiceRow = data?.invoices.find((i) => i.id === selectedInvoice);
  const detail = useAsync(async () => (invoiceRow?.uuid ? mapInvoice(await biz.invoices.get(invoiceRow.uuid)) : null), [invoiceRow?.uuid, version]);
  const currentInvoice = detail.data ?? invoiceRow ?? null;

  const refresh = () => setVersion((v) => v + 1);
  const guard = async (task: () => Promise<void>, success?: string) => {
    try {
      await task();
      if (success) notify(success);
      refresh();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const selectInvoice = (id: string) => {
    setSelectedInvoice(id);
    setCurrentTab('invoice-detail');
  };

  const submitPayment = ({ invoiceId, amount, method, methodDetail }: { invoiceId: string; amount: number; method: string; methodDetail: string }) => {
    const target = data?.invoices.find((i) => i.id === invoiceId);
    if (!target?.uuid) {
      notify('Choose an issued invoice to record a payment.', 'error');
      return;
    }
    void guard(async () => {
      await biz.payments.record(target.uuid!, { method: methodCode(method), amount: amount.toFixed(2), paid_on: todayIso(), reference: methodDetail || null }, undefined);
    }, `Payment of ${amount.toFixed(2)} recorded against ${invoiceId}.`);
  };

  const invoiceAction = (invoice: Invoice, action: 'confirm' | 'cancel' | 'send' | 'print') => {
    if (!invoice.uuid) return;
    if (action === 'print') {
      void fetchText(`/invoices/${invoice.uuid}/print`)
        .then((html) => window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank'))
        .catch((err) => notify(describeError(err), 'error'));
      return;
    }
    if (action === 'cancel' && !window.confirm(`Cancel invoice ${invoice.id}?`)) return;
    void guard(async () => {
      if (action === 'confirm') await biz.invoices.confirm(invoice.uuid!);
      if (action === 'cancel') await biz.invoices.cancel(invoice.uuid!);
      if (action === 'send') await biz.invoices.send(invoice.uuid!);
    }, action === 'confirm' ? 'Invoice confirmed.' : action === 'cancel' ? 'Invoice cancelled.' : 'Invoice emailed to the customer.');
  };

  const subscriptionAction = (sub: Subscription, action: string) => {
    if (!sub.uuid) return;
    let body: Rec = {};
    if (action === 'renew') {
      const next = window.prompt('New expiry date (YYYY-MM-DD)', todayIso().replace(/^\d{4}/, (y) => String(Number(y) + 1)));
      if (!next) return;
      body = { expiry_date: next };
    }
    if (action === 'close' && !window.confirm(`Close subscription ${sub.id}?`)) return;
    void guard(async () => {
      await biz.subscriptions.action(sub.uuid!, action, body);
    }, `${sub.id}: ${action.replace('-', ' ')} done.`);
  };

  const runBilling = async (asOf: string) => {
    try {
      const run = await biz.billing.run({ as_of_date: asOf });
      const failed = Number(run.failed_count);
      notify(`Billing run finished: ${run.created_count} created, ${run.skipped_count} skipped, ${failed} failed.`, failed ? 'error' : 'success');
      refresh();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const saveProduct = (prod: ProductItem, isNew: boolean) => {
    void guard(async () => {
      const base = { name: prod.name, product_type: String(prod.type), sales_price: prod.salesBasePrice.toFixed(2), cost_price: prod.costPrice.toFixed(2), notes: prod.internalNotes || null };
      if (isNew || !prod.uuid) {
        await biz.products.create({ ...base, variants: prod.variants.map((v) => ({ attribute: v.attribute, value: v.value, extra_price: v.extraPrice.toFixed(2) })) });
        return;
      }
      await biz.products.update(prod.uuid!, base);
      for (const v of prod.variants) {
        const body = { attribute: v.attribute, value: v.value, extra_price: v.extraPrice.toFixed(2) };
        if (v.uuid) await biz.products.updateVariant(v.uuid, body);
        else await biz.products.createVariant(prod.uuid!, body);
      }
    }, 'Product saved.');
  };

  const saveTaxes = (next: TaxRegime[]) => {
    void guard(async () => {
      for (const r of next) {
        const existing = data?.taxRegimes.find((t) => t.id === r.id);
        if (!existing) await biz.taxRules.create({ name: r.name, rate_percent: Number(r.rate).toFixed(4) });
        else if (existing.name !== r.name || existing.rate !== r.rate) await biz.taxRules.update(existing.uuid!, { name: r.name, rate_percent: Number(r.rate).toFixed(4) });
      }
    }, 'Tax rules saved.');
  };

  const saveDiscount = (rule: DiscountRule, isNew: boolean) => {
    void guard(async () => {
      const common = { name: rule.name, value: Number(rule.value).toFixed(2), min_purchase_amount: Number(rule.minSubtotal || 0).toFixed(2), min_quantity: Number(rule.minQuantity || 0), starts_on: rule.startDate, ends_on: rule.endDate || null, usage_limit: rule.usageLimit ? Number(rule.usageLimit) : null };
      if (isNew || !rule.uuid) {
        const productScope = String(rule.targetScope).toLowerCase().includes('product');
        await biz.discounts.create({ ...common, discount_type: rule.type, scope: productScope ? 'product' : 'subscription', product_id: productScope ? data?.products[0]?.uuid ?? null : null });
      } else await biz.discounts.update(rule.uuid!, common);
    }, 'Discount rule saved.');
  };

  const allowed = canAccessTab(permissions, currentTab);
  const pageTabs = useMemo(() => new Set<NavigationTab>(['staff', 'reports', 'settings', 'customers', 'plans']), []);
  const needsData = allowed && !pageTabs.has(currentTab);
  const canPay = can(permissions, 'payments.create');
  const canManageInvoices = can(permissions, 'invoices.manage');

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#171c20] flex flex-col font-sans">
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onOpenBillingModal={() => setCurrentTab('billing-run')}
        onOpenNewSubscription={() => setNewSubOpen(true)}
        canRunBilling={isBusinessAdmin(permissions)}
        canCreateSubscription={can(permissions, 'subscriptions.create')}
        activeNotificationsCount={0}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          permissions={permissions}
          businessName={me?.business?.name ?? 'Business'}
          currency={me?.business?.currency ?? ''}
          overdueCount={data?.invoices.filter((i) => i.status === 'Overdue').length ?? 0}
          draftCount={data?.invoices.filter((i) => i.status === 'Draft').length ?? 0}
        />
        <main className="flex-1 min-w-0 overflow-y-auto pb-16">
          {!allowed && <NotAllowed />}
          {allowed && currentTab === 'staff' && <TeamPage />}
          {allowed && currentTab === 'reports' && <ReportsPage />}
          {allowed && currentTab === 'settings' && <SettingsPage />}
          {allowed && currentTab === 'customers' && <CustomersPage canCreate={can(permissions, 'customers.create')} canUpdate={can(permissions, 'customers.update')} />}
          {allowed && currentTab === 'plans' && <PlansPage canCreate={can(permissions, 'plans.create')} canUpdate={can(permissions, 'plans.update')} />}
          {needsData && live.loading && !data && <LoadingBlock label="Loading your data" />}
          {needsData && Boolean(live.error) && !data && <div className="p-8"><ErrorBlock error={live.error} onRetry={live.reload} /></div>}
          {needsData && data && (
            <>
              {currentTab === 'dashboard' && <DashboardView onNavigateTab={setCurrentTab} invoices={data.invoices} subscriptions={data.subscriptions} onSelectInvoice={selectInvoice} />}
              {currentTab === 'invoices' && <InvoicesLedgerView invoices={data.invoices} onSelectInvoice={selectInvoice} onCreateManualInvoice={() => notify('Invoices are created automatically by billing runs from active subscriptions.', 'info')} />}
              {currentTab === 'invoice-detail' && currentInvoice && (
                <InvoiceDetailView invoice={currentInvoice} onBack={() => setCurrentTab('invoices')} onOpenRecordPayment={setPaymentTarget} onNavigateToSubscription={() => setCurrentTab('subscriptions')} onInvoiceAction={invoiceAction} canManage={canManageInvoices} canPay={canPay} />
              )}
              {currentTab === 'subscriptions' && <SubscriptionsView subscriptions={data.subscriptions} onOpenNewSubscription={() => setNewSubOpen(true)} onAction={subscriptionAction} />}
              {currentTab === 'billing-run' && <BatchBillingRunView queuedItems={data.queuedBillingItems} historyRuns={data.billingRunHistory} onRunBilling={runBilling} canRun={isBusinessAdmin(permissions)} />}
              {currentTab === 'payments' && <PaymentsLedgerView payments={data.payments} onOpenRecordPayment={() => setPaymentTarget(data.invoices.find((i) => i.balanceDue > 0 && ['Confirmed', 'Overdue'].includes(i.status)) ?? null)} onSelectInvoice={selectInvoice} />}
              {currentTab === 'receivables' && <ReceivablesView accounts={data.receivables} onSelectInvoice={selectInvoice} />}
              {currentTab === 'products' && <ProductsView products={data.products.length ? data.products : [placeholderProduct()]} onUpdateProduct={(p) => saveProduct(p, false)} onAddProduct={(p) => saveProduct(p, true)} />}
              {currentTab === 'taxes' && <TaxesView taxRegimes={data.taxRegimes.length ? data.taxRegimes : [placeholderTax()]} onUpdateRegimes={saveTaxes} />}
              {currentTab === 'discounts' && <DiscountsView discounts={data.discounts.length ? data.discounts : [placeholderDiscount()]} onUpdateDiscount={(d) => saveDiscount(d, false)} onAddDiscount={(d) => saveDiscount(d, true)} />}
            </>
          )}
        </main>
      </div>

      {data && (
        <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} invoices={data.invoices} subscriptions={data.subscriptions} products={data.products} onSelectInvoice={selectInvoice} onNavigateTab={setCurrentTab} />
      )}
      {paymentTarget !== undefined && data && (
        <RecordPaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(undefined)} onSubmitPayment={submitPayment} />
      )}
      {newSubOpen && data && (
        <NewSubscriptionModal customers={data.customers} plans={data.plans} products={data.rawProducts} templates={data.templates} onClose={() => setNewSubOpen(false)} onCreated={() => { setNewSubOpen(false); refresh(); }} />
      )}
      <Toaster />
    </div>
  );
}
