import type { Invoice, Subscription, QueuedBillingItem, BillingRunHistory, PaymentEntry, ReceivablesAccount, ProductItem, TaxRegime, DiscountRule, StaffMember } from '../types';
import { DEMO_TODAY, roundMoney } from '../lib/india';

// Fictional Indian small businesses. Demo date is fixed so the presentation stays reproducible.
// Money is INR; sample 18% tax is illustrative demo configuration, not a tax recommendation.
export const DEMO_CUSTOMERS = [
  { name: 'Lakshmi Traders', city: 'Bengaluru', state: 'Karnataka', address: '24 Market Road, Jayanagar, Bengaluru, Karnataka 560041', email: 'lakshmi@demo.example' },
  { name: 'Sri Sai Stores', city: 'Hyderabad', state: 'Telangana', address: '18 Station Road, Ameerpet, Hyderabad, Telangana 500016', email: 'srisai@demo.example' },
  { name: 'Kaveri Textiles', city: 'Mysuru', state: 'Karnataka', address: '12 Devaraja Market Road, Mysuru, Karnataka 570001', email: 'kaveri@demo.example' },
  { name: 'Malabar Foods', city: 'Kochi', state: 'Kerala', address: '8 MG Road, Ernakulam, Kochi, Kerala 682011', email: 'malabar@demo.example' },
  { name: 'Pune Design Studio', city: 'Pune', state: 'Maharashtra', address: '16 FC Road, Shivajinagar, Pune, Maharashtra 411005', email: 'punedesign@demo.example' },
  { name: 'Jaipur Book House', city: 'Jaipur', state: 'Rajasthan', address: '42 MI Road, Jaipur, Rajasthan 302001', email: 'jaipurbooks@demo.example' },
  { name: 'Coimbatore Auto Parts', city: 'Coimbatore', state: 'Tamil Nadu', address: '7 Avinashi Road, Coimbatore, Tamil Nadu 641018', email: 'kovai@demo.example' },
  { name: 'Vizag Travel Desk', city: 'Visakhapatnam', state: 'Andhra Pradesh', address: '21 Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530016', email: 'vizagtravel@demo.example' },
  { name: 'Chennai Furniture', city: 'Chennai', state: 'Tamil Nadu', address: '32 Anna Nagar, Chennai, Tamil Nadu 600040', email: 'chennaifurniture@demo.example' },
  { name: 'Surat Garments', city: 'Surat', state: 'Gujarat', address: '10 Ring Road, Surat, Gujarat 395002', email: 'suratgarments@demo.example' },
];

const subIds = ['#SUB-2026-000123', '#SUB-2026-000124', '#SUB-2026-000126', '#SUB-2026-000125', '#SUB-2026-000128', '#SUB-2026-000129', '#SUB-2026-000127', '#SUB-2026-000130', '#SUB-2026-000131', '#SUB-2026-000132'];
const planNames = ['Odoo ERP — 10 users', 'Accounting Monthly', 'Inventory + Support', 'Starter Monthly', 'Business Annual', 'Basic Monthly', 'Inventory — 2 branches', 'Starter Monthly', 'Business Monthly', 'Accounting Monthly'];
const planPrices = [55600, 2499, 5499, 1499, 24000, 999, 9998, 1499, 2999, 2499];
export const INITIAL_SUBSCRIPTIONS: Subscription[] = DEMO_CUSTOMERS.map((customer, index) => ({
  id: subIds[index], version: 'v1', customerName: customer.name, customerDomain: `${customer.email.split('@')[0]}.example`,
  customerLogoBg: ['bg-emerald-600', 'bg-blue-600', 'bg-amber-600'][index % 3],
  planName: planNames[index], tier: index === 0 ? '10 users • Odoo variant' : index === 6 ? '2 branches' : '1 business',
  planDescription: 'Billing, inventory and accounts for Indian small businesses.',
  contractTerm: index === 4 ? '01 Oct 2026 to 30 Sep 2027' : '01 Oct 2026 to 31 Oct 2027',
  nextBillingDate: index === 4 ? '01 Oct 2027' : index === 5 ? 'After confirmation' : index === 8 ? 'After acceptance' : index === 9 ? 'After resume' : '01 Nov 2026',
  nextBillingInDays: index === 4 ? 335 : 1,
  status: index === 5 ? 'Draft' : index === 8 ? 'Quotation' : index === 9 ? 'Paused' : 'Active',
  cadence: index === 4 ? 'Annual' : 'Monthly', cadenceValue: planPrices[index],
  billingMode: index === 4 ? 'Billed yearly in advance' : 'Billed monthly in advance', autoRenew: false, churnRisk: 'Low Risk',
}));

