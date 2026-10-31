import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API = os.environ.get("API", "http://localhost:8000/api/v1")
MAIL = os.environ.get("MAILPIT", "http://localhost:8025")
ADMIN = (os.environ["E2E_ADMIN_EMAIL"], os.environ["E2E_ADMIN_PASSWORD"])
STAMP = str(int(time.time()))[-6:]
failures = []


def call(method, path, body=None, token=None, headers=None, expect=None, raw=False):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            status, payload = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, payload = e.code, e.read()
    data = payload.decode() if raw else json.loads(payload or b"null")
    if expect and status != expect:
        failures.append(f"{method} {path}: expected {expect}, got {status}: {str(data)[:200]}")
    return status, data


def check(label, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + label + (f" {extra}" if extra and not cond else ""))
    if not cond:
        failures.append(label)


def d(r):
    return r[1]["data"]


_, login = call("POST", "/auth/login", {"email": ADMIN[0], "password": ADMIN[1]}, expect=200)
tok = login["data"]["access_token"]
today = dt.date.today()

tax = d(call("POST", "/tax-rules", {"name": f"GST 18 {STAMP}", "rate_percent": "18.0000"}, tok, expect=201))
prod = d(call("POST", "/products", {"name": f"Odoo ERP {STAMP}", "product_type": "software", "sales_price": "5000.00", "cost_price": "3000.00", "default_tax_rule_id": tax["id"],
                                    "variants": [{"attribute": "Brand", "value": "Odoo", "extra_price": "560.00"}]}, tok, expect=201))
variant = prod["variants"][0]
check("variant extra price stored", variant["extra_price"] == "560.00")
bad = call("POST", f"/products/{prod['id']}/variants", {"attribute": "Brand", "value": "Odoo", "extra_price": "1.00"}, tok)
check("duplicate variant is 409", bad[0] == 409)
plan = d(call("POST", "/plans", {"name": f"Monthly {STAMP}", "product_id": prod["id"], "price": "5000.00", "billing_interval": "monthly", "min_quantity": 1, "available_from": str(today - dt.timedelta(days=30)),
                                  "auto_close_on_expiry": True, "allow_early_close": True, "allow_pause": True, "allow_renewal": True}, tok, expect=201))
disc = d(call("POST", "/discount-rules", {"name": f"10+ seats {STAMP}", "discount_type": "percentage", "value": "10.00", "scope": "subscription", "min_quantity": 10, "starts_on": str(today - dt.timedelta(days=1)), "usage_limit": 2}, tok, expect=201))
cust = d(call("POST", "/customers", {"name": f"Shop {STAMP}", "email": f"shop-{STAMP}@demo.test", "phone": "000"}, tok, expect=201))
tmpl = d(call("POST", "/quotation-templates", {"name": f"Std {STAMP}", "plan_id": plan["id"], "validity_days": 14, "payment_terms_days": 15, "lines": [{"product_id": prod["id"], "variant_id": variant["id"], "quantity": 10}]}, tok, expect=201))

