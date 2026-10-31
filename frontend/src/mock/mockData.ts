import {
  Invoice,
  Subscription,
  QueuedBillingItem,
  BillingRunHistory,
  PaymentEntry,
  ReceivablesAccount,
  ProductItem,
  TaxRegime,
  DiscountRule,
  StaffMember
} from '../types';

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: '#INV-2026-00940',
    customerName: 'Vortex Robotics Ltd.',
    customerEmail: 'billing@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0001',
    customerAddress: 'Level 4, Horizon Towers, Outer Ring Rd, Bangalore, KA, 560103',
    customerTier: 'Demo Export Tier 1',
    subscriptionRef: '#SUB-2026-000123',
    issueDate: 'Feb 01, 2026',
    dueDate: 'Feb 15, 2026',
    terms: 'Manual / NET-15',
    billingType: 'Manual',
    totalAmount: 35881.20,
    paidAmount: 5183.00,
    balanceDue: 30618.20,
    status: 'Overdue',
    overdueDays: 24,
    cyclePeriod: 'Jan 01 - Jan 31, 2026',
    paymentInstructions: {
      wireSwift: 'DEMOSWIFT00',
      routing: '000000000',
      account: '000000000000',
      remark: 'Always mention invoice identifier INV-2026-00940 on bank remittance advice.'
    },
    lineItems: [
      {
        id: 'li-1',
        description: 'Enterprise Core Platform - Odoo Edition',
        subDescription: 'High-throughput ERP node synchronization (+ $440/mo compute burst delta)',
        sku: 'BR-0008-ENT-09',
        quantity: 10,
        unitPrice: 2059.00,
        taxRate: 18,
        discount: 250.00,
        discountCode: 'SPRING-26',
        amount: 20340.00
      },
      {
        id: 'li-2',
        description: 'Technical Account Manager (TAM) Dedicated SLA',
        subDescription: '24/7/365 priority kernel escalations with 15-minute guarantee',
        sku: 'SLA-TAM-247-P1',
        quantity: 1,
        unitPrice: 2250.00,
        taxRate: 18,
        discount: 0,
        amount: 2250.00
      }
    ],
    payments: [
      {
        id: '#PAY-0031',
        date: 'Feb 06, 2026 • 16:32',
        method: 'Stripe ACH',
        methodDetail: 'Direct Debit (Routing **0920)',
        amount: 5183.00,
        status: 'Settled',
        recordedBy: 'System Gateway'
      }
    ],
    auditTrail: [
      {
        id: 'aud-1',
        title: 'Batch Invoiced',
        description: 'Generated via Recurring Billing Run #RUN-20260201-01',
        timestamp: 'Feb 01 • 00:00',
        type: 'info'
      },
      {
        id: 'aud-2',
        title: 'PDF Dispatched',
        description: 'Delivered via Amazon SES to billing@demo.example (Status: Delivered / Opened)',
        timestamp: 'Feb 01 • 09:14',
        type: 'info'
      },
      {
        id: 'aud-3',
        title: 'ACH Settlement Recorded',
        description: 'Received $5,183.00 via Stripe webhook notification.',
        timestamp: 'Feb 06 • 16:32',
        type: 'success'
      },
      {
        id: 'aud-4',
        title: 'Overdue Trigger Fired',
        description: 'Invoice breached Net-15 deadline; escalation engine initiated Dunning Stage 1 automated sequence.',
        timestamp: 'Feb 16 • 00:01',
        type: 'error'
      }
    ]
  },
  {
    id: '#INV-2026-00939',
    customerName: 'Apex Systems Global',
    customerEmail: 'ap@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0002',
    customerAddress: 'Vesterbrogade 14, 1620 Copenhagen, Denmark',
    subscriptionRef: '#SUB-2026-000124',
    issueDate: 'Dec 15, 2025',
    dueDate: 'Jan 15, 2026',
    terms: 'Recurring / Auto',
    billingType: 'Recurring / Auto',
    totalAmount: 14200.00,
    paidAmount: 0.00,
    balanceDue: 14200.00,
    status: 'Overdue',
    overdueDays: 42,
    cyclePeriod: 'Dec 01 - Dec 31, 2025',
    lineItems: [
      {
        id: 'li-ap-1',
        description: 'Growth Pro Metered Usage',
        subDescription: 'Standard EU Cluster tier with auto-scaling instances',
        sku: 'BR-GROWTH-01',
        quantity: 1,
        unitPrice: 14200.00,
        taxRate: 0,
        discount: 0,
        amount: 14200.00
      }
    ],
    payments: [],
    auditTrail: [
      {
        id: 'aud-ap-1',
        title: 'Invoice Dispatched',
        description: 'Invoice dispatched to ap@demo.example',
        timestamp: 'Dec 15, 2025 • 00:00',
        type: 'info'
      },
      {
        id: 'aud-ap-2',
        title: 'Auto-Debit Failed',
        description: 'Card declined: insufficient funds on primary card ending 4012.',
        timestamp: 'Jan 15, 2026 • 04:00',
        type: 'warning'
      }
    ]
  },
  {
    id: '#INV-2026-00938',
    customerName: 'HyperScale Cloud Inc',
    customerEmail: 'finance@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0003',
    customerAddress: '100 Montgomery St, San Francisco, CA 94104',
    subscriptionRef: '#SUB-2026-000126',
    issueDate: 'Jan 20, 2026',
    dueDate: 'Feb 20, 2026',
    terms: 'Usage-Based Run',
    billingType: 'Usage-Based Run',
    totalAmount: 27480.20,
    paidAmount: 15000.00,
    balanceDue: 12480.20,
    status: 'Confirmed',
    cyclePeriod: 'Jan 01 - Jan 31, 2026',
    lineItems: [
      {
        id: 'li-hs-1',
        description: 'HyperScale Infrastructure Compute Burst',
        subDescription: '2,400 vCPU hours + 40TB egress pipeline',
        sku: 'VPC-SRV-33C',
        quantity: 1,
        unitPrice: 27480.20,
        taxRate: 0,
        discount: 0,
        amount: 27480.20
      }
    ],
    payments: [
      {
        id: '#PAY-0028',
        date: 'Feb 02, 2026 • 11:06',
        method: 'Bank Wire',
        methodDetail: 'Chase Wire Remittance',
        amount: 15000.00,
        status: 'Settled',
        recordedBy: 'Finance Ops'
      }
    ],
    auditTrail: [
      {
        id: 'aud-hs-1',
        title: 'Partial Wire Received',
        description: 'Wire of $15,000 received; residual $12,480.20 scheduled for Feb 20.',
        timestamp: 'Feb 02 • 11:06',
        type: 'success'
      }
    ]
  },
  {
    id: '#INV-2026-00891',
    customerName: 'Nordic Energy Data A/S',
    customerEmail: 'invoicing@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0004',
    customerAddress: 'Nordhavn Plads 2, Copenhagen',
    subscriptionRef: '#SUB-2026-000125',
    issueDate: 'Feb 01, 2026',
    dueDate: 'Feb 01, 2026',
    terms: 'Stripe Auto-debit',
    billingType: 'Recurring / Auto',
    totalAmount: 18750.00,
    paidAmount: 18750.00,
    balanceDue: 0.00,
    status: 'Paid',
    cyclePeriod: 'Feb 01 - Feb 28, 2026',
    lineItems: [
      {
        id: 'li-ne-1',
        description: 'Nordic Grid Telemetry Platform',
        sku: 'BR-0008-ENT-09',
        quantity: 1,
        unitPrice: 18750.00,
        taxRate: 0,
        discount: 0,
        amount: 18750.00
      }
    ],
    payments: [
      {
        id: '#PAY-0030',
        date: 'Feb 01, 2026 • 09:11',
        method: 'Stripe Card',
        methodDetail: 'Visa Corporate ending 9112',
        amount: 18750.00,
        status: 'Settled',
        recordedBy: 'Stripe Direct'
      }
    ],
    auditTrail: [
      {
        id: 'aud-ne-1',
        title: 'Instant Auto-Settlement',
        description: 'Auto-charged via Stripe Card instantly upon cycle generation.',
        timestamp: 'Feb 01 • 09:11',
        type: 'success'
      }
    ]
  },
  {
    id: '#INV-2026-00870',
    customerName: 'Synthetix Health Corp',
    customerEmail: 'accounts@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0005',
    customerAddress: '675 Kendall Square, Cambridge, MA 02142',
    subscriptionRef: '#SUB-2026-000128',
    issueDate: 'Feb 01, 2026',
    dueDate: 'Feb 01, 2026',
    terms: 'ACH Direct Debit',
    billingType: 'Recurring / Auto',
    totalAmount: 52190.00,
    paidAmount: 52190.00,
    balanceDue: 0.00,
    status: 'Paid',
    cyclePeriod: 'Feb 01 - Feb 28, 2026',
    lineItems: [
      {
        id: 'li-sy-1',
        description: 'HIPAA Scale Biometrics Engine',
        sku: 'BR-MED-SCALE',
        quantity: 1,
        unitPrice: 52190.00,
        taxRate: 0,
        discount: 0,
        amount: 52190.00
      }
    ],
    payments: [
      {
        id: '#PAY-0029',
        date: 'Feb 01, 2026 • 10:43',
        method: 'ACH Direct',
        methodDetail: 'PNC Bank Corp Auto-clearing',
        amount: 52190.00,
        status: 'Settled',
        recordedBy: 'ACH Gateway'
      }
    ],
    auditTrail: [
      {
        id: 'aud-sy-1',
        title: 'Full Clearing Confirmed',
        description: 'ACH clearing completed successfully with zero transaction friction.',
        timestamp: 'Feb 01 • 10:43',
        type: 'success'
      }
    ]
  },
  {
    id: '#INV-2026-00859',
    customerName: 'Krypton Orbital Inc',
    customerEmail: 'procure@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0006',
    customerAddress: 'Space Commerce Way, Cape Canaveral, FL',
    subscriptionRef: '#SUB-2026-000129',
    issueDate: 'Feb 02, 2026',
    dueDate: 'Unissued Draft',
    terms: 'Mid-cycle Addon',
    billingType: 'Mid-cycle Addon',
    totalAmount: 8460.00,
    paidAmount: 0.00,
    balanceDue: 8460.00,
    status: 'Draft',
    cyclePeriod: 'Mid-cycle Pro-rata',
    lineItems: [
      {
        id: 'li-kr-1',
        description: 'LEO Telemetry Pipeline Uplink',
        sku: 'API-GW-PULSE',
        quantity: 6,
        unitPrice: 1410.00,
        taxRate: 0,
        discount: 0,
        amount: 8460.00
      }
    ],
    payments: [],
    auditTrail: [
      {
        id: 'aud-kr-1',
        title: 'Draft Staged',
        description: 'Mid-cycle expansion calculation initiated by Account Exec.',
        timestamp: 'Feb 02 • 14:10',
        type: 'info'
      }
    ]
  },
  {
    id: '#INV-2026-00844',
    customerName: 'OmniRetail Analytics',
    customerEmail: 'ap@demo.example',
    customerGstPan: 'DEMO-TAX-ID-0007',
    customerAddress: 'Broadway & 42nd, New York, NY 10036',
    subscriptionRef: '#SUB-2026-000127',
    issueDate: 'Feb 01, 2026',
    dueDate: 'Mar 03, 2026',
    terms: 'Annual Renewal',
    billingType: 'Annual Renewal',
    totalAmount: 64000.00,
    paidAmount: 0.00,
    balanceDue: 64000.00,
    status: 'Confirmed',
    cyclePeriod: 'Mar 01, 2026 - Feb 28, 2027',
    lineItems: [
      {
        id: 'li-or-1',
        description: 'Global POS Stream Ingest Cluster (Tier 4)',
        sku: 'BR-0008-ENT-09',
        quantity: 1,
        unitPrice: 64000.00,
        taxRate: 0,
        discount: 0,
        amount: 64000.00
      }
    ],
    payments: [],
    auditTrail: [
      {
        id: 'aud-or-1',
        title: 'Annual Renewal Dispatched',
        description: 'PO confirmation acknowledged by OmniRetail finance controller.',
        timestamp: 'Feb 01 • 15:30',
        type: 'info'
      }
    ]
  }
];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '#SUB-2026-000123',
    version: 'v3',
    customerName: 'Acme Corporation',
    customerDomain: 'acme-corp.com',
    customerLogoBg: 'bg-emerald-600',
    planName: 'Scale Enterprise Hybrid',
    tier: 'Metered (99.9%)',
    contractTerm: 'Jan 15, 2026 to Jan 14, 2027',
    nextBillingDate: 'Apr 01, 2026',
    nextBillingInDays: 12,
    status: 'Active',
    cadence: 'Monthly',
    cadenceValue: 30618.20,
    billingMode: 'Auto Incurred',
    autoRenew: true,
    churnRisk: 'Low Risk'
  },
  {
    id: '#SUB-2026-000124',
    version: 'v1',
    customerName: 'BlueRock Digital',
    customerDomain: 'bluerock.io',
    customerLogoBg: 'bg-blue-600',
    planName: 'Growth Pro Metered',
    tier: 'Standard Usage',
    contractTerm: 'Feb 01, 2026 to Jan 31, 2027',
    nextBillingDate: 'Apr 01, 2026',
    nextBillingInDays: 12,
    status: 'Active',
    cadence: 'Monthly',
    cadenceValue: 2499.00,
    billingMode: 'Annual Pre-paid',
    autoRenew: true,
    churnRisk: 'Low Risk'
  },
  {
    id: '#SUB-2026-000125',
    version: 'rev2',
    customerName: 'FinTech Pulse',
    customerDomain: 'pulsefinancial.com',
    customerLogoBg: 'bg-amber-600',
    planName: 'Scale Enterprise Tier 2',
    tier: 'High-Volume Dedicated',
    contractTerm: 'Mar 10, 2026 to Mar 09, 2027',
    nextBillingDate: 'Pending Activation',
    status: 'Quotation',
    cadence: 'Monthly',
    cadenceValue: 14500.00,
    billingMode: 'Pending Signature',
    autoRenew: false,
    churnRisk: 'Semi-Active'
  },
  {
    id: '#SUB-2026-000126',
    version: 'v1',
    customerName: 'CloudScale AI',
    customerDomain: 'cloudscale.tech',
    customerLogoBg: 'bg-sky-600',
    planName: 'Growth Pro Metered',
    tier: 'Usage (Burst Nodes)',
    contractTerm: 'Apr 01, 2026 to Mar 31, 2027',
    nextBillingDate: 'Apr 01, 2026',
    nextBillingInDays: 12,
    status: 'Confirmed',
    cadence: 'Monthly',
    cadenceValue: 5240.00,
    billingMode: 'Scheduled Start',
    autoRenew: true,
    churnRisk: 'Low Risk'
  },
  {
    id: '#SUB-2026-000127',
    version: 'v2',
    customerName: 'Nexis Logistics',
    customerDomain: 'nexis-corp.de',
    customerLogoBg: 'bg-slate-700',
    planName: 'Starter Core',
    tier: 'Fixed Base Plan',
    contractTerm: 'Nov 01, 2025 to Oct 31, 2026',
    nextBillingDate: 'Paused until May',
    status: 'Paused',
    cadence: 'Monthly',
    cadenceValue: 799.00,
    billingMode: 'Customer Hold',
    autoRenew: true,
    churnRisk: 'Semi-Active'
  },
  {
    id: '#SUB-2026-000128',
    version: 'v5',
    customerName: 'Sovereign Vault',
    customerDomain: 'sov-vault.ch',
    customerLogoBg: 'bg-purple-600',
    planName: 'Scale Enterprise Hybrid',
    tier: 'Metered (99.99%)',
    contractTerm: 'Mar 26, 2025 to Mar 25, 2026',
    nextBillingDate: 'Mar 25, 2026',
    nextBillingInDays: 4,
    status: 'Active',
    cadence: 'Monthly',
    cadenceValue: 18250.00,
    billingMode: 'Expiring in 4 days',
    autoRenew: true,
    churnRisk: 'Churn Risk'
  },
  {
    id: '#SUB-2026-000129',
    version: 'draft',
    customerName: 'Klarity Labs',
    customerDomain: 'klarity.ai',
    customerLogoBg: 'bg-indigo-600',
    planName: 'Starter Core Tier 1',
    tier: 'Basic Tier',
    contractTerm: 'TBD • 12 month commitment',
    nextBillingDate: 'Not Scheduled',
    status: 'Draft',
    cadence: 'Monthly',
    cadenceValue: 799.00,
    billingMode: 'Unpublished',
    autoRenew: false,
    churnRisk: 'Semi-Active'
  }
];