const invoiceIds = ['#INV-2026-00940', '#INV-2026-00939', '#INV-2026-00938', '#INV-2026-00891', '#INV-2026-00870', '#INV-2026-00859', '#INV-2026-00844', '#INV-2026-00941'];
const amountsPaid = [20000, 0, 3000, 1768.82, 28320, 0, 0, 1768.82];
const dueDates = ['16 Oct 2026', '23 Oct 2026', '05 Nov 2026', '16 Oct 2026', '16 Oct 2026', '15 Nov 2026', '10 Nov 2026', '16 Oct 2026'];
const methods = ['NEFT', 'UPI', 'UPI', 'UPI', 'NEFT', 'Cash', 'NEFT', 'Debit Card'];
export const INITIAL_INVOICES: Invoice[] = DEMO_CUSTOMERS.slice(0, 8).map((customer, index) => {
  const lines = index === 0 ? [
    { description: 'Odoo ERP — monthly user licence', subDescription: 'Base ₹5,000 + Odoo variant ₹560 per user', sku: 'ERP-ODOO-USER', quantity: 10, unitPrice: 5560, discount: 5560, discountCode: 'TEAM10' },
  ] : index === 2 ? [
    { description: 'Inventory Management — monthly plan', sku: 'INVENTORY-MONTHLY', quantity: 1, unitPrice: 4999, discount: 0 },
    { description: 'Phone & Email Support — monthly add-on', sku: 'SUPPORT-MONTHLY', quantity: 1, unitPrice: 500, discount: 0 },
  ] : [{ description: planNames[index], sku: index === 6 ? 'INVENTORY-MONTHLY' : `PLAN-${index + 1}`, quantity: index === 6 ? 2 : 1, unitPrice: index === 6 ? 4999 : planPrices[index], discount: index === 6 ? 500 : 0, discountCode: index === 6 ? 'WELCOME500' : undefined }];
  const lineItems = lines.map((line, li) => ({ ...line, id: `line-${index}-${li}`, taxRate: 18, amount: roundMoney(line.unitPrice * line.quantity - line.discount) }));
  const total = roundMoney(lineItems.reduce((sum, line) => sum + line.amount + roundMoney(line.amount * line.taxRate / 100), 0));
  const paid = amountsPaid[index];
  const days = Math.max(0, Math.floor((Date.parse(DEMO_TODAY) - Date.parse(dueDates[index])) / 86400000));
  const status: Invoice['status'] = index === 5 ? 'Draft' : paid === total ? 'Paid' : days > 0 ? 'Overdue' : 'Confirmed';
  return {
    id: invoiceIds[index], customerName: customer.name, customerEmail: customer.email, customerAddress: customer.address,
    customerGstPan: `DEMO-GST-${String(index + 1).padStart(3, '0')}`, customerTier: 'Indian small business', subscriptionRef: subIds[index],
    issueDate: index === 5 ? '31 Oct 2026' : '01 Oct 2026', dueDate: dueDates[index], terms: index === 5 ? '15 days from issue' : 'As agreed with customer',
    billingType: index === 4 ? 'Annual Renewal' : 'Recurring / Auto', totalAmount: total, paidAmount: paid, balanceDue: roundMoney(total - paid), status, overdueDays: status === 'Overdue' ? days : 0,
    cyclePeriod: index === 4 ? '01 Oct 2026 – 30 Sep 2027' : '01 Oct – 31 Oct 2026', lineItems,
    payments: paid ? [{ id: `#PAY-${String(index + 1).padStart(4, '0')}`, date: `${index === 0 ? '10' : '05'} Oct 2026 • 10:30 IST`, method: methods[index], methodDetail: `DEMO-REF-${String(index + 1).padStart(3, '0')}`, amount: paid, status: 'Settled', recordedBy: 'Priya Sharma' }] : [],
    auditTrail: [{ id: `audit-${index}`, title: index === 5 ? 'Draft invoice created' : 'Invoice confirmed', description: `October billing for ${customer.name}. All amounts in INR.`, timestamp: `${index === 5 ? '31' : '01'} Oct 2026 • 09:00 IST`, type: 'info' }],
    paymentInstructions: { wireSwift: 'Not used — domestic transfers', routing: 'DEMO-IFSC', account: 'Demo account — no real payment details', remark: `Use ${invoiceIds[index]} as the payment reference. Demo only; no money is transferred.` },
  };
});

