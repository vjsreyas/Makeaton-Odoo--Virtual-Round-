# Brightloop – Subscription Management System

A multi-tenant SaaS platform designed to manage products, subscription plans, customers, recurring billing, invoices, payments, and business operations through a unified system.

---

## 1. Project Overview

Brightloop is a subscription management platform that enables multiple independent businesses to manage their subscription-based operations from a single software ecosystem.

The platform follows a **multi-tenant architecture**, where the software owner manages multiple businesses, and each business independently manages its own products, plans, employees, customers, subscriptions, invoices, and payments.

### Core Objectives

- Centralise subscription and recurring billing management.
- Automate invoice generation and payment tracking.
- Manage products, variants, plans, taxes, and discounts.
- Provide role-based access control.
- Offer businesses independent workspaces.
- Provide customers with a self-service portal.
- Generate real-time financial reports and analytics.

---

# 2. System Architecture

Brightloop consists of three application environments and four account types.

### 2.1 Platform Admin

The owner and administrator of the Brightloop software platform.

Responsibilities:
- Manage registered businesses.
- Create and manage business accounts.
- Assign software access and licensing.
- Manage platform employees.
- Configure platform-level permissions.
- Monitor platform-wide analytics.
- Manage platform settings and operations.

### 2.2 Business Admin

The owner or administrator of an individual business using Brightloop.

Responsibilities:
- Manage business products and variants.
- Create and configure subscription plans.
- Manage customers.
- Create quotations and subscriptions.
- Manage invoices and payments.
- Configure discounts and taxes.
- Add and manage business employees.
- Assign employee permissions.
- Monitor business revenue and performance.

### 2.3 Business Staff

Employees working under a particular business.

Responsibilities:
- Handle daily business operations.
- Manage customers and subscriptions according to permissions.
- Create and manage quotations.
- Handle invoices and payment records.
- View products and plans.
- Access permitted business reports.

Staff cannot manage business configuration or create/manage other users by default.

### 2.4 End Customer

An individual or organisation purchasing subscriptions from a business.

Responsibilities:
- View personal subscriptions.
- Track upcoming renewals.
- Access invoices.
- Make payments.
- View payment history.
- Manage personal account information.

---

# 3. Role-Based Access Control

| Feature | Platform Admin | Business Admin | Staff | Customer |
|---|---|---|---|---|
| Manage businesses | Yes | No | No | No |
| Create business accounts | Yes | No | No | No |
| Manage platform staff | Yes | No | No | No |
| Manage business team | No | Yes | No | No |
| Manage products | No | Yes | View | No |
| Manage plans | No | Yes | View | No |
| Manage customers | No | Yes | Yes | Own profile |
| Manage subscriptions | No | Yes | Yes | Own only |
| Manage quotations | No | Yes | Yes | View received |
| Manage invoices | No | Yes | Yes | Own only |
| Record payments | No | Yes | Yes | Pay own invoice |
| Manage discounts | No | Yes | View | No |
| Manage taxes | No | Yes | View | No |
| View business analytics | Platform-wide | Own business | Limited | Own summary |

Permissions must be enforced on both frontend routes and backend APIs.

Business staff permissions should be configurable through business-level roles.

---

# 4. Public and Authentication Pages

## 4.1 Sign Up

Features:
- Full name.
- Email address.
- Password.
- Confirm password.
- Unique email validation.
- Inline validation errors.
- Live password-strength checklist.
- Email verification.

Password requirements:
- More than 8 characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one special character.

Public registration creates Customer-role accounts only.

Business accounts and staff accounts must be created through authorised administrative workflows.

## 4.2 Login

Features:
- Email and password authentication.
- Forgot-password link.
- Session management.
- Authentication error handling.
- Role-based redirection.

Redirection:
- Platform Admin → Platform Dashboard.
- Business Admin → Business Dashboard.
- Staff → Business Dashboard.
- Customer → Customer Portal.

## 4.3 Forgot Password

- Email input.
- Send password reset link.
- Generic success message regardless of whether the email exists.

## 4.4 Reset Password

- Token validation.
- Token expiry handling.
- New password.
- Confirm password.
- Live password validation.
- Success confirmation.