export const QUEUED_BILLING_ITEMS: QueuedBillingItem[] = [
  {
    id: 'q-1',
    subscriptionId: '#SUB-2026-000323',
    version: 'v2.4 Base Renewal',
    customerName: 'Nexora Cloud Systems',
    customerEmail: 'billing@demo.example',
    planTier: 'Enterprise Grid Tier (Monthly In Advance)',
    billingPeriod: 'Mar 01 - Mar 31, 2026',
    estimatedAmount: 28418.20,
    amountDetail: 'Base + Usage ($4,718.20)',
    validationStatus: 'Clean (Ready)'
  },
  {
    id: 'q-2',
    subscriptionId: '#SUB-2026-000324',
    version: 'Annual Compass',
    customerName: 'Vantage FinTech Corp',
    customerEmail: 'ap@demo.example',
    planTier: 'Growth Multi-Soul (Annual In Advance)',
    billingPeriod: 'Mar 01, 2026 - Feb 27, 2027',
    estimatedAmount: 24000.00,
    amountDetail: 'Flat Fee (Zero Tax)',
    validationStatus: 'Clean (Ready)'
  },
  {
    id: 'q-3',
    subscriptionId: '#SUB-2026-000325',
    version: 'Usage Metered',
    customerName: 'QuantumLogix AI',
    customerEmail: 'finance@demo.example',
    planTier: 'Scale Meter Plus (Monthly Arrears)',
    billingPeriod: 'Feb 01 - Feb 28, 2026',
    estimatedAmount: 22840.40,
    amountDetail: '+184% vs avg',
    validationStatus: 'Warning: High Usage Spike',
    warningMessage: 'Usage surge detected: compute consumed is 184% over past 3-month median.'
  },
  {
    id: 'q-4',
    subscriptionId: '#SUB-2026-000326',
    version: 'Founders Special',
    customerName: 'Helios Labs Inc',
    customerEmail: 'ops@demo.example',
    planTier: 'Professional Growth (Monthly In Advance)',
    billingPeriod: 'Mar 01 - Mar 31, 2026',
    estimatedAmount: 21499.00,
    amountDetail: 'Coupon 15% final cycle',
    validationStatus: 'Warning: Expiring Discount',
    warningMessage: 'Discount rule SPRING-26 will automatically expire after this invoice run.'
  },
  {
    id: 'q-5',
    subscriptionId: '#SUB-2026-000327',
    version: 'Standard B2B',
    customerName: 'Relichor Logistics Ltd',
    customerEmail: 'invoices@demo.example',
    planTier: 'Fleet Tracking Pro (Monthly In Advance)',
    billingPeriod: 'Mar 01 - Mar 31, 2026',
    estimatedAmount: 7850.00,
    amountDetail: 'Base Rate',
    validationStatus: 'Clean (Ready)'
  }
];

