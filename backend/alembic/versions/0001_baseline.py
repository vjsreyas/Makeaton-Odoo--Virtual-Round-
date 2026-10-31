"""baseline schema

Revision ID: 0001
Revises:
Create Date: 2026-10-31
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PK = "id uuid PRIMARY KEY DEFAULT gen_random_uuid()"
BIZ = "business_id uuid NOT NULL REFERENCES businesses (id)"
TS = "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()"
TENANT_UNIQUE = "UNIQUE (business_id, id)"


def fk(table: str, col: str, parent: str) -> str:
    return (
        f"CONSTRAINT fk_{table}_{col} FOREIGN KEY (business_id, {col}) "
        f"REFERENCES {parent} (business_id, id)"
    )


def variant_fk(table: str) -> str:
    return (
        f"CONSTRAINT fk_{table}_variant FOREIGN KEY (business_id, product_id, variant_id) "
        "REFERENCES product_variants (business_id, product_id, id)"
    )


TABLES = [
    f"""CREATE TABLE users (
        {PK},
        email citext NOT NULL,
        password_hash text,
        full_name text NOT NULL,
        is_platform_admin boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        token_version integer NOT NULL DEFAULT 0,
        last_login_at timestamptz,
        {TS},
        CONSTRAINT uq_users_email UNIQUE (email),
        CONSTRAINT ck_users_token_version CHECK (token_version >= 0)
    )""",
    f"""CREATE TABLE businesses (
        {PK},
        name text NOT NULL,
        slug text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        timezone text NOT NULL DEFAULT 'Asia/Kolkata',
        currency char(3) NOT NULL DEFAULT 'INR',
        auto_confirm_invoices boolean NOT NULL DEFAULT false,
        default_payment_terms_days smallint NOT NULL DEFAULT 15,
        customer_self_service boolean NOT NULL DEFAULT true,
        legal_name text,
        address text,
        tax_id text,
        contact_email text,
        {TS},
        CONSTRAINT uq_businesses_slug UNIQUE (slug),
        CONSTRAINT ck_businesses_slug CHECK (slug ~ '^[a-z0-9-]+$'),
        CONSTRAINT ck_businesses_status CHECK (status IN ('active', 'suspended')),
        CONSTRAINT ck_businesses_payment_terms CHECK (default_payment_terms_days BETWEEN 0 AND 365)
    )""",
    f"""CREATE TABLE memberships (
        {PK},
        {BIZ},
        user_id uuid NOT NULL REFERENCES users (id),
        role text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT uq_memberships_business_user UNIQUE (business_id, user_id),
        CONSTRAINT ck_memberships_role CHECK (role IN ('business_admin', 'business_staff'))
    )""",
    f"""CREATE TABLE staff_permissions (
        {PK},
        {BIZ},
        membership_id uuid NOT NULL,
        permission text NOT NULL,
        {TS},
        {TENANT_UNIQUE},
        {fk("staff_permissions", "membership_id", "memberships")},
        CONSTRAINT uq_staff_permissions_membership_permission UNIQUE (membership_id, permission)
    )""",
    f"""CREATE TABLE customer_profiles (
        {PK},
        {BIZ},
        user_id uuid REFERENCES users (id),
        name text NOT NULL,
        email citext NOT NULL,
        phone text,
        billing_address text,
        tax_id text,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT uq_customer_profiles_business_email UNIQUE (business_id, email)
    )""",
    f"""CREATE TABLE password_reset_tokens (
        {PK},
        user_id uuid NOT NULL REFERENCES users (id),
        token_hash char(64) NOT NULL,
        purpose text NOT NULL,
        customer_profile_id uuid REFERENCES customer_profiles (id),
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        {TS},
        CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
        CONSTRAINT ck_password_reset_tokens_purpose CHECK (purpose IN ('reset', 'invite')),
        CONSTRAINT ck_password_reset_tokens_profile CHECK (customer_profile_id IS NULL OR purpose = 'invite')
    )""",
    f"""CREATE TABLE tax_rules (
        {PK},
        {BIZ},
        name text NOT NULL,
        rate_percent numeric(7,4) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT ck_tax_rules_rate CHECK (rate_percent BETWEEN 0 AND 100)
    )""",
    f"""CREATE TABLE products (
        {PK},
        {BIZ},
        name text NOT NULL,
        product_type text NOT NULL,
        sales_price numeric(14,2) NOT NULL,
        cost_price numeric(14,2) NOT NULL,
        notes text,
        default_tax_rule_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        {fk("products", "default_tax_rule_id", "tax_rules")},
        CONSTRAINT ck_products_sales_price CHECK (sales_price >= 0),
        CONSTRAINT ck_products_cost_price CHECK (cost_price >= 0)
    )""",
    f"""CREATE TABLE product_variants (
        {PK},
        {BIZ},
        product_id uuid NOT NULL,
        attribute text NOT NULL,
        value text NOT NULL,
        extra_price numeric(14,2) NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT uq_product_variants_business_product_id UNIQUE (business_id, product_id, id),
        {fk("product_variants", "product_id", "products")},
        CONSTRAINT uq_product_variants_product_attribute_value UNIQUE (product_id, attribute, value),
        CONSTRAINT ck_product_variants_extra_price CHECK (extra_price >= 0)
    )""",
    f"""CREATE TABLE plans (
        {PK},
        {BIZ},
        name text NOT NULL,
        product_id uuid NOT NULL,
        price numeric(14,2) NOT NULL,
        billing_interval text NOT NULL,
        min_quantity integer NOT NULL DEFAULT 1,
        available_from date NOT NULL,
        available_to date,
        auto_close_on_expiry boolean NOT NULL DEFAULT false,
        allow_early_close boolean NOT NULL DEFAULT false,
        allow_pause boolean NOT NULL DEFAULT false,
        allow_renewal boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        {fk("plans", "product_id", "products")},
        CONSTRAINT ck_plans_price CHECK (price >= 0),
        CONSTRAINT ck_plans_interval CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
        CONSTRAINT ck_plans_min_quantity CHECK (min_quantity >= 1),
        CONSTRAINT ck_plans_availability CHECK (available_to IS NULL OR available_to >= available_from)
    )""",
    f"""CREATE TABLE discount_rules (
        {PK},
        {BIZ},
        name text NOT NULL,
        discount_type text NOT NULL,
        value numeric(14,2) NOT NULL,
        scope text NOT NULL,
        product_id uuid,
        min_purchase_amount numeric(14,2) NOT NULL DEFAULT 0,
        min_quantity integer NOT NULL DEFAULT 0,
        starts_on date NOT NULL,
        ends_on date,
        usage_limit integer,
        times_used integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        {fk("discount_rules", "product_id", "products")},
        CONSTRAINT ck_discount_rules_type CHECK (discount_type IN ('fixed', 'percentage')),
        CONSTRAINT ck_discount_rules_value CHECK (value > 0),
        CONSTRAINT ck_discount_rules_percentage CHECK (discount_type <> 'percentage' OR value <= 100),
        CONSTRAINT ck_discount_rules_scope CHECK (scope IN ('product', 'subscription')),
        CONSTRAINT ck_discount_rules_scope_product CHECK ((scope = 'product') = (product_id IS NOT NULL)),
        CONSTRAINT ck_discount_rules_min_purchase CHECK (min_purchase_amount >= 0),
        CONSTRAINT ck_discount_rules_min_quantity CHECK (min_quantity >= 0),
        CONSTRAINT ck_discount_rules_window CHECK (ends_on IS NULL OR ends_on >= starts_on),
        CONSTRAINT ck_discount_rules_usage_limit CHECK (usage_limit IS NULL OR usage_limit >= 0),
        CONSTRAINT ck_discount_rules_times_used CHECK (times_used >= 0 AND (usage_limit IS NULL OR times_used <= usage_limit))
    )""",
    f"""CREATE TABLE quotation_templates (
        {PK},
        {BIZ},
        name text NOT NULL,
        plan_id uuid NOT NULL,
        validity_days integer NOT NULL,
        payment_terms_days smallint NOT NULL,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        {TS},
        {TENANT_UNIQUE},
        {fk("quotation_templates", "plan_id", "plans")},
        CONSTRAINT ck_quotation_templates_validity CHECK (validity_days > 0),
        CONSTRAINT ck_quotation_templates_terms CHECK (payment_terms_days BETWEEN 0 AND 365)
    )""",
    f"""CREATE TABLE quotation_template_lines (
        {PK},
        {BIZ},
        template_id uuid NOT NULL,
        product_id uuid NOT NULL,
        variant_id uuid,
        quantity integer NOT NULL,
        position integer NOT NULL DEFAULT 0,
        {TS},
        {TENANT_UNIQUE},
        {fk("quotation_template_lines", "template_id", "quotation_templates")},
        {fk("quotation_template_lines", "product_id", "products")},
        {variant_fk("quotation_template_lines")},
        CONSTRAINT ck_quotation_template_lines_quantity CHECK (quantity > 0)
    )""",
    f"""CREATE TABLE subscriptions (
        {PK},
        {BIZ},
        number text NOT NULL,
        customer_id uuid NOT NULL,
        plan_id uuid NOT NULL,
        template_id uuid,
        status text NOT NULL DEFAULT 'draft',
        billing_interval text NOT NULL,
        quotation_valid_until date,
        start_date date NOT NULL,
        expiry_date date NOT NULL,
        payment_terms_days smallint NOT NULL,
        next_period_index integer NOT NULL DEFAULT 0,
        next_period_start date,
        confirmed_at timestamptz,
        activated_at timestamptz,
        closed_at timestamptz,
        close_reason text,
        notes text,
        created_by uuid REFERENCES users (id),
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT uq_subscriptions_business_number UNIQUE (business_id, number),
        {fk("subscriptions", "customer_id", "customer_profiles")},
        {fk("subscriptions", "plan_id", "plans")},
        {fk("subscriptions", "template_id", "quotation_templates")},
        CONSTRAINT ck_subscriptions_status CHECK (status IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed')),
        CONSTRAINT ck_subscriptions_interval CHECK (billing_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
        CONSTRAINT ck_subscriptions_dates CHECK (expiry_date > start_date),
        CONSTRAINT ck_subscriptions_terms CHECK (payment_terms_days BETWEEN 0 AND 365),
        CONSTRAINT ck_subscriptions_period_index CHECK (next_period_index >= 0),
        CONSTRAINT ck_subscriptions_close_reason CHECK (close_reason IS NULL OR close_reason IN ('completed', 'early', 'auto', 'rejected', 'expired_quote'))
    )""",
    f"""CREATE TABLE subscription_lines (
        {PK},
        {BIZ},
        subscription_id uuid NOT NULL,
        product_id uuid NOT NULL,
        variant_id uuid,
        description text NOT NULL,
        quantity integer NOT NULL,
        unit_price numeric(14,2) NOT NULL,
        tax_rule_id uuid,
        position integer NOT NULL DEFAULT 0,
        {TS},
        {TENANT_UNIQUE},
        {fk("subscription_lines", "subscription_id", "subscriptions")},
        {fk("subscription_lines", "product_id", "products")},
        {variant_fk("subscription_lines")},
        {fk("subscription_lines", "tax_rule_id", "tax_rules")},
        CONSTRAINT ck_subscription_lines_quantity CHECK (quantity > 0),
        CONSTRAINT ck_subscription_lines_unit_price CHECK (unit_price >= 0)
    )""",
    f"""CREATE TABLE subscription_pauses (
        {PK},
        {BIZ},
        subscription_id uuid NOT NULL,
        paused_on date NOT NULL,
        resumed_on date,
        {TS},
        {TENANT_UNIQUE},
        {fk("subscription_pauses", "subscription_id", "subscriptions")},
        CONSTRAINT ck_subscription_pauses_order CHECK (resumed_on IS NULL OR resumed_on >= paused_on)
    )""",
    f"""CREATE TABLE number_sequences (
        {BIZ},
        kind text NOT NULL,
        next_value bigint NOT NULL DEFAULT 1,
        {TS},
        PRIMARY KEY (business_id, kind),
        CONSTRAINT ck_number_sequences_kind CHECK (kind IN ('subscription', 'invoice')),
        CONSTRAINT ck_number_sequences_next_value CHECK (next_value >= 1)
    )""",
    f"""CREATE TABLE billing_runs (
        {PK},
        {BIZ},
        trigger text NOT NULL,
        as_of_date date NOT NULL,
        status text NOT NULL DEFAULT 'running',
        started_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,
        created_count integer NOT NULL DEFAULT 0,
        skipped_count integer NOT NULL DEFAULT 0,
        failed_count integer NOT NULL DEFAULT 0,
        triggered_by uuid REFERENCES users (id),
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT ck_billing_runs_trigger CHECK (trigger IN ('scheduled', 'manual')),
        CONSTRAINT ck_billing_runs_status CHECK (status IN ('running', 'completed', 'completed_with_errors', 'failed')),
        CONSTRAINT ck_billing_runs_counts CHECK (created_count >= 0 AND skipped_count >= 0 AND failed_count >= 0)
    )""",
    f"""CREATE TABLE invoices (
        {PK},
        {BIZ},
        number text NOT NULL,
        customer_id uuid NOT NULL,
        subscription_id uuid NOT NULL,
        period_start date NOT NULL,
        period_end date NOT NULL,
        status text NOT NULL DEFAULT 'draft',
        issue_date date NOT NULL,
        due_date date NOT NULL,
        subtotal numeric(14,2) NOT NULL,
        discount_total numeric(14,2) NOT NULL DEFAULT 0,
        tax_total numeric(14,2) NOT NULL DEFAULT 0,
        total numeric(14,2) NOT NULL,
        amount_paid numeric(14,2) NOT NULL DEFAULT 0,
        customer_snapshot jsonb NOT NULL,
        currency char(3) NOT NULL,
        sent_at timestamptz,
        confirmed_at timestamptz,
        paid_at timestamptz,
        cancelled_at timestamptz,
        cancel_reason text,
        {TS},
        {TENANT_UNIQUE},
        CONSTRAINT uq_invoices_subscription_period UNIQUE (subscription_id, period_start),
        CONSTRAINT uq_invoices_business_number UNIQUE (business_id, number),
        {fk("invoices", "customer_id", "customer_profiles")},
        {fk("invoices", "subscription_id", "subscriptions")},
        CONSTRAINT ck_invoices_status CHECK (status IN ('draft', 'confirmed', 'paid', 'cancelled')),
        CONSTRAINT ck_invoices_amounts CHECK (subtotal >= 0 AND discount_total >= 0 AND tax_total >= 0 AND total >= 0),
        CONSTRAINT ck_invoices_total CHECK (total = subtotal - discount_total + tax_total),
        CONSTRAINT ck_invoices_amount_paid CHECK (amount_paid >= 0 AND amount_paid <= total),
        CONSTRAINT ck_invoices_due_date CHECK (due_date >= issue_date),
        CONSTRAINT ck_invoices_period CHECK (period_end >= period_start)
    )""",
    f"""CREATE TABLE billing_run_items (
        {PK},
        {BIZ},
        billing_run_id uuid NOT NULL,
        subscription_id uuid NOT NULL,
        period_start date NOT NULL,
        outcome text NOT NULL,
        reason_code text,
        message text,
        invoice_id uuid,
        {TS},
        {TENANT_UNIQUE},
        {fk("billing_run_items", "billing_run_id", "billing_runs")},
        {fk("billing_run_items", "subscription_id", "subscriptions")},
        {fk("billing_run_items", "invoice_id", "invoices")},
        CONSTRAINT ck_billing_run_items_outcome CHECK (outcome IN ('created', 'skipped', 'failed')),
        CONSTRAINT ck_billing_run_items_reason CHECK (outcome = 'created' OR reason_code IS NOT NULL)
    )""",
    f"""CREATE TABLE invoice_lines (
        {PK},
        {BIZ},
        invoice_id uuid NOT NULL,
        product_id uuid NOT NULL,
        variant_id uuid,
        description text NOT NULL,
        quantity integer NOT NULL,
        unit_price numeric(14,2) NOT NULL,
        gross_amount numeric(14,2) NOT NULL,
        discount_amount numeric(14,2) NOT NULL DEFAULT 0,
        taxable_amount numeric(14,2) NOT NULL,
        tax_rule_id uuid,
        tax_rate numeric(7,4) NOT NULL DEFAULT 0,
        tax_amount numeric(14,2) NOT NULL DEFAULT 0,
        line_total numeric(14,2) NOT NULL,
        {TS},
        {TENANT_UNIQUE},
        {fk("invoice_lines", "invoice_id", "invoices")},
        {fk("invoice_lines", "product_id", "products")},
        {variant_fk("invoice_lines")},
        {fk("invoice_lines", "tax_rule_id", "tax_rules")},
        CONSTRAINT ck_invoice_lines_quantity CHECK (quantity > 0),
        CONSTRAINT ck_invoice_lines_amounts CHECK (unit_price >= 0 AND gross_amount >= 0 AND discount_amount >= 0 AND taxable_amount >= 0 AND tax_amount >= 0 AND line_total >= 0),
        CONSTRAINT ck_invoice_lines_taxable CHECK (taxable_amount = gross_amount - discount_amount),
        CONSTRAINT ck_invoice_lines_total CHECK (line_total = taxable_amount + tax_amount),
        CONSTRAINT ck_invoice_lines_tax_rate CHECK (tax_rate BETWEEN 0 AND 100)
    )""",
    f"""CREATE TABLE discount_redemptions (
        {PK},
        {BIZ},
        discount_rule_id uuid NOT NULL,
        invoice_id uuid NOT NULL,
        amount numeric(14,2) NOT NULL,
        released_at timestamptz,
        {TS},
        {TENANT_UNIQUE},
        {fk("discount_redemptions", "discount_rule_id", "discount_rules")},
        {fk("discount_redemptions", "invoice_id", "invoices")},
        CONSTRAINT uq_discount_redemptions_rule_invoice UNIQUE (discount_rule_id, invoice_id),
        CONSTRAINT ck_discount_redemptions_amount CHECK (amount >= 0)
    )""",
    f"""CREATE TABLE payments (
        {PK},
        {BIZ},
        invoice_id uuid NOT NULL,
        method text NOT NULL,
        amount numeric(14,2) NOT NULL,
        paid_on date NOT NULL,
        reference text,
        notes text,
        status text NOT NULL DEFAULT 'recorded',
        voided_at timestamptz,
        void_reason text,
        recorded_by uuid REFERENCES users (id),
        idempotency_key text,
        {TS},
        {TENANT_UNIQUE},
        {fk("payments", "invoice_id", "invoices")},
        CONSTRAINT ck_payments_method CHECK (method IN ('cash', 'bank_transfer', 'card', 'upi', 'cheque', 'other')),
        CONSTRAINT ck_payments_amount CHECK (amount > 0),
        CONSTRAINT ck_payments_status CHECK (status IN ('recorded', 'voided'))
    )""",
    """CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid REFERENCES businesses (id),
        actor_user_id uuid REFERENCES users (id),
        actor_role text,
        action text NOT NULL,
        entity_type text,
        entity_id uuid,
        before jsonb,
        after jsonb,
        request_id text,
        created_at timestamptz NOT NULL DEFAULT now()
    )""",
    """CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid REFERENCES businesses (id),
        user_id uuid REFERENCES users (id),
        channel text NOT NULL,
        kind text NOT NULL,
        to_email text,
        subject text,
        body text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        sent_at timestamptz,
        CONSTRAINT ck_notifications_channel CHECK (channel IN ('email', 'in_app')),
        CONSTRAINT ck_notifications_status CHECK (status IN ('pending', 'sent', 'failed', 'read')),
        CONSTRAINT ck_notifications_attempts CHECK (attempts >= 0)
    )""",
]

INDEXES = [
    "CREATE INDEX ix_password_reset_tokens_user ON password_reset_tokens (user_id)",
    "CREATE INDEX ix_memberships_user ON memberships (user_id)",
    "CREATE UNIQUE INDEX uq_customer_profiles_business_user ON customer_profiles (business_id, user_id) WHERE user_id IS NOT NULL",
    "CREATE INDEX ix_customer_profiles_business_name ON customer_profiles (business_id, name)",
    "CREATE INDEX ix_products_business_active_name ON products (business_id, is_active, name)",
    "CREATE INDEX ix_quotation_template_lines_template ON quotation_template_lines (template_id)",
    "CREATE INDEX ix_subscriptions_business_status ON subscriptions (business_id, status)",
    "CREATE INDEX ix_subscriptions_business_customer ON subscriptions (business_id, customer_id)",
    "CREATE INDEX ix_subscriptions_billing_sweep ON subscriptions (next_period_start) WHERE status = 'active'",
    "CREATE INDEX ix_subscriptions_renewals ON subscriptions (business_id, expiry_date) WHERE status IN ('active', 'paused')",
    "CREATE INDEX ix_subscription_lines_subscription ON subscription_lines (subscription_id)",
    "CREATE INDEX ix_subscription_pauses_subscription ON subscription_pauses (subscription_id)",
    "CREATE UNIQUE INDEX uq_subscription_pauses_open ON subscription_pauses (subscription_id) WHERE resumed_on IS NULL",
    "CREATE INDEX ix_billing_runs_business_started ON billing_runs (business_id, started_at DESC)",
    "CREATE INDEX ix_billing_run_items_run ON billing_run_items (billing_run_id)",
    "CREATE INDEX ix_billing_run_items_business_subscription ON billing_run_items (business_id, subscription_id)",
    "CREATE INDEX ix_invoices_business_status_due ON invoices (business_id, status, due_date)",
    "CREATE INDEX ix_invoices_business_customer_issue ON invoices (business_id, customer_id, issue_date DESC)",
    "CREATE INDEX ix_invoices_business_issue ON invoices (business_id, issue_date)",
    "CREATE INDEX ix_invoices_subscription ON invoices (subscription_id)",
    "CREATE INDEX ix_invoice_lines_invoice ON invoice_lines (invoice_id)",
    "CREATE INDEX ix_discount_redemptions_invoice ON discount_redemptions (invoice_id)",
    "CREATE INDEX ix_payments_invoice ON payments (invoice_id)",
    "CREATE UNIQUE INDEX uq_payments_business_idempotency ON payments (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL",
    "CREATE INDEX ix_payments_business_paid_on ON payments (business_id, paid_on) WHERE status = 'recorded'",
    "CREATE INDEX ix_audit_logs_business_created ON audit_logs (business_id, created_at DESC)",
    "CREATE INDEX ix_audit_logs_entity ON audit_logs (entity_type, entity_id)",
    "CREATE INDEX ix_notifications_status_created ON notifications (status, created_at)",
]

FUNCTIONS = [
    """CREATE FUNCTION brightloop_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        NEW.updated_at := now();
        RETURN NEW;
    END
    $$""",
    """CREATE FUNCTION brightloop_guard_invoice_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        IF OLD.status <> 'draft' THEN
            IF NEW.status = 'draft' THEN
                RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'a non-draft invoice cannot return to draft';
            END IF;
            IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
               OR NEW.discount_total IS DISTINCT FROM OLD.discount_total
               OR NEW.tax_total IS DISTINCT FROM OLD.tax_total
               OR NEW.total IS DISTINCT FROM OLD.total
               OR NEW.currency IS DISTINCT FROM OLD.currency
               OR NEW.subscription_id IS DISTINCT FROM OLD.subscription_id
               OR NEW.period_start IS DISTINCT FROM OLD.period_start
               OR NEW.period_end IS DISTINCT FROM OLD.period_end THEN
                RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'invoice amounts and period are frozen once the invoice is not draft';
            END IF;
        END IF;
        RETURN NEW;
    END
    $$""",
    """CREATE FUNCTION brightloop_guard_invoice_delete() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        IF OLD.status <> 'draft' THEN
            RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'only draft invoices can be deleted';
        END IF;
        RETURN OLD;
    END
    $$""",
    """CREATE FUNCTION brightloop_guard_invoice_lines() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
        parent_status text;
    BEGIN
        IF TG_OP IN ('UPDATE', 'DELETE') THEN
            SELECT status INTO parent_status FROM invoices WHERE id = OLD.invoice_id FOR SHARE;
            IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
                RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'invoice lines are immutable once the invoice is not draft';
            END IF;
        END IF;
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id) THEN
            SELECT status INTO parent_status FROM invoices WHERE id = NEW.invoice_id FOR SHARE;
            IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
                RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'invoice lines are immutable once the invoice is not draft';
            END IF;
        END IF;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END
    $$""",
    """CREATE FUNCTION brightloop_block_change() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = TG_TABLE_NAME || ' is append-only';
    END
    $$""",
]

TRIGGERS = [
    "CREATE TRIGGER trg_invoices_guard_update BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION brightloop_guard_invoice_update()",
    "CREATE TRIGGER trg_invoices_guard_delete BEFORE DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION brightloop_guard_invoice_delete()",
    "CREATE TRIGGER trg_invoice_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON invoice_lines FOR EACH ROW EXECUTE FUNCTION brightloop_guard_invoice_lines()",
    "CREATE TRIGGER trg_audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION brightloop_block_change()",
]

UPDATED_AT_TABLES = [
    "users", "businesses", "memberships", "staff_permissions", "customer_profiles",
    "password_reset_tokens", "tax_rules", "products", "product_variants", "plans",
    "discount_rules", "quotation_templates", "quotation_template_lines", "subscriptions",
    "subscription_lines", "subscription_pauses", "number_sequences", "billing_runs",
    "invoices", "billing_run_items", "invoice_lines", "discount_redemptions", "payments",
]

DROP_ORDER = [
    "notifications", "audit_logs", "payments", "discount_redemptions", "invoice_lines",
    "billing_run_items", "invoices", "billing_runs", "number_sequences", "subscription_pauses",
    "subscription_lines", "subscriptions", "quotation_template_lines", "quotation_templates",
    "discount_rules", "plans", "product_variants", "products", "tax_rules",
    "password_reset_tokens", "customer_profiles", "staff_permissions", "memberships",
    "businesses", "users",
]

FUNCTION_NAMES = [
    "brightloop_set_updated_at()", "brightloop_guard_invoice_update()",
    "brightloop_guard_invoice_delete()", "brightloop_guard_invoice_lines()",
    "brightloop_block_change()",
]


def upgrade() -> None:
    conn = op.get_bind()
    conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS citext")
    for statement in TABLES + INDEXES + FUNCTIONS + TRIGGERS:
        conn.exec_driver_sql(statement)
    for table in UPDATED_AT_TABLES:
        conn.exec_driver_sql(
            f"CREATE TRIGGER trg_{table}_updated_at BEFORE UPDATE ON {table} "
            "FOR EACH ROW EXECUTE FUNCTION brightloop_set_updated_at()"
        )


def downgrade() -> None:
    conn = op.get_bind()
    for table in DROP_ORDER:
        conn.exec_driver_sql(f"DROP TABLE IF EXISTS {table}")
    for function in FUNCTION_NAMES:
        conn.exec_driver_sql(f"DROP FUNCTION IF EXISTS {function}")
    conn.exec_driver_sql("DROP EXTENSION IF EXISTS citext")