// Derive related screens from the very same invoices, rather than independent dummy amounts.
export const PAYMENT_ENTRIES: PaymentEntry[] = INITIAL_INVOICES.flatMap(invoice => invoice.payments.map(payment => ({
  id: payment.id, date: payment.date, invoiceRef: invoice.id, customerName: invoice.customerName,
  planTier: INITIAL_SUBSCRIPTIONS.find(sub => sub.id === invoice.subscriptionRef)!.planName,
  paymentMethod: payment.method, amountSettled: payment.amount, status: 'Settled' as const, gateway: 'Manually recorded',
})));
export function receivablesFrom(invoices: Invoice[]): ReceivablesAccount[] {
  return invoices.filter(invoice => ['Confirmed', 'Overdue'].includes(invoice.status) && invoice.balanceDue > 0).map(invoice => ({
    id: `rec-${invoice.id}`, customerName: invoice.customerName, customerEmail: invoice.customerEmail, tierTag: 'Small business', invoiceRef: invoice.id,
    originationDate: invoice.issueDate, dueDate: invoice.dueDate, terms: invoice.terms,
    agingBucket: invoice.status === 'Overdue' ? '1-30 Days' : 'Current', agingDays: invoice.overdueDays ?? 0,
    balanceDue: invoice.balanceDue, totalInvoiceAmount: invoice.totalAmount,
    dunningStage: invoice.status === 'Overdue' ? 'Stage 1: Courtesy Ping' : 'Pre-due Ping Scheduled',
  }));
}
export const RECEIVABLES_ACCOUNTS = receivablesFrom(INITIAL_INVOICES);
export const QUEUED_BILLING_ITEMS: QueuedBillingItem[] = INITIAL_SUBSCRIPTIONS.filter(sub => sub.cadence === 'Monthly' && ['Active', 'Paused'].includes(sub.status)).map((sub, index) => ({
  id: `queue-${index}`, subscriptionId: sub.id, version: 'November renewal', customerName: sub.customerName,
  customerEmail: DEMO_CUSTOMERS.find(customer => customer.name === sub.customerName)!.email,
  planTier: sub.planName, billingPeriod: '01 Nov – 30 Nov 2026', estimatedAmount: roundMoney(sub.cadenceValue * 1.18),
  amountDetail: 'Plan price + illustrative 18% GST; October offers have ended', validationStatus: sub.status === 'Paused' ? 'Paused / Excluded' : 'Clean (Ready)',
}));
export const BILLING_RUN_HISTORY: BillingRunHistory[] = [{
  id: '#RUN-20261001-01', executedAt: '01 Oct 2026 • 09:00 IST', triggerMode: 'Scheduled Cron', evaluated: 7, invoicesCreated: 7, skipped: 0,
  totalVolume: roundMoney(INITIAL_INVOICES.filter(invoice => invoice.status !== 'Draft').reduce((sum, invoice) => sum + invoice.totalAmount, 0)), executionTime: 'Demo run',
}];