export const BILLING_RUN_HISTORY: BillingRunHistory[] = [
  {
    id: '#RUN-20260201-01',
    executedAt: 'Feb 01, 2026 00:00:01 UTC',
    triggerMode: 'Scheduled Cron',
    evaluated: 184,
    invoicesCreated: 184,
    skipped: 0,
    totalVolume: 518440.00,
    executionTime: '1.86s (Queue chunked in 100s)'
  },
  {
    id: '#RUN-20260101-01',
    executedAt: 'Jan 01, 2026 00:00:02 UTC',
    triggerMode: 'Scheduled Cron',
    evaluated: 176,
    invoicesCreated: 176,
    skipped: 0,
    totalVolume: 492180.00,
    executionTime: '1.62s (Queue chunked in 100s)'
  },
  {
    id: '#RUN-20251215-02',
    executedAt: 'Dec 15, 2025 14:15:39 UTC',
    triggerMode: 'Manual Catch-up',
    evaluated: 3,
    invoicesCreated: 2,
    skipped: 1,
    totalVolume: 6480.00,
    executionTime: '0.11s (Single run catchup)'
  }
];

export const PAYMENT_ENTRIES: PaymentEntry[] = [
  {
    id: '#PAY-0031',
    date: 'Feb 06, 2026 • 16:32:09',
    invoiceRef: '#INV-2026-00940',
    customerName: 'Vortex Robotics Ltd',
    planTier: 'Enterprise Plan',
    paymentMethod: 'Stripe: ACH',
    amountSettled: 5183.00,
    status: 'Settled',
    gateway: 'Stripe Direct'
  },
  {
    id: '#PAY-0030',
    date: 'Feb 01, 2026 • 09:11:24',
    invoiceRef: '#INV-2026-00891',
    customerName: 'Nordic Energy Data A/S',
    planTier: 'Copenhagen Main',
    paymentMethod: 'Stripe: Card',
    amountSettled: 18750.00,
    status: 'Settled',
    gateway: 'Stripe Direct'
  },
  {
    id: '#PAY-0029',
    date: 'Feb 01, 2026 • 10:43:12',
    invoiceRef: '#INV-2026-00870',
    customerName: 'Synthetix Health Corp',
    planTier: 'Annual Tier 1',
    paymentMethod: 'ACH Direct',
    amountSettled: 52190.00,
    status: 'Settled',
    gateway: 'PNC Bank ACH'
  },
  {
    id: '#PAY-0028',
    date: 'Feb 02, 2026 • 11:06:33',
    invoiceRef: '#INV-2026-00938',
    customerName: 'HyperScale Cloud Inc',
    planTier: 'Infrastructure',
    paymentMethod: 'Bank Wire',
    amountSettled: 15000.00,
    status: 'Partial',
    gateway: 'Chase Wire'
  },
  {
    id: '#PAY-0027',
    date: 'Feb 03, 2026 • 14:16:00',
    invoiceRef: '#INV-2026-00822',
    customerName: 'Solstice Logistics Ltd',
    planTier: 'Global Freight',
    paymentMethod: 'Wire Remittance',
    amountSettled: 7850.00,
    status: 'Settled',
    gateway: 'Barclays Wire'
  }
];