---

# 5. Platform Admin Dashboard

The Platform Admin manages the entire Brightloop ecosystem.

## 5.1 Platform Overview

Features:
- Total registered businesses.
- Active businesses.
- Suspended businesses.
- Inactive businesses.
- New business registrations.
- Total platform users.
- Business growth charts.
- Recent business registrations.
- Recent platform activity.
- Platform-wide usage statistics.

## 5.2 Business Management

### Business Directory
- View all businesses.
- Search by business name.
- Filter by status.
- Filter by registration date.
- Pagination and sorting.

### Create Business
- Business name.
- Business email.
- Contact number.
- Business address.
- Business Admin name.
- Business Admin email.
- Initial account invitation.
- Account activation.

### Business Details
- Business profile.
- Assigned Business Admin.
- Registered staff.
- Registration date.
- Account status.
- Business usage statistics.

### Business Controls
- Edit business details.
- Activate business.
- Suspend business.
- Deactivate business.
- Reactivate business.

## 5.3 Business Access and Licensing

Applicable if Brightloop follows a paid SaaS licensing model.

Features:
- Assign software plans.
- Set subscription start and expiry dates.
- Track active licences.
- Renew licences.
- Track expired licences.
- Suspend access when appropriate.
- View platform-level billing history.

## 5.4 Platform Team Management

- View platform employees.
- Add platform staff.
- Edit staff profiles.
- Assign platform roles.
- Activate/deactivate accounts.
- Manage platform permissions.

## 5.5 Platform Roles and Permissions

- Create roles.
- Edit roles.
- Assign module permissions.
- Configure access restrictions.
- Manage sensitive administrative permissions.

## 5.6 Platform Analytics and Reports

- Business registration growth.
- Active vs inactive businesses.
- Business retention.
- Platform user growth.
- Software usage statistics.
- Licensing revenue, if applicable.
- Export CSV/PDF reports.

## 5.7 Platform Activity Logs

- Business creation.
- Business activation/suspension.
- Staff creation.
- Role changes.
- Permission changes.
- Login history.
- Timestamp.
- Action performed by.
- Search and filtering.

## 5.8 Platform Notifications and Support

- View business support requests.
- Track unresolved tickets.
- Send platform announcements.
- Notify individual businesses.
- Account alerts.
- Licensing expiry alerts, if applicable.

## 5.9 Platform Settings

- Platform name and branding.
- Logo.
- Email configuration.
- Authentication settings.
- Security configuration.
- Global preferences.

---

# 6. Business Dashboard

Each business receives an independent workspace with isolated data and team management.

## 6.1 Business Overview / Dashboard

### KPI Cards
- Active subscriptions.
- Total revenue.
- Payments received.
- Outstanding amount.
- Overdue invoice count.

### Charts
- Revenue over time.
- Subscriptions by status.
- Monthly Recurring Revenue (MRR).

### Additional Information
- Overdue invoices table.
- Recent payments.
- Recent subscriptions.
- Upcoming renewals.

### Filters
- Date range.
- Product.
- Plan.
- Customer.
- Subscription status.

### Actions
- Export CSV/PDF.
- View detailed reports.
- Navigate to overdue invoices.

### Performance Requirement
Dashboard should load in under two seconds under normal operating conditions.

Implementation:
- Server-side aggregation.
- Indexed database queries.
- Pagination.
- Caching.

## 6.2 Products

### Product Listing
- Product directory.
- Search.
- Filter by product type.
- Pagination.
- Product status.

### Create/Edit Product
- Product name.
- Product type.
- Sales price.
- Cost price.
- Notes.

### Product Variants
- Attribute name (e.g. Brand).
- Attribute value (e.g. Odoo).
- Additional price (e.g. +560).
- Add/remove variants.
- Variant-specific pricing.

Permissions:
- Business Admin: Create, edit and delete.
- Staff: View only by default.

## 6.3 Plans

### Plan Listing
- Plan directory.
- Search.
- Filter by billing period.
- Active/expired status.

### Create/Edit Plan
- Plan name.
- Price.
- Billing period:
  - Daily.
  - Weekly.
  - Monthly.
  - Yearly.