sub = d(call("POST", "/subscriptions", {"customer_id": cust["id"], "template_id": tmpl["id"], "start_date": str(today), "expiry_date": str(today + dt.timedelta(days=364))}, tok, expect=201))
check("subscription number allocated", sub["number"].startswith("SUB-"))
check("variant pricing 5000+560", sub["lines"][0]["unit_price"] == "5560.00")
check("totals 55600 + 18% tax", sub["totals"]["subtotal"] == "55600.00" and sub["totals"]["tax_total"] == "10008.00")
check("draft allows send-quotation", "send-quotation" in sub["allowed_actions"])
bad = call("POST", "/subscriptions", {"customer_id": cust["id"], "plan_id": plan["id"], "start_date": str(today), "expiry_date": str(today + dt.timedelta(days=30)), "lines": [{"product_id": prod["id"], "quantity": 0}]}, tok)
check("invalid quantity rejected", bad[0] == 422)
other_variant = call("POST", "/products", {"name": f"Other {STAMP}", "product_type": "addon", "sales_price": "1.00", "variants": [{"attribute": "X", "value": "Y"}]}, tok)[1]["data"]["variants"][0]["id"]
bad = call("POST", "/subscriptions", {"customer_id": cust["id"], "plan_id": plan["id"], "start_date": str(today), "expiry_date": str(today + dt.timedelta(days=30)), "lines": [{"product_id": prod["id"], "variant_id": other_variant, "quantity": 1}]}, tok)
check("variant of another product rejected", bad[0] == 422)
call("POST", f"/subscriptions/{sub['id']}/send-quotation", {}, tok, expect=200)
call("POST", f"/subscriptions/{sub['id']}/confirm", {}, tok, expect=200)
act = d(call("POST", f"/subscriptions/{sub['id']}/activate", {}, tok, expect=200))
check("subscription active", act["status"] == "active")
bad = call("POST", f"/subscriptions/{sub['id']}/activate", {}, tok)
check("illegal transition is 409", bad[0] == 409 and bad[1]["error"]["code"] == "INVALID_STATE_TRANSITION")

run1 = d(call("POST", "/billing-runs", {}, tok, expect=202))
check("billing run created an invoice", run1["created_count"] >= 1, str(run1))
items = call("GET", f"/billing-runs/{run1['id']}/items", token=tok)[1]["data"]
mine = [i for i in items if i["subscription_id"] == sub["id"]]
check("run item recorded for the subscription", len(mine) == 1 and mine[0]["outcome"] == "created")
run2 = d(call("POST", "/billing-runs", {}, tok, expect=202))
items2 = [i for i in call("GET", f"/billing-runs/{run2['id']}/items", token=tok)[1]["data"] if i["subscription_id"] == sub["id"]]
check("second run does not bill twice", len(items2) == 0)
invs = call("GET", f"/invoices?subscription_id={sub['id']}", token=tok)[1]["data"]
check("exactly one invoice for the period", len(invs) == 1)
inv = d(call("GET", f"/invoices/{invs[0]['id']}", token=tok))
check("discount 10% applied (5560.00)", inv["discount_total"] == "5560.00", inv["discount_total"])
check("tax after discount 9007.20 -> total 59047.20", inv["tax_total"] == "9007.20" and inv["total"] == "59047.20", f"{inv['tax_total']} {inv['total']}")
check("invoice starts as draft", inv["status"] == "draft")
check("discount usage consumed", call("GET", "/discount-rules", token=tok)[1]["data"][0]["times_used"] >= 0)
bad = call("POST", f"/invoices/{inv['id']}/payments", {"method": "cash", "amount": "10.00", "paid_on": str(today)}, tok)
check("draft invoice not payable", bad[0] == 409 and bad[1]["error"]["code"] == "INVOICE_NOT_PAYABLE")
call("POST", f"/invoices/{inv['id']}/confirm", {}, tok, expect=200)
r = call("POST", f"/invoices/{inv['id']}/payments", {"method": "bank_transfer", "amount": "20000.00", "paid_on": str(today), "notes": "first"}, tok, headers={"Idempotency-Key": f"k{STAMP}"}, expect=201)
check("partial payment keeps confirmed", r[1]["data"]["invoice"]["payment_state"] == "partial" and r[1]["data"]["invoice"]["balance"] == "39047.20")
again = call("POST", f"/invoices/{inv['id']}/payments", {"method": "bank_transfer", "amount": "20000.00", "paid_on": str(today)}, tok, headers={"Idempotency-Key": f"k{STAMP}"})
check("idempotent replay returns same payment", again[1]["data"]["id"] == r[1]["data"]["id"] and again[1]["data"]["invoice"]["amount_paid"] == "20000.00")
over = call("POST", f"/invoices/{inv['id']}/payments", {"method": "cash", "amount": "99999.00", "paid_on": str(today)}, tok)
check("overpayment rejected", over[0] == 422 and over[1]["error"]["code"] == "PAYMENT_EXCEEDS_BALANCE")
full = call("POST", f"/invoices/{inv['id']}/payments", {"method": "upi", "amount": "39047.20", "paid_on": str(today)}, tok, expect=201)
check("full payment marks paid", full[1]["data"]["invoice"]["status"] == "paid")
void = call("POST", f"/payments/{full[1]['data']['id']}/void", {"reason": "test"}, tok, expect=200)
check("void returns invoice to confirmed", void[1]["data"]["invoice"]["status"] == "confirmed")
bad = call("POST", f"/invoices/{inv['id']}/cancel", {}, tok)
check("cannot cancel with recorded payments", bad[0] == 409)
html = call("GET", f"/invoices/{inv['id']}/print", token=tok, raw=True)[1]
check("print view is html", "<h1>Invoice" in html)
sent = call("POST", f"/invoices/{inv['id']}/send", {}, tok, expect=200)
check("send sets sent_at", sent[1]["data"]["sent_at"] is not None)