export const RECEIVABLES_ACCOUNTS: ReceivablesAccount[] = [
  {
    id: 'rec-1',
    customerName: 'Apex Dynamics Corp',
    customerEmail: 'billing@demo.example • Marcus Vance',
    tierTag: 'RE REQ',
    invoiceRef: '#INV-2026-00911',
    originationDate: 'Jan 02, 2026 (Monthly)',
    dueDate: 'Feb 15, 2026 • Net 30',
    terms: 'Net 30',
    agingBucket: '31-60 Days',
    agingDays: 42,
    balanceDue: 6850.00,
    totalInvoiceAmount: 11400.00,
    dunningStage: 'Stage 3: Service Throttled'
  },
  {
    id: 'rec-2',
    customerName: 'Nordic Fleet Logistics',
    customerEmail: 'ap@demo.example • Astrid Lind',
    tierTag: 'TIER B',
    invoiceRef: '#INV-2026-0914',
    originationDate: 'Jan 09, 2026 (Quarterly)',
    dueDate: 'Feb 20, 2026 • Net 30',
    terms: 'Net 30',
    agingBucket: '1-30 Days',
    agingDays: 26,
    balanceDue: 9420.00,
    totalInvoiceAmount: 9420.00,
    dunningStage: 'Stage 2: Auto-Retry Pending'
  },
  {
    id: 'rec-3',
    customerName: 'Vanguard Quantum Labs',
    customerEmail: 'finance@demo.example • Chen Wei',
    tierTag: 'APAC',
    invoiceRef: '#INV-2026-1022',
    originationDate: 'Feb 20, 2026 (Monthly)',
    dueDate: 'Mar 22, 2026 • Net 30',
    terms: 'Net 30',
    agingBucket: '1-30 Days',
    agingDays: 2,
    balanceDue: 2150.00,
    totalInvoiceAmount: 7150.00,
    dunningStage: 'Stage 1: Courtesy Ping'
  },
  {
    id: 'rec-4',
    customerName: 'Helios Cloud Infra',
    customerEmail: 'invoices@demo.example • Sarah Jenkins',
    tierTag: 'RE OPS',
    invoiceRef: '#INV-2026-1188',
    originationDate: 'Feb 26, 2026 (Annual)',
    dueDate: 'Mar 28, 2026 • Net 30',
    terms: 'Net 30',
    agingBucket: 'Current',
    balanceDue: 32400.00,
    totalInvoiceAmount: 32400.00,
    dunningStage: 'Pre-due Ping Scheduled'
  },
  {
    id: 'rec-5',
    customerName: 'Aura BioTech Group',
    customerEmail: 'payable@demo.example • Liam Dubois',
    tierTag: 'CH TIER',
    invoiceRef: '#INV-2026-1190',
    originationDate: 'Mar 02, 2026 (Monthly)',
    dueDate: 'Apr 01, 2026 • Net 30',
    terms: 'Net 30',
    agingBucket: 'Current',
    balanceDue: 21500.00,
    totalInvoiceAmount: 21500.00,
    dunningStage: 'Pre-due Ping Scheduled'
  }
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    sku: 'BR-0008-ENT-09',
    name: 'Enterprise Core Platform',
    type: 'Software Platform',
    salesBasePrice: 2499.00,
    costPrice: 650.00,
    marginPercent: 74.0,
    variantsCount: 3,
    internalNotes: 'Core multitenant billing orchestration engine with SOC2 audit hooks and high-concurrency ledger pipelines.',
    variants: [
      { id: 'v-1', attribute: 'Brand', value: 'Odoo Edition', extraPrice: 560.00, effectivePrice: 3059.00 },
      { id: 'v-2', attribute: 'Region', value: 'EU Dedicated Cluster', extraPrice: 350.00, effectivePrice: 2849.00 },
      { id: 'v-3', attribute: 'Support', value: '24/7 Priority SLA', extraPrice: 400.00, effectivePrice: 2899.00 }
    ]
  },
  {
    id: 'prod-2',
    sku: 'SLA-TAM-247-P1',
    name: 'Technical Account Manager (TAM) SLA',
    type: 'Professional Service',
    salesBasePrice: 2250.00,
    costPrice: 900.00,
    marginPercent: 60.0,
    variantsCount: 1,
    internalNotes: 'Assigned Principal Site Reliability Architect with quarterly kernel reviews.',
    variants: [
      { id: 'v-tam-1', attribute: 'Coverage', value: 'Global 24/7/365', extraPrice: 0.00, effectivePrice: 2250.00 }
    ]
  },
  {
    id: 'prod-3',
    sku: 'VPC-SRV-33C',
    name: 'Dedicated Cloud VPC Gateway',
    type: 'Infrastructure',
    salesBasePrice: 1150.00,
    costPrice: 320.00,
    marginPercent: 72.2,
    variantsCount: 4,
    internalNotes: 'Private BGP peering and dedicated IP address pool with automated failover.',
    variants: [
      { id: 'v-vpc-1', attribute: 'Bandwidth', value: '10 Gbps Pipe', extraPrice: 450.00, effectivePrice: 1600.00 },
      { id: 'v-vpc-2', attribute: 'Multi-Region', value: 'Active-Active Replica', extraPrice: 650.00, effectivePrice: 1800.00 }
    ]
  },
  {
    id: 'prod-4',
    sku: 'API-GW-PULSE',
    name: 'API Metered High-Throughput Gateway',
    type: 'Add-on',
    salesBasePrice: 490.00,
    costPrice: 115.00,
    marginPercent: 76.5,
    variantsCount: 2,
    internalNotes: 'Rate-limit bypass with 15k req/sec burst capacity and cryptographic signature verification.',
    variants: [
      { id: 'v-api-1', attribute: 'Rate Limit', value: '50k Req/sec', extraPrice: 300.00, effectivePrice: 790.00 }
    ]
  }
];