- Minimum quantity.
- Available-from date.
- Available-to date.

### Plan Configuration
- Auto-close on expiry.
- Allow early closure.
- Allow pause.
- Allow renewal.

Permissions:
- Business Admin: Full management.
- Staff: View only.

## 6.4 Quotation Templates

Features:
- View templates.
- Create template.
- Edit template.
- Delete template.
- Template name.
- Validity period in days.
- Default plan.
- Product lines.
- Product variants.
- Default quantities.
- Use template to create a prefilled subscription draft.

## 6.5 Quotations

### Quotation Listing
- Quotation number.
- Customer.
- Plan.
- Created date.
- Expiry date.
- Total.
- Status.

### Quotation Details
- Customer details.
- Product lines.
- Quantities.
- Taxes.
- Discounts.
- Total amount.
- Validity period.

### Actions
- Create quotation.
- Edit quotation.
- Preview.
- Send to customer.
- Track validity.
- Mark expired.
- Convert accepted quotation into a subscription.

## 6.6 Subscriptions

### Subscription Listing

Columns:
- Subscription number.
- Customer.
- Plan.
- Start date.
- Expiry date.
- Status.
- Total amount.

### Filters
- Status.
- Customer.
- Plan.
- Date range.

### Actions
- New subscription.
- Create from template.
- Search by subscription number.
- Bulk actions.
- Export records.

### Subscription Status Workflow

Draft → Quotation → Confirmed → Active → Closed

Paused is a separate state that can transition back to Active where permitted.

## 6.7 Subscription Details / Form

### Basic Information
- Auto-generated subscription number.
- Customer picker.
- Plan selector.
- Start date.
- Expiry date.
- Payment terms.
- Template used.

### Order Lines

| Field | Function |
|---|---|
| Product | Select product |
| Variant | Select variant |
| Quantity | Set quantity |
| Unit price | Product price |
| Tax | Applicable tax |
| Discount | Applicable discount |
| Amount | Calculated total |

### Additional Features
- Automatic subtotal.
- Tax calculation.
- Discount calculation.
- Final total.
- Status stepper.
- Allowed transition buttons.
- Pause subscription.
- Resume subscription.
- Close early.
- Renew subscription.

### Tabs
- Overview.
- Invoices.
- Payments.
- Activity history.

Additional action:
- Manual invoice generation.
- Automatic recurring invoice generation through the billing scheduler.

## 6.8 Renewal Management

- Upcoming renewals.
- Expired subscriptions.
- Renewal eligibility.
- Renewal date.
- Renewal history.
- Renew subscription.
- Handle renewal pricing.
- Renewal notifications.

Renewal actions should only be available when permitted by the relevant plan.

## 6.9 Invoices

### Invoice Listing

Columns:
- Invoice number.
- Customer.
- Subscription.
- Issue date.
- Due date.
- Total.
- Paid.
- Balance.
- Status.

### Filters
- Status.
- Overdue.
- Customer.
- Date range.

### Actions
- Confirm.
- Send.
- Print.
- Download.
- Bulk confirmation and sending.

## 6.10 Invoice Details

### Invoice Information
- Invoice number.
- Customer information.
- Subscription reference.
- Issue date.
- Due date.
- Product lines.
- Taxes.
- Discounts.
- Subtotal.
- Total.
- Amount paid.
- Outstanding balance.

### Invoice Statuses
- Draft.
- Confirmed.
- Partially Paid.
- Paid.
- Cancelled.

Overdue and due-soon indicators are separate flags.

### Actions
- Confirm invoice.
- Cancel invoice.
- Send by email.
- Print/download PDF.
- Record payment.

Once confirmed, financial line items become read-only. Corrections should use an appropriate cancellation or adjustment workflow.

## 6.11 Billing Run

The monitoring centre for recurring invoice generation.

Features:
- Subscriptions due today.
- Subscriptions due in selected billing period.
- Billing preview.
- Generate all invoices.
- Created count.
- Skipped count.
- Failed count.
- Error details.
- Retry failed billing jobs.
- Manual billing execution.

