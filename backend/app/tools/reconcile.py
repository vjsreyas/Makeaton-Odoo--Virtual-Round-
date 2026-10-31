"""Read-only financial reconciliation; nonzero exit if persisted totals disagree."""
import json
from sqlalchemy import text
from app.core.db import get_session_factory

QUERIES={
 'payment_balance': "SELECT count(*) FROM invoices i WHERE i.amount_paid <> (SELECT coalesce(sum(p.amount),0) FROM payments p WHERE p.invoice_id=i.id AND p.status='recorded')",
 'invoice_lines': "SELECT count(*) FROM invoices i WHERE i.total <> (SELECT coalesce(sum(l.line_total),0) FROM invoice_lines l WHERE l.invoice_id=i.id)",
 'discount_usage': "SELECT count(*) FROM discount_rules d WHERE d.times_used <> (SELECT count(*) FROM discount_redemptions r WHERE r.discount_rule_id=d.id AND r.released_at IS NULL)",
 'duplicate_period': "SELECT count(*) FROM (SELECT subscription_id,period_start FROM invoices GROUP BY subscription_id,period_start HAVING count(*)>1) x",
}
def run(db): return {name:db.scalar(text(query)) for name,query in QUERIES.items()}
def main():
 with get_session_factory()() as db: result=run(db)
 print(json.dumps(result))
 if any(result.values()): raise SystemExit(1)
if __name__=='__main__':main()