export const TAX_REGIMES: TaxRegime[] = [
  {
    id: 'tx-1',
    code: 'TX-IN-GST-18',
    name: 'GST 18% (Standard Dual)',
    rate: 18.00,
    type: 'Exclusive',
    sacHsnCode: '998314',
    regionalSplitRule: 'CGST 9% + SGST 9% (Intra-state); IGST 18% (Inter-state)',
    appliesScope: 'All Products by default',
    isDefault: true
  },
  {
    id: 'tx-2',
    code: 'TX-IN-GST-05',
    name: 'GST 5% (Reduced Hardware)',
    rate: 5.00,
    type: 'Exclusive',
    sacHsnCode: '847130',
    regionalSplitRule: 'CGST 2.5% + SGST 2.5%; IGST 5%',
    appliesScope: 'Category: Physical Terminals & Hardware'
  },
  {
    id: 'tx-3',
    code: 'TX-EU-OSS-20',
    name: 'VAT 20% (EU B2B Reverse Charge)',
    rate: 20.00,
    type: 'Inclusive',
    sacHsnCode: 'EU-DIGITAL-01',
    regionalSplitRule: 'Reverse Charge Mechanism on valid VIES VAT ID',
    appliesScope: 'EU Regional Accounts'
  },
  {
    id: 'tx-4',
    code: 'TX-US-CAL-725',
    name: 'US Sales Tax (California Nexus)',
    rate: 7.25,
    type: 'Exclusive',
    sacHsnCode: 'US-SaaS-Tax',
    regionalSplitRule: 'State 6.00% + Mandatory Local Add-on 1.25%',
    appliesScope: 'Nexus: California, USA'
  },
  {
    id: 'tx-5',
    code: 'TX-EXP-LUT-00',
    name: 'Zero-Rated Export (0%)',
    rate: 0.00,
    type: 'Zero-Levy',
    sacHsnCode: 'LUT-EXP-2026',
    regionalSplitRule: 'Supplied under Letter of Undertaking (LUT)',
    appliesScope: 'International cross-border contracts'
  }
];

