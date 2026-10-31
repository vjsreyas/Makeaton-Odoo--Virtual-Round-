export type NavigationTab = 
  | 'dashboard'
  | 'invoices'
  | 'invoice-detail'
  | 'subscriptions'
  | 'customers'
  | 'plans'
  | 'billing-run'
  | 'payments'
  | 'receivables'
  | 'products'
  | 'taxes'
  | 'discounts'
  | 'staff'
  | 'reports'
  | 'settings';

export interface InvoiceLineItem {
  id: string;
  description: string;
  subDescription?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // e.g. 18 for 18%
  discount: number; // e.g. 250
  discountCode?: string;
  amount: number;
}

export interface InvoicePayment {
  id: string;
  date: string;
  method: string;
  methodDetail: string;
  amount: number;
  status: 'Settled' | 'Pending' | 'Failed';
  recordedBy: string;
}

export interface AuditEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Invoice {
  uuid?: string;
  id: string; // e.g. #INV-2026-00940
  customerName: string;
  customerEmail: string;
  customerGstPan?: string;
  customerAddress?: string;
  customerTier?: string;
  subscriptionRef: string; // e.g. #SUB-2026-000123
  issueDate: string; // e.g. 01 Oct 2026
  dueDate: string; // e.g. 16 Oct 2026
  terms: string; // e.g. NET-15, NET-30, Auto-debit
  billingType: 'Manual' | 'Recurring / Auto' | 'Usage-Based Run' | 'Mid-cycle Addon' | 'Annual Renewal';
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'Overdue' | 'Confirmed' | 'Paid' | 'Draft' | 'Cancelled';
  overdueDays?: number;
  cyclePeriod?: string; // e.g. Jan 01 - Jan 31, 2026
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  auditTrail: AuditEvent[];
  paymentInstructions?: {
    wireSwift: string;
    routing: string;
    account: string;
    remark: string;
  };
}

export interface Subscription {
  uuid?: string;
  actions?: string[];
  id: string; // e.g. #SUB-2026-000123
  version: string; // e.g. v3, rev2
  customerName: string;
  customerDomain: string;
  customerLogoBg?: string;
  planName: string;
  tier: string;
  planDescription?: string;
  contractTerm: string; // e.g. Jan 15, 2026 to Jan 14, 2027
  nextBillingDate: string; // e.g. Apr 01, 2026
  nextBillingInDays?: number;
  status: 'Active' | 'Confirmed' | 'Quotation' | 'Draft' | 'Paused' | 'Closed';
  cadence: 'Daily' | 'Weekly' | 'Monthly' | 'Annual' | 'Quarterly';
  cadenceValue: number;
  billingMode?: string;
  autoRenew: boolean;
  churnRisk?: 'Low Risk' | 'Semi-Active' | 'Churn Risk';
}

export interface QueuedBillingItem {
  id: string;
  subscriptionId: string;
  version: string;
  customerName: string;
  customerEmail: string;
  planTier: string;
  billingPeriod: string;
  estimatedAmount: number;
  amountDetail: string;
  validationStatus: 'Clean (Ready)' | 'Warning: High Usage Spike' | 'Warning: Expiring Discount' | 'Paused / Excluded';
  warningMessage?: string;
}

export interface BillingRunHistory {
  id: string; // e.g. #RUN-20260201-01
  executedAt: string;
  triggerMode: 'Scheduled Cron' | 'Manual Catch-up';
  evaluated: number;
  invoicesCreated: number;
  skipped: number;
  totalVolume: number;
  executionTime: string;
}

export interface PaymentEntry {
  id: string; // e.g. #PAY-0031
  date: string;
  invoiceRef: string;
  customerName: string;
  planTier: string;
  paymentMethod: string;
  amountSettled: number;
  status: 'Settled' | 'Partial' | 'Pending' | 'Voided';
  cardBrand?: string;
  gateway?: string;
}

export interface ReceivablesAccount {
  id: string;
  customerName: string;
  customerEmail: string;
  tierTag: string;
  invoiceRef: string;
  originationDate: string;
  dueDate: string;
  terms: string;
  agingBucket: 'Current' | '1-30 Days' | '31-60 Days' | '61-90 Days' | '90+ Days';
  agingDays?: number;
  balanceDue: number;
  totalInvoiceAmount: number;
  dunningStage: 'Stage 1: Courtesy Ping' | 'Stage 2: Auto-Retry Pending' | 'Stage 3: Service Throttled' | 'Escalation III: Legal Review' | 'Pre-due Ping Scheduled';
}

export interface ProductVariant {
  uuid?: string;
  id: string;
  attribute: string;
  value: string;
  extraPrice: number;
  effectivePrice: number;
}

export interface ProductItem {
  uuid?: string;
  id: string;
  sku: string;
  name: string;
  type: 'Software Platform' | 'Professional Service' | 'Infrastructure' | 'Add-on';
  salesBasePrice: number;
  costPrice: number;
  marginPercent: number;
  variantsCount: number;
  internalNotes: string;
  variants: ProductVariant[];
}

export interface TaxRegime {
  uuid?: string;
  id: string;
  name: string;
  code: string;
  rate: number;
  type: 'Exclusive' | 'Inclusive' | 'Zero-Levy';
  sacHsnCode?: string;
  regionalSplitRule: string;
  appliesScope: string;
  isDefault?: boolean;
}

export interface DiscountRule {
  uuid?: string;
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // e.g. 15 for 15% or 250 for ₹250
  appliesTo: string;
  window: string;
  daysLeft?: number;
  usageCount: number;
  usageLimit: number;
  minSubtotal: number;
  minQuantity?: number;
  targetScope: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Scheduled' | 'Exhausted' | 'Expired';
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Staff';
  isCurrentUser?: boolean;
  accessScope: string;
  twoFactor: string; // e.g. 'YubiKey 5C NFC', 'TOTP Authenticator'
  lastLogin: string;
  location: string;
  ip: string;
  status: 'Active' | 'Invited' | 'Suspended';
}