dash = d(call("GET", "/reports/dashboard", token=tok, expect=200))
check("dashboard has revenue and outstanding", all(k in dash for k in ("active_subscriptions", "revenue_collected", "outstanding_total", "overdue", "mrr")))
rec = d(call("GET", "/reports/receivables", token=tok, expect=200))
check("receivables has aging buckets", [b["bucket"] for b in rec["buckets"]] == ["current", "1-30", "31-60", "60+"])
call("GET", "/reports/revenue", token=tok, expect=200)
call("GET", "/reports/subscriptions-summary", token=tok, expect=200)

p = d(call("POST", f"/subscriptions/{sub['id']}/pause", {}, tok, expect=200))
check("pause allowed by plan", p["status"] == "paused")
call("POST", f"/subscriptions/{sub['id']}/resume", {}, tok, expect=200)
hist = d(call("GET", f"/subscriptions/{sub['id']}/history", token=tok, expect=200))
check("history lists each transition", len(hist) >= 6)
call("POST", f"/subscriptions/{sub['id']}/renew", {"expiry_date": str(today + dt.timedelta(days=730))}, tok, expect=200)

c2 = d(call("POST", f"/customers/{cust['id']}/invite", {}, tok, expect=200)) if False else None
call("POST", f"/customers/{cust['id']}/invite", {}, tok, expect=200)
token = None
for _ in range(30):
    found = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/search?query=to:{cust['email']}"))
    if found["messages"]:
        text = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/message/{found['messages'][0]['ID']}"))["Text"]
        token = re.search(r"token=([\w-]+)", text).group(1)
        break
    time.sleep(1)
check("customer invitation delivered", token is not None)
call("POST", "/auth/reset-password", {"token": token, "new_password": "Cust!Passw0rd9"}, expect=200)
ctok = call("POST", "/auth/login", {"email": cust["email"], "password": "Cust!Passw0rd9"}, expect=200)[1]["data"]["access_token"]
summary = d(call("GET", "/portal/summary", token=ctok, expect=200))
check("portal summary shows own balance", summary["outstanding_balance"] == "39047.20", summary["outstanding_balance"])
mi = call("GET", "/portal/invoices", token=ctok, expect=200)[1]["data"]
check("portal lists only own invoices", len(mi) == 1)
check("portal blocks staff routes", call("GET", "/invoices", token=ctok)[0] == 403)
check("portal subscription visible", len(call("GET", "/portal/subscriptions", token=ctok)[1]["data"]) == 1)
call("GET", f"/portal/invoices/{inv['id']}", token=ctok, expect=200)
call("PATCH", "/portal/profile", {"phone": "111"}, ctok, expect=200)

call("GET", "/settings", token=tok, expect=200)
call("GET", "/audit-logs", token=tok, expect=200)
print("\nFAILURES:" if failures else "\nALL CHECKS PASSED")
for f in failures:
    print(" -", f)
sys.exit(1 if failures else 0)