Backend requirements:
- Scheduled billing job.
- Unique billing-period key.
- Duplicate invoice prevention.
- Transaction-safe invoice generation.
- Billing execution history.

## 6.12 Payments

### Payment Listing
- Payment reference.
- Customer.
- Invoice.
- Payment method.
- Amount.
- Date.
- Status.

### Record Payment
- Invoice selection.
- Payment method:
  - Cash.
  - Card.
  - Bank transfer.
  - UPI.
  - Other.
- Amount.
- Payment date.
- Notes.

### Additional Workflows
- Partial payments.
- Multiple payments per invoice.
- Payment reconciliation.
- Failed payment records.
- Unallocated payments.
- Refund/reversal records.
- Payment receipts.

Invoice balance and payment status should update automatically.

## 6.13 Outstanding and Overdue

Features:
- All unpaid invoices.
- Outstanding balance.
- Overdue invoices.
- Days overdue.
- Customer information.
- Amount due.

### Ageing Groups
- 1–30 days.
- 31–60 days.
- 60+ days.

### Actions
- Send payment reminder.
- View invoice.
- View customer.
- Track reminder history.

## 6.14 Customers

### Customer Listing
- Customer name.
- Email.
- Phone.
- Registration date.
- Account status.
- Outstanding amount.

### Customer Details
- Contact information.
- Subscriptions.
- Invoices.
- Payment history.
- Total outstanding.
- Customer activity.

### Actions
- Create customer.
- Edit customer.
- Search/filter.
- Link an existing portal account.
- Send account invitation.
- Manage account status.

## 6.15 Discounts

Business Admin only.

Features:
- Discount name.
- Fixed amount or percentage.
- Minimum purchase amount.
- Minimum quantity.
- Start date.
- End date.
- Usage limit.
- Used-count display.
- Applicable products.
- Whole-subscription discounts.
- Active/expired/exhausted status.

### Automatic Discount Engine
- Apply eligible discounts to the next invoice.
- Validate minimum requirements.
- Enforce usage limits.
- Stop applying expired discounts.
- Record discount usage.

## 6.16 Taxes

Business Admin only.

Features:
- Tax name.
- Tax rate.
- Inclusive/exclusive tax type.
- Applicable products.
- Create/edit/delete tax rules.
- Automatic calculation on subscription lines and invoices.

## 6.17 Business Team Management

Business Admin only.

Features:
- View employees.
- Invite staff members.
- Add staff accounts.
- Edit employee information.
- Activate/deactivate staff.
- Assign roles.
- Configure permissions.

Possible roles:
- Business Admin.
- Sales Executive.
- Finance Executive.
- Support Staff.

## 6.18 Business Roles and Permissions

Features:
- Create custom roles.
- Edit roles.
- Assign module permissions.
- Control create/edit/delete access.
- Restrict financial operations.
- Configure staff access.

Example:
A Sales Executive can create quotations and subscriptions but cannot modify tax configurations or manage employees.

## 6.19 Business Settings

Features:
- Company details.
- Business logo.
- Contact information.
- Invoice numbering prefix.
- Subscription numbering prefix.
- Default payment terms.
- Email preferences.
- Reminder schedules.
- Billing preferences.

## 6.20 Business Notifications

- Upcoming renewal alerts.
- New customer registration.
- Invoice generation notifications.
- Payment received notifications.
- Failed billing alerts.
- Overdue invoice reminders.
- Team activity notifications.

## 6.21 Business Audit Logs

- Subscription status changes.
- Invoice status changes.
- Payments recorded.
- Discount usage.
- Customer changes.
- Team member actions.
- Role/permission changes.
- Timestamp and user information.

---

# 7. Customer Portal

A separate customer-facing interface with restricted access.

## 7.1 Portal Home

- Active subscriptions.
- Upcoming renewals.
- Outstanding balance.
- Recent invoices.
- Recent payments.
- Important notifications.

## 7.2 My Subscriptions

### Listing
- Subscription number.
- Plan.
- Start date.
- Expiry date.
- Status.
- Next billing date.

### Details
- Plan information.
- Product lines.
- Quantity.
- Pricing.
- Renewal information.
- Subscription history.