const products: [string, ProductItem['type'], number, number, string][] = [
  ['Odoo ERP', 'Software Platform', 5000, 3000, 'Monthly licence per user. Odoo brand variant adds ₹560 per user.'],
  ['Accounting Software', 'Software Platform', 2499, 1000, 'Invoices, expenses and bookkeeping for one business.'],
  ['Inventory Management', 'Software Platform', 4999, 2000, 'Stock, purchases and sales for one branch.'],
  ['Phone & Email Support', 'Add-on', 500, 200, 'Business-hours support, Monday to Saturday, 9 am–6 pm IST.'],
  ['Starter Business Plan', 'Software Platform', 1499, 600, 'Simple billing and customer records for a small shop.'],
  ['Business Annual Plan', 'Software Platform', 24000, 10000, 'One year of billing, accounts and customer management.'],
  ['Basic Billing Plan', 'Software Platform', 999, 400, 'Entry-level invoicing for a single shop.'],
];
export const INITIAL_PRODUCTS: ProductItem[] = products.map(([name, type, price, cost, notes], index) => ({
  id: `prod-${index + 1}`, sku: ['ERP-ODOO-USER', 'ACCOUNTS-MONTHLY', 'INVENTORY-MONTHLY', 'SUPPORT-MONTHLY', 'STARTER-MONTHLY', 'BUSINESS-YEARLY', 'BASIC-MONTHLY'][index],
  name, type, salesBasePrice: price, costPrice: cost, marginPercent: roundMoney((price - cost) / price * 100), internalNotes: notes,
  variantsCount: index === 0 ? 1 : 0, variants: index === 0 ? [{ id: 'variant-odoo', attribute: 'Brand', value: 'Odoo', extraPrice: 560, effectivePrice: 5560 }] : [],
}));
export const TAX_REGIMES: TaxRegime[] = [
  { id: 'tx-1', code: 'DEMO-GST-18', name: 'GST 18% — same-state sale', rate: 18, type: 'Exclusive', regionalSplitRule: 'CGST 9% + SGST 9%', appliesScope: 'Demo software plans and support', isDefault: true },
  { id: 'tx-2', code: 'DEMO-IGST-18', name: 'IGST 18% — other-state sale', rate: 18, type: 'Exclusive', regionalSplitRule: 'IGST 18%', appliesScope: 'Demo customers outside Karnataka' },
];
export const DISCOUNT_RULES: DiscountRule[] = [
  { id: 'disc-1', name: '10-user team offer', code: 'TEAM10', type: 'percentage', value: 10, appliesTo: 'Odoo ERP • minimum 10 users', window: '01–31 Oct 2026', daysLeft: 0, usageCount: 1, usageLimit: 20, minSubtotal: 0, minQuantity: 10, targetScope: 'Whole Subscription Subtotal', startDate: '2026-10-01', endDate: '2026-10-31', status: 'Active' },
  { id: 'disc-2', name: 'New branch welcome offer', code: 'WELCOME500', type: 'fixed', value: 500, appliesTo: 'Inventory Management • minimum ₹5,000', window: '01–31 Oct 2026', daysLeft: 0, usageCount: 1, usageLimit: 10, minSubtotal: 5000, minQuantity: 1, targetScope: 'Specific Line Items', startDate: '2026-10-01', endDate: '2026-10-31', status: 'Active' },
  { id: 'disc-3', name: 'November starter offer', code: 'STARTER5', type: 'percentage', value: 5, appliesTo: 'Starter Business Plan • first invoice', window: '01–30 Nov 2026', daysLeft: 1, usageCount: 0, usageLimit: 25, minSubtotal: 1000, targetScope: 'Specific Line Items', startDate: '2026-11-01', endDate: '2026-11-30', status: 'Scheduled' },
];
export const STAFF_MEMBERS: StaffMember[] = [
  { id: 'staff-1', name: 'Priya Sharma', email: 'priya@demo.example', role: 'Admin', accessScope: 'Business administration', twoFactor: 'Demo only', lastLogin: '31 Oct 2026 • 10:00 IST', location: 'Bengaluru, India', ip: '192.0.2.1', status: 'Active' },
  { id: 'staff-2', name: 'Arjun Menon', email: 'arjun@demo.example', role: 'Staff', accessScope: 'Customers and subscriptions', twoFactor: 'Demo only', lastLogin: '31 Oct 2026 • 09:30 IST', location: 'Kochi, India', ip: '192.0.2.2', status: 'Active' },
];