export const DISCOUNT_RULES: DiscountRule[] = [
  {
    id: 'disc-1',
    name: 'Early Adopter Scale',
    code: 'SPRING-26',
    type: 'percentage',
    value: 15,
    appliesTo: 'Whole subscription subtotal',
    window: 'Jan 01 - Apr 30, 2026',
    daysLeft: 41,
    usageCount: 428,
    usageLimit: 500,
    minSubtotal: 500.00,
    targetScope: 'Whole Subscription Subtotal',
    startDate: '2026-01-01',
    endDate: '2026-04-30',
    status: 'Active'
  },
  {
    id: 'disc-2',
    name: 'Enterprise Cloud Kickstart',
    code: 'Q1-ENTERPRISE-15',
    type: 'fixed',
    value: 250.00,
    appliesTo: 'Specific: Odoo Core, Cloud VPC (min 2 units)',
    window: 'Feb 01 - May 31, 2026',
    daysLeft: 72,
    usageCount: 96,
    usageLimit: 200,
    minSubtotal: 2000.00,
    minQuantity: 2,
    targetScope: 'Specific Line Items',
    startDate: '2026-02-01',
    endDate: '2026-05-31',
    status: 'Active'
  },
  {
    id: 'disc-3',
    name: 'Founders Club Inaugural',
    code: 'FOUNDER-100',
    type: 'fixed',
    value: 100.00,
    appliesTo: 'Whole subscription (Recurring 3 Cycles)',
    window: 'Jan 10 - Mar 20, 2026 (Expiring in 2d)',
    daysLeft: 2,
    usageCount: 300,
    usageLimit: 300,
    minSubtotal: 200.00,
    targetScope: 'Whole Subscription Subtotal',
    startDate: '2026-01-10',
    endDate: '2026-03-20',
    status: 'Exhausted'
  },
  {
    id: 'disc-4',
    name: 'Summer Partner Ingest',
    code: 'PARTNER-JUN26',
    type: 'percentage',
    value: 20,
    appliesTo: 'Specific: Database Clusters (One-off first bill)',
    window: 'Jun 01 - Aug 31, 2026 (Starts in 74d)',
    daysLeft: 74,
    usageCount: 0,
    usageLimit: 1000,
    minSubtotal: 1000.00,
    targetScope: 'Specific Line Items',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    status: 'Scheduled'
  },
  {
    id: 'disc-5',
    name: 'Cyber Monday 2025 Archive',
    code: 'CYBER-25-HIST',
    type: 'percentage',
    value: 30,
    appliesTo: 'Whole subscription min $150.00',
    window: 'Nov 24 - Dec 01, 2025',
    usageCount: 482,
    usageLimit: 500,
    minSubtotal: 150.00,
    targetScope: 'Whole Subscription Subtotal',
    startDate: '2025-11-24',
    endDate: '2025-12-01',
    status: 'Expired'
  }
];

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-1',
    name: 'Elena Rostova',
    email: 'elena@demo.example',
    role: 'Admin',
    isCurrentUser: true,
    accessScope: 'Full Platform Clearance: Taxes, Billing, Audit, RevOps',
    twoFactor: 'Hardware Key (YubiKey 5C NFC)',
    lastLogin: 'Just now',
    location: 'Austin, US',
    ip: '192.0.2.13',
    status: 'Active'
  },
  {
    id: 'staff-2',
    name: 'Devon Miles',
    email: 'devon.miles@demo.example',
    role: 'Admin',
    accessScope: 'Full Platform Clearance: Tier-1 Revenue & Finance',
    twoFactor: 'Hardware Key (YubiKey 5C)',
    lastLogin: '14 mins ago',
    location: 'Seattle, US',
    ip: '192.0.2.13',
    status: 'Active'
  },
  {
    id: 'staff-3',
    name: 'Marcus Vance',
    email: 'm.vance@demo.example',
    role: 'Staff',
    accessScope: 'Revenue Ops Scoped: Invoices, Subscriptions, Payments',
    twoFactor: 'TOTP Authenticator',
    lastLogin: '1 hr ago',
    location: 'London, UK',
    ip: '192.0.2.3',
    status: 'Active'
  },
  {
    id: 'staff-4',
    name: 'Astrid Lind',
    email: 'astrid.lind@demo.example',
    role: 'Staff',
    accessScope: 'Revenue Ops Scoped: Billing Run & Receivables',
    twoFactor: 'Hardware Key (FIDO2)',
    lastLogin: '3 hrs ago',
    location: 'Stockholm, SE',
    ip: '192.0.2.13',
    status: 'Active'
  },
  {
    id: 'staff-5',
    name: 'Chen Wei',
    email: 'chen.wei@demo.example',
    role: 'Staff',
    accessScope: 'Revenue Ops Scoped: Payments Ledger',
    twoFactor: 'TOTP Authenticator',
    lastLogin: 'Yesterday',
    location: 'Singapore, SG',
    ip: '192.0.2.8',
    status: 'Active'
  },
  {
    id: 'staff-6',
    name: 'Sophia Martinez',
    email: 's.martinez@demo.example',
    role: 'Staff',
    accessScope: 'Pending CIAM: Revenue Ops Scoped',
    twoFactor: 'Pending Setup on Onboarding',
    lastLogin: 'Never logged in',
    location: 'New York, US',
    ip: 'Invited (expires in 4d)',
    status: 'Invited'
  }
];