### Self-Service Actions
- Request pause.
- Request early closure.
- Renew.
- Resume.

Only show actions allowed by the plan and business policy.

## 7.3 My Invoices

- Invoice listing.
- Invoice details.
- Invoice status.
- Due date.
- Total amount.
- Paid amount.
- Remaining balance.
- Download PDF.
- View payment history.

## 7.4 Payments and Checkout

### Pay Invoice
- Select outstanding invoice.
- View amount due.
- Choose available payment method.
- Complete payment through payment gateway.
- Receive confirmation.

### Payment History
- Payment reference.
- Date.
- Amount.
- Method.
- Linked invoice.
- Status.
- Download receipt.

## 7.5 My Profile

- View/edit personal details.
- Email information.
- Contact number.
- Change password.
- Account settings.
- Logout.

---

# 8. Cross-Cutting System Features

| Feature | Implementation |
|---|---|
| Role-based access | Middleware on frontend routes and backend APIs |
| Tenant isolation | Every business-owned record associated with business_id |
| Authentication | Secure sessions, password hashing and token validation |
| Numbering | Automatic subscription and invoice sequences |
| Status machines | Server-enforced valid state transitions |
| Recurring billing | Scheduled background jobs |
| Idempotency | Unique subscription + billing-period invoice key |
| Tax calculations | Backend calculation engine |
| Discount engine | Automatic eligibility and usage validation |
| Payment processing | Gateway integration and manual payment recording |
| Audit logging | Track important changes and financial operations |
| Email service | Password resets, invoices and reminders |
| Notifications | In-app and email notifications |
| Search | Server-side searching and filtering |
| Pagination | All large data listings |
| Performance | Database indexes, aggregation and caching |
| File management | Invoice PDFs, receipts and exports |
| Error handling | Validation, loading, empty and error states |

---

# 9. Database Architecture

The database must support multiple independent businesses.

### High-Level Structure

```text
Platform
│
├── Platform Admins
├── Platform Staff
│
└── Businesses
    │
    ├── Business A
    │   ├── Business Admin
    │   ├── Business Staff
    │   ├── Roles & Permissions
    │   ├── Products
    │   ├── Plans
    │   ├── Customers
    │   ├── Quotations
    │   ├── Subscriptions
    │   ├── Invoices
    │   ├── Payments
    │   ├── Discounts
    │   └── Taxes
    │
    └── Business B
        ├── Business Admin
        ├── Business Staff
        ├── Roles & Permissions
        ├── Products
        ├── Plans
        ├── Customers
        ├── Quotations
        ├── Subscriptions
        ├── Invoices
        ├── Payments
        ├── Discounts
        └── Taxes
```

### Recommended Core Database Entities

- users
- businesses
- business_memberships
- roles
- permissions
- customers
- products
- product_variants
- plans
- quotation_templates
- quotations
- subscriptions
- subscription_lines
- invoices
- invoice_lines
- payments
- discounts
- discount_usages
- taxes
- notifications
- audit_logs
- billing_runs

### Important Database Rules

1. User accounts and business memberships must be separate concepts.
2. Users can belong to businesses through memberships with specific roles.
3. Business-owned records must be isolated using business_id.
4. Customer portal accounts must be linked to the correct business customer record.
5. Platform Admin permissions must be separate from Business Admin permissions.
6. A customer must not be able to access another business's data.
7. Customer registration must identify the correct business through an invitation or business-specific registration link.

---

# 10. Frontend Route Structure

```text
/
│
├── /auth
│   ├── /signup
│   ├── /login
│   ├── /forgot-password
│   └── /reset-password
│
├── /platform
│   ├── /dashboard
│   ├── /businesses
│   ├── /businesses/new
│   ├── /businesses/:id
│   ├── /licensing
│   ├── /team
│   ├── /roles
│   ├── /analytics
│   ├── /activity-logs
│   ├── /support
│   ├── /notifications
│   └── /settings
│
├── /business
│   ├── /dashboard
│   ├── /products
│   ├── /plans
│   ├── /quotation-templates
│   ├── /quotations
│   ├── /subscriptions
│   ├── /renewals
│   ├── /invoices
│   ├── /billing-runs
│   ├── /payments
│   ├── /outstanding
│   ├── /customers
│   ├── /discounts
│   ├── /taxes
│   ├── /team
│   ├── /roles
│   ├── /notifications
│   ├── /audit-logs
│   └── /settings
│
├── /portal
│   ├── /dashboard
│   ├── /subscriptions
│   ├── /invoices
│   ├── /payments
│   └── /profile
│
└── /403
```

