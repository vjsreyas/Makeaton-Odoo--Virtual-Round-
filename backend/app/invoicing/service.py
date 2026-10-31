import html
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.sql import all_, not_found, raw_all, raw_one, ser
from app.sales.service import business_today

LIST_SELECT = """SELECT i.id, i.number, i.status, i.period_start, i.period_end, i.issue_date, i.due_date, i.subtotal, i.discount_total, i.tax_total, i.total, i.amount_paid,
                 (i.total - i.amount_paid) AS balance, i.currency, i.sent_at, i.created_at,
                 CASE WHEN i.amount_paid = 0 THEN 'unpaid' WHEN i.amount_paid < i.total THEN 'partial' ELSE 'paid' END AS payment_state,
                 (i.status = 'confirmed' AND i.total - i.amount_paid > 0 AND i.due_date < :today) AS is_overdue,
                 CASE WHEN i.status = 'confirmed' AND i.total - i.amount_paid > 0 AND i.due_date < :today THEN (:today - i.due_date) ELSE 0 END AS days_overdue,
                 c.id AS customer_id, c.name AS customer_name, c.email AS customer_email, s.id AS subscription_id, s.number AS subscription_number
                 FROM invoices i JOIN customer_profiles c ON c.id = i.customer_id JOIN subscriptions s ON s.id = i.subscription_id"""


def invoice_detail(db: Session, business_id: uuid.UUID, invoice_id, customer_id=None) -> dict:
    today = business_today(db, business_id)
    row = raw_one(db, LIST_SELECT + " WHERE i.business_id = :b AND i.id = :i" + (" AND i.customer_id = :c" if customer_id else ""), today=today, b=business_id, i=invoice_id, c=customer_id)
    if not row:
        raise not_found("Invoice")
    full = raw_one(db, "SELECT customer_snapshot, confirmed_at, paid_at, cancelled_at, cancel_reason FROM invoices WHERE id = :i", i=invoice_id)
    out = {**row, **full}
    out["customer"] = out.pop("customer_snapshot")
    out["lines"] = raw_all(db, """SELECT id, product_id, variant_id, description, quantity, unit_price, gross_amount, discount_amount, taxable_amount, tax_rate, tax_amount, line_total
                                  FROM invoice_lines WHERE invoice_id = :i ORDER BY created_at, id""", i=invoice_id)
    out["payments"] = raw_all(db, "SELECT id, method, amount, paid_on, reference, notes, status, voided_at, void_reason, created_at FROM payments WHERE invoice_id = :i ORDER BY paid_on, created_at", i=invoice_id)
    out["history"] = raw_all(db, """SELECT a.id, a.action, a.after, a.created_at, u.full_name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
                                    WHERE a.entity_type = 'invoice' AND a.entity_id = :i ORDER BY a.created_at, a.id""", i=invoice_id)
    return ser(out)


def invoice_html(invoice: dict, business_name: str) -> str:
    e = html.escape
    customer = invoice["customer"] or {}
    lines = "".join(
        f"<tr><td>{e(l['description'])}</td><td class='r'>{l['quantity']}</td><td class='r'>{l['unit_price']}</td><td class='r'>{l['discount_amount']}</td><td class='r'>{l['tax_amount']}</td><td class='r'>{l['line_total']}</td></tr>"
        for l in invoice["lines"]
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{e(invoice['number'])}</title>
<style>body{{font-family:system-ui,sans-serif;margin:32px;color:#171c20}}table{{width:100%;border-collapse:collapse;margin-top:16px}}th,td{{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}}.r{{text-align:right}}h1{{margin:0}}.tot td{{font-weight:700}}@media print{{body{{margin:0}}}}</style></head>
<body><h1>Invoice {e(invoice['number'])}</h1><p>{e(business_name)}</p>
<p><strong>Billed to:</strong> {e(str(customer.get('name') or ''))}<br>{e(str(customer.get('email') or ''))}<br>{e(str(customer.get('billing_address') or ''))}</p>
<p>Status: {e(invoice['status'])} · Issued {e(invoice['issue_date'])} · Due {e(invoice['due_date'])} · Period {e(invoice['period_start'])} – {e(invoice['period_end'])}</p>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Discount</th><th class="r">Tax</th><th class="r">Amount</th></tr></thead><tbody>{lines}</tbody>
<tfoot><tr><td colspan="5" class="r">Subtotal</td><td class="r">{invoice['subtotal']}</td></tr><tr><td colspan="5" class="r">Discount</td><td class="r">-{invoice['discount_total']}</td></tr>
<tr><td colspan="5" class="r">Tax</td><td class="r">{invoice['tax_total']}</td></tr><tr class="tot"><td colspan="5" class="r">Total ({e(invoice['currency'])})</td><td class="r">{invoice['total']}</td></tr>
<tr><td colspan="5" class="r">Paid</td><td class="r">{invoice['amount_paid']}</td></tr><tr class="tot"><td colspan="5" class="r">Balance due</td><td class="r">{invoice['balance']}</td></tr></tfoot></table></body></html>"""