Detail views and create/edit forms can be nested routes or drawers within their respective modules.

---

# 11. Development Roadmap

Development should follow functional dependencies rather than building every page simultaneously.

## Phase 1 – Foundation and Authentication

- [ ] Project structure.
- [ ] Design system.
- [ ] Authentication.
- [ ] Role-based access.
- [ ] Multi-tenant database foundation.
- [ ] Dashboard layouts.

## Phase 2 – Platform Admin

- [ ] Platform overview.
- [ ] Business management.
- [ ] Business creation.
- [ ] Platform team.
- [ ] Platform permissions.
- [ ] Platform settings.

## Phase 3 – Business Configuration

- [ ] Business dashboard.
- [ ] Products.
- [ ] Product variants.
- [ ] Plans.
- [ ] Taxes.
- [ ] Discounts.
- [ ] Team management.

## Phase 4 – Sales and Subscriptions

- [ ] Customers.
- [ ] Quotation templates.
- [ ] Quotations.
- [ ] Subscription creation.
- [ ] Subscription management.
- [ ] Renewals.
- [ ] Pause/resume workflows.

## Phase 5 – Billing and Payments

- [ ] Invoice generation.
- [ ] Billing scheduler.
- [ ] Billing runs.
- [ ] Payment recording.
- [ ] Payment gateway.
- [ ] Outstanding tracking.
- [ ] Payment reminders.

## Phase 6 – Customer Portal

- [ ] Customer authentication.
- [ ] Portal dashboard.
- [ ] My subscriptions.
- [ ] My invoices.
- [ ] Checkout.
- [ ] Payment history.
- [ ] Profile.

## Phase 7 – Analytics and Finalisation

- [ ] Business reports.
- [ ] Platform reports.
- [ ] Audit logs.
- [ ] Notifications.
- [ ] CSV/PDF exports.
- [ ] Performance optimisation.
- [ ] Security testing.

---

# 12. Project Scope Summary

| Area | Page Groups |
|---|---:|
| Authentication | 4 |
| Platform Admin | 9 |
| Business Dashboard | 21 |
| Customer Portal | 5 |
| **Total** | **39** |

Note: Page groups are functional navigation modules, not necessarily individual URLs. Some workflows, details and forms will be implemented as tabs, drawers or nested views.

### Additional System Components

- Multi-tenant data architecture.
- Role-based access control.
- Recurring billing engine.
- Tax and discount calculation engine.
- Payment gateway integration.
- Background scheduling.
- Email and notification services.
- Audit logging.
- Reporting and analytics.
- Performance and security infrastructure.

---

# 13. Scope Boundaries and Important Notes

- Platform-level licensing and billing are conditional on the final SaaS business model.
- The original project brief does not explicitly require Brightloop to charge businesses for software access.
- Payment gateway integration requires selecting an actual provider.
- Customer registration must be associated with the correct business.
- Financial calculations must be performed and validated server-side.
- Frontend visibility restrictions must never replace backend authorisation.
- Confirmed invoices should not be silently edited.
- Billing operations must be idempotent to prevent duplicate invoices.
- All business data must remain isolated between tenants.

---

## Final Development Principle

Build Brightloop as a unified, multi-tenant SaaS platform with three distinct application experiences:

1. Platform Admin – Controls the software ecosystem.
2. Business Dashboard – Manages individual subscription businesses.
3. Customer Portal – Allows end customers to manage their subscriptions.

Prioritise correct architecture, tenant isolation, reliable billing and financial accuracy over unnecessary feature expansion.

**This document serves as the functional scope and development blueprint for the Brightloop Subscription Management System.**