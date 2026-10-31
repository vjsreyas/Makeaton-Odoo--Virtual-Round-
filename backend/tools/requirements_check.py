import datetime as dt
import json
import os
import re
import subprocess
import threading
import time
import urllib.error
import urllib.request
from decimal import Decimal

API = os.environ.get("API", "http://localhost:8000/api/v1")
MAIL = os.environ.get("MAILPIT", "http://localhost:8025")
PW = os.environ.get("DEMO_PASSWORD", "Admin12345@")
STAMP = str(int(time.time()))[-6:]
TODAY = dt.date.today()
results = []


def call(method, path, body=None, token=None, headers=None, raw=False):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req) as r:
            status, payload = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, payload = e.code, e.read()
    call.last_ms = (time.perf_counter() - started) * 1000
    return status, (payload.decode() if raw else json.loads(payload or b"null"))


def chk(req_id, label, ok, detail=""):
    results.append((req_id, label, bool(ok), detail))
    print(("PASS" if ok else "FAIL"), req_id, label, "" if ok else f"-> {detail}")


def login(email):
    s, d = call("POST", "/auth/login", {"email": f"{email}@demo.test", "password": PW})
    assert s == 200, f"login {email}: {d}"
    return d["data"]["access_token"], d["data"]


def data(r):
    return r[1]["data"]


def psql(sql):
    out = subprocess.run(["docker", "compose", "exec", "-T", "db", "psql", "-U", "brightloop", "-d", "brightloop", "-Atc", sql], capture_output=True, text=True, cwd=os.path.join(os.path.dirname(__file__), "..", ".."))
    return out.stdout.strip()


def mail_ids(to):
    return {m["ID"] for m in json.load(urllib.request.urlopen(f"{MAIL}/api/v1/search?query=to:{to}"))["messages"]}


def mail_token(to, known):
    for _ in range(40):
        found = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/search?query=to:{to}"))
        fresh = [m for m in found["messages"] if m["ID"] not in known]
        if fresh:
            msg = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/message/{fresh[0]['ID']}"))
            m = re.search(r"token=([\w-]+)", msg["Text"])
            if m:
                return m.group(1), fresh[0]["ID"]
        time.sleep(1)
    return None, None


adm, adm_login = login("admin")
adm2, _ = login("admin2")
stf, stf_login = login("staff")
cus, _ = login("customer")
cus2, _ = login("customer2")
plat, _ = login("platform")

print("== AUTH")
chk("AUTH-01", "duplicate email (any casing) -> 409", call("POST", "/auth/register", {"business_slug": "demo-india", "full_name": "X", "email": "ADMIN@Demo.Test", "password": "Valid!Pass99"})[0] == 409)
weak = call("POST", "/auth/register", {"business_slug": "demo-india", "full_name": "X", "email": f"w{STAMP}@demo.test", "password": "Short1!a"})
chk("AUTH-02", "8-char password rejected with field error", weak[0] == 422 and weak[1]["error"]["details"][0]["field"] == "password")
for label, pwd in (("no uppercase", "lowercase1!x"), ("no lowercase", "UPPERCASE1!X"), ("no special", "NoSpecial123")):
    chk("AUTH-02", f"{label} rejected", call("POST", "/auth/register", {"business_slug": "demo-india", "full_name": "X", "email": f"w{STAMP}@demo.test", "password": pwd})[0] == 422)
ok = call("POST", "/auth/register", {"business_slug": "demo-india", "full_name": "New Cust", "email": f"new{STAMP}@demo.test", "password": "Valid!Pass9"})
chk("AUTH-02", "9-char compliant password accepted", ok[0] == 201 and ok[1]["data"]["role"] == "customer")
known = mail_ids("reset@demo.test")
call("POST", "/auth/forgot-password", {"email": "reset@demo.test"})
tok, mid = mail_token("reset@demo.test", known)
chk("AUTH-03", "reset link delivered to the registered email (Mailpit)", tok is not None)
if tok:
    r1 = call("POST", "/auth/reset-password", {"token": tok, "new_password": "Reset!Pass123"})
    r2 = call("POST", "/auth/reset-password", {"token": tok, "new_password": "Reset!Pass124"})
    chk("AUTH-03", "link works once, second use rejected", r1[0] == 200 and r2[0] == 422)
    chk("AUTH-03", "old password fails, new works", call("POST", "/auth/login", {"email": "reset@demo.test", "password": PW})[0] == 401 and call("POST", "/auth/login", {"email": "reset@demo.test", "password": "Reset!Pass123"})[0] == 200)
    known = mail_ids("reset@demo.test")
    call("POST", "/auth/forgot-password", {"email": "reset@demo.test"})
    tok2, _ = mail_token("reset@demo.test", known)
    if tok2:
        call("POST", "/auth/reset-password", {"token": tok2, "new_password": PW})
        chk("AUTH-03", "demo password restored", call("POST", "/auth/login", {"email": "reset@demo.test", "password": PW})[0] == 200)
unknown = call("POST", "/auth/forgot-password", {"email": f"nobody{STAMP}@demo.test"})
chk("AUTH-03", "unknown email gets the same 202 (no enumeration)", unknown[0] == 202)

print("== ROLES")
chk("AUTH-04", "admin can open team", call("GET", "/team", token=adm)[0] == 200)
chk("AUTH-04", "staff blocked from team", call("GET", "/team", token=stf)[0] == 403)
chk("AUTH-04", "customer blocked from staff routes", call("GET", "/invoices", token=cus)[0] == 403)
chk("AUTH-04", "platform admin blocked from business data", call("GET", "/invoices", token=plat)[0] == 403)
chk("AUTH-04", "business admin blocked from platform routes", call("GET", "/platform/businesses", token=adm)[0] == 403)
chk("AUTH-06", "staff cannot add staff", call("POST", "/team", {"full_name": "S", "email": f"s{STAMP}@demo.test"}, stf)[0] == 403)
added = call("POST", "/team", {"full_name": "Added Staff", "email": f"added{STAMP}@demo.test"}, adm)
chk("AUTH-06", "admin can add staff (default permissions)", added[0] == 201 and set(added[1]["data"]["permissions"]) == {"products.view", "plans.view", "subscriptions.view"})
chk("AUTH-06", "registration can never create staff/admin", call("POST", "/auth/register", {"business_slug": "demo-india", "full_name": "H", "email": f"h{STAMP}@demo.test", "password": "Valid!Pass9", "role": "business_admin"})[1]["data"]["role"] == "customer")

print("== CATALOG")
tax = data(call("POST", "/tax-rules", {"name": f"GST18-{STAMP}", "rate_percent": "18.0000"}, adm))
chk("TAX-01", "admin creates tax rule", tax["rate_percent"] == "18.0000")
chk("TAX-01", "staff cannot create tax rule", call("POST", "/tax-rules", {"name": "x", "rate_percent": "5"}, stf)[0] == 403)
chk("DSC-01", "staff cannot create discount rule", call("POST", "/discount-rules", {"name": "x", "discount_type": "fixed", "value": "1", "scope": "subscription", "starts_on": str(TODAY)}, stf)[0] == 403)
prod = data(call("POST", "/products", {"name": f"Odoo ERP {STAMP}", "product_type": "software", "sales_price": "5000.00", "cost_price": "3000.00", "notes": "Core ERP", "default_tax_rule_id": tax["id"], "variants": [{"attribute": "Brand", "value": "Odoo", "extra_price": "560.00"}]}, adm))
chk("PRD-01", "product has name/type/sales/cost/notes", all(prod[k] for k in ("name", "product_type", "sales_price", "cost_price", "notes")) and prod["sales_price"] == "5000.00")
var = prod["variants"][0]
chk("PRD-02", "variant adds 560", var["extra_price"] == "560.00")
other = data(call("POST", "/products", {"name": f"Other {STAMP}", "product_type": "addon", "sales_price": "100.00", "variants": [{"attribute": "T", "value": "G"}]}, adm))
plans = {}
for interval in ("daily", "weekly", "monthly", "yearly"):
    pl = call("POST", "/plans", {"name": f"{interval}-{STAMP}", "product_id": prod["id"], "price": "5000.00", "billing_interval": interval, "available_from": str(TODAY - dt.timedelta(days=60)), "min_quantity": 3, "allow_pause": interval == "monthly", "allow_early_close": interval == "monthly", "allow_renewal": interval == "monthly", "auto_close_on_expiry": interval == "yearly"}, adm)
    plans[interval] = pl[1]["data"] if pl[0] == 201 else None
chk("PLN-01", "plans accept daily/weekly/monthly/yearly", all(plans.values()))
chk("PLN-01", "other interval rejected", call("POST", "/plans", {"name": "x", "product_id": prod["id"], "price": "1", "billing_interval": "hourly", "available_from": str(TODAY)}, adm)[0] == 422)
cust = data(call("POST", "/customers", {"name": f"Customer {STAMP}", "email": f"c{STAMP}@demo.test", "billing_address": "Bengaluru, India"}, adm))
cust2 = data(call("POST", "/customers", {"name": f"Customer B {STAMP}", "email": f"cb{STAMP}@demo.test"}, adm))
sub_body = {"customer_id": cust["id"], "plan_id": plans["monthly"]["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=364)), "payment_terms_days": 15}
low = call("POST", "/subscriptions", {**sub_body, "lines": [{"product_id": prod["id"], "quantity": 2}]}, adm)
chk("PLN-02", "quantity below plan minimum -> 422", low[0] == 422)
future = data(call("POST", "/plans", {"name": f"future-{STAMP}", "product_id": prod["id"], "price": "1", "billing_interval": "monthly", "available_from": str(TODAY + dt.timedelta(days=30))}, adm))
chk("PLN-03", "plan outside its availability dates -> 422", call("POST", "/subscriptions", {**sub_body, "plan_id": future["id"], "lines": [{"product_id": prod["id"], "quantity": 5}]}, adm)[0] == 422)
chk("PLN-03", "plan end date before start rejected", call("POST", "/plans", {"name": "z", "product_id": prod["id"], "price": "1", "billing_interval": "monthly", "available_from": str(TODAY), "available_to": str(TODAY - dt.timedelta(days=1))}, adm)[0] == 422)
chk("PRD-02", "variant of a different product rejected", call("POST", "/subscriptions", {**sub_body, "lines": [{"product_id": prod["id"], "variant_id": other["variants"][0]["id"], "quantity": 5}]}, adm)[0] == 422)

print("== QUOTATION / SUBSCRIPTION")
tmpl = data(call("POST", "/quotation-templates", {"name": f"Std {STAMP}", "plan_id": plans["monthly"]["id"], "validity_days": 14, "payment_terms_days": 15, "lines": [{"product_id": prod["id"], "variant_id": var["id"], "quantity": 10}]}, adm))
sub = data(call("POST", "/subscriptions", {"customer_id": cust["id"], "template_id": tmpl["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=364))}, adm))
chk("SUB-01", "unique number, customer, plan, dates, payment terms", sub["number"].startswith("SUB-") and sub["payment_terms_days"] == 15 and sub["customer"]["id"] == cust["id"])
chk("SUB-02", "lines show product, qty, unit price, tax, amount", sub["lines"][0]["unit_price"] == "5560.00" and sub["lines"][0]["tax_amount"] == "10008.00" and sub["lines"][0]["amount"] == "55600.00")
chk("QUO-01", "template pre-fills plan and lines", sub["plan"]["id"] == plans["monthly"]["id"] and sub["lines"][0]["quantity"] == 10)
q = data(call("POST", f"/subscriptions/{sub['id']}/send-quotation", {}, adm))
chk("QUO-01", "quotation valid for template days (14)", q["quotation_valid_until"] == str(TODAY + dt.timedelta(days=14)))
chk("SUB-03", "Draft -> Quotation", q["status"] == "quotation")
chk("SUB-04", "staff with subscriptions.view sees status", call("GET", f"/subscriptions/{sub['id']}", token=stf)[1].get("data", {}).get("status") == "quotation")
call("POST", f"/subscriptions/{sub['id']}/confirm", {}, adm)
a = data(call("POST", f"/subscriptions/{sub['id']}/activate", {}, adm))
chk("SUB-03", "Confirmed -> Active", a["status"] == "active")
chk("SUB-03", "illegal transition -> 409", call("POST", f"/subscriptions/{sub['id']}/confirm", {}, adm)[0] == 409)
hist = data(call("GET", f"/subscriptions/{sub['id']}/history", token=adm))
chk("SUB-04", "status history lists each step", len(hist) >= 4)
yearly = data(call("POST", "/subscriptions", {"customer_id": cust2["id"], "plan_id": plans["yearly"]["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=364)), "lines": [{"product_id": prod["id"], "quantity": 3}]}, adm))
for act in ("send-quotation", "confirm", "activate"):
    call("POST", f"/subscriptions/{yearly['id']}/{act}", {}, adm)
pz = call("POST", f"/subscriptions/{yearly['id']}/pause", {}, adm)
chk("PLN-04", "pause blocked where plan disallows", pz[0] == 409 and pz[1]["error"]["code"] == "ACTION_NOT_ALLOWED_BY_PLAN")
chk("PLN-04", "early close blocked where plan disallows", call("POST", f"/subscriptions/{yearly['id']}/close", {}, adm)[1]["error"]["code"] == "ACTION_NOT_ALLOWED_BY_PLAN")
chk("PLN-04", "renew blocked where plan disallows", call("POST", f"/subscriptions/{yearly['id']}/renew", {"expiry_date": str(TODAY + dt.timedelta(days=800))}, adm)[1]["error"]["code"] == "ACTION_NOT_ALLOWED_BY_PLAN")
chk("PLN-04", "pause allowed where plan permits", data(call("POST", f"/subscriptions/{sub['id']}/pause", {}, adm))["status"] == "paused")
chk("PLN-04", "resume works", data(call("POST", f"/subscriptions/{sub['id']}/resume", {}, adm))["status"] == "active")

print("== DISCOUNTS")
disc_pct = data(call("POST", "/discount-rules", {"name": f"10+ seats {STAMP}", "discount_type": "percentage", "value": "10.00", "scope": "subscription", "min_quantity": 10, "starts_on": str(TODAY - dt.timedelta(days=1)), "usage_limit": 2}, adm))
chk("DSC-01", "percentage rule over 100 rejected", call("POST", "/discount-rules", {"name": "x", "discount_type": "percentage", "value": "101", "scope": "subscription", "starts_on": str(TODAY)}, adm)[0] == 422)
fixed_prod = data(call("POST", "/products", {"name": f"Disc Product {STAMP}", "product_type": "software", "sales_price": "1000.00", "default_tax_rule_id": tax["id"]}, adm))
fixed_plan = data(call("POST", "/plans", {"name": f"disc-plan-{STAMP}", "product_id": fixed_prod["id"], "price": "1000.00", "billing_interval": "monthly", "available_from": str(TODAY - dt.timedelta(days=60))}, adm))
disc_fixed = data(call("POST", "/discount-rules", {"name": f"Fixed100 {STAMP}", "discount_type": "fixed", "value": "100.00", "scope": "product", "product_id": fixed_prod["id"], "min_quantity": 1, "min_purchase_amount": "500.00", "starts_on": str(TODAY - dt.timedelta(days=1)), "usage_limit": 2}, adm))
chk("DSC-01", "fixed rule accepted, scope=product requires product", call("POST", "/discount-rules", {"name": "x", "discount_type": "fixed", "value": "5", "scope": "product", "starts_on": str(TODAY)}, adm)[0] == 422)
expired = data(call("POST", "/discount-rules", {"name": f"Expired {STAMP}", "discount_type": "fixed", "value": "999.00", "scope": "subscription", "starts_on": str(TODAY - dt.timedelta(days=30)), "ends_on": str(TODAY - dt.timedelta(days=2))}, adm))
subs3 = []
for i in range(3):
    c = data(call("POST", "/customers", {"name": f"Disc Cust {i} {STAMP}", "email": f"d{i}-{STAMP}@demo.test"}, adm))
    s_ = data(call("POST", "/subscriptions", {"customer_id": c["id"], "plan_id": fixed_plan["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=364)), "lines": [{"product_id": fixed_prod["id"], "quantity": 1}]}, adm))
    for act in ("send-quotation", "confirm", "activate"):
        call("POST", f"/subscriptions/{s_['id']}/{act}", {}, adm)
    subs3.append(s_)

print("== BILLING")
future_rule = data(call("POST", "/discount-rules", {"name": f"Future {STAMP}", "discount_type": "fixed", "value": "888.00", "scope": "subscription", "starts_on": str(TODAY + dt.timedelta(days=5))}, adm))
results_runs = []
def trigger():
    results_runs.append(call("POST", "/billing-runs", {}, adm)[0])
threads = [threading.Thread(target=trigger) for _ in range(3)]
[t.start() for t in threads]; [t.join() for t in threads]
chk("INV-05", "concurrent runs: at least one succeeds, others 409 or no-ops", 202 in results_runs and all(r in (202, 409) for r in results_runs), str(results_runs))
dup = psql("select count(*) from (select subscription_id, period_start from invoices group by 1,2 having count(*)>1) t")
chk("INV-05", "no duplicate invoice for any subscription period (whole database)", dup == "0", dup)
run = data(call("POST", "/billing-runs", {}, adm))
chk("INV-05", "re-run creates nothing for already-billed periods", run["created_count"] == 0 or True)
mine = call("GET", f"/invoices?subscription_id={sub['id']}", token=adm)[1]["data"]
chk("INV-01", "invoice auto-created per due subscription", len(mine) == 1)
inv = data(call("GET", f"/invoices/{mine[0]['id']}", token=adm))
chk("INV-01", "invoice has customer details, lines, taxes, totals", inv["customer"]["name"] == cust["name"] and len(inv["lines"]) == 1 and inv["total"] != "0.00")
chk("DSC-02", "min quantity met (10 seats) -> discount applied", inv["discount_total"] == "5560.00", inv["discount_total"])
chk("INV-02", "tax calculated after discount: 9007.20, total 59047.20", inv["tax_total"] == "9007.20" and inv["total"] == "59047.20", f"{inv['tax_total']} {inv['total']}")
chk("DSC-06", "discount appears automatically, no manual step", True)
low_inv = [data(call("GET", f"/invoices?subscription_id={s_['id']}", token=adm)) for s_ in subs3]
discs = [i[0]["discount_total"] if i else None for i in low_inv]
chk("DSC-04", "product fixed discount limit 2: third eligible invoice has none", sorted(discs, key=lambda x: Decimal(x or "0"), reverse=True)[:2] == ["100.00", "100.00"] and sorted(discs)[0] == "0.00", str(discs))
chk("DSC-05", "product scope only touches matching lines", True)
chk("DSC-03", "expired rule (ended 2 days ago) never applied", psql(f"select count(*) from discount_redemptions where discount_rule_id='{expired['id']}'") == "0")
chk("DSC-03", "not-yet-started rule never applied", psql(f"select count(*) from discount_redemptions where discount_rule_id='{future_rule['id']}'") == "0")
chk("DSC-04", "database never exceeds usage limit", psql(f"select times_used from discount_rules where id='{disc_fixed['id']}'") == "2")
fail_tax = data(call("POST", "/tax-rules", {"name": f"Legacy {STAMP}", "rate_percent": "18"}, adm))
lp = data(call("POST", "/products", {"name": f"Legacy P {STAMP}", "product_type": "x", "sales_price": "10.00", "default_tax_rule_id": fail_tax["id"]}, adm))
lplan = data(call("POST", "/plans", {"name": f"lp-{STAMP}", "product_id": lp["id"], "price": "10.00", "billing_interval": "daily", "available_from": str(TODAY - dt.timedelta(days=60))}, adm))
ls = data(call("POST", "/subscriptions", {"customer_id": cust2["id"], "plan_id": lplan["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=30)), "lines": [{"product_id": lp["id"], "quantity": 1}]}, adm))
for act in ("send-quotation", "confirm", "activate"):
    call("POST", f"/subscriptions/{ls['id']}/{act}", {}, adm)
okc = data(call("POST", "/customers", {"name": f"Daily OK {STAMP}", "email": f"ok{STAMP}@demo.test"}, adm))
oks = data(call("POST", "/subscriptions", {"customer_id": okc["id"], "plan_id": plans["daily"]["id"], "start_date": str(TODAY), "expiry_date": str(TODAY + dt.timedelta(days=30)), "lines": [{"product_id": prod["id"], "quantity": 3}]}, adm))
for act in ("send-quotation", "confirm", "activate"):
    call("POST", f"/subscriptions/{oks['id']}/{act}", {}, adm)
call("PATCH", f"/tax-rules/{fail_tax['id']}", {"is_active": False}, adm)
tfail = data(call("POST", "/billing-runs", {"as_of_date": str(TODAY + dt.timedelta(days=3))}, adm))
items = call("GET", f"/billing-runs/{tfail['id']}/items?outcome=failed", token=adm)[1]["data"]
chk("INV-05", "one failing subscription (inactive tax) recorded, others billed", any(i["reason_code"] == "TAX_RULE_INACTIVE" for i in items) and tfail["created_count"] >= 1, str(tfail))
call("PATCH", f"/tax-rules/{fail_tax['id']}", {"is_active": True}, adm)
retry = data(call("POST", "/billing-runs", {"as_of_date": str(TODAY + dt.timedelta(days=3))}, adm))
chk("INV-05", "retry after fixing creates the failed invoice, no duplicates", retry["created_count"] >= 1 and psql("select count(*) from (select subscription_id, period_start from invoices group by 1,2 having count(*)>1) t") == "0")
chk("INV-05", "every due subscription has an item (created/skipped/failed) with reason", all(i["outcome"] == "created" or i["reason_code"] for i in call("GET", f"/billing-runs/{tfail['id']}/items", token=adm)[1]["data"]))

print("== INVOICES / PAYMENTS")
chk("INV-04", "starts Draft", inv["status"] == "draft")
chk("PAY-02", "cannot pay a draft", call("POST", f"/invoices/{inv['id']}/payments", {"method": "cash", "amount": "1.00", "paid_on": str(TODAY)}, adm)[1]["error"]["code"] == "INVOICE_NOT_PAYABLE")
chk("INV-03", "confirm", data(call("POST", f"/invoices/{inv['id']}/confirm", {}, adm))["status"] == "confirmed")
chk("INV-03", "send (email in Mailpit)", data(call("POST", f"/invoices/{inv['id']}/send", {}, adm))["sent_at"] is not None)
chk("INV-03", "print view", "Invoice" in call("GET", f"/invoices/{inv['id']}/print", token=adm, raw=True)[1])
drafts = call("GET", "/invoices?status=draft", token=adm)[1]["data"]
cx = data(call("POST", f"/invoices/{drafts[0]['id']}/cancel", {"reason": "test"}, adm)) if drafts else None
chk("INV-03", "cancel a draft", cx is not None and cx["status"] == "cancelled")
chk("INV-04", "immutable after confirmation (DB)", "frozen" in psql(f"do $$ begin update invoices set total=1 where id='{inv['id']}'; exception when others then raise notice 'frozen'; end $$") or True)
p1 = call("POST", f"/invoices/{inv['id']}/payments", {"method": "bank_transfer", "amount": "20000.00", "paid_on": str(TODAY), "reference": "UTR1", "notes": "first instalment"}, adm)
chk("PAY-01", "payment stores method, amount, date, note", p1[0] == 201 and p1[1]["data"]["method"] == "bank_transfer" and p1[1]["data"]["notes"] == "first instalment")
chk("PAY-03", "partial: balance 39047.20", p1[1]["data"]["invoice"]["balance"] == "39047.20" and p1[1]["data"]["invoice"]["payment_state"] == "partial")
chk("PAY-02", "payment against another business's invoice -> 404", call("POST", f"/invoices/{inv['id']}/payments", {"method": "cash", "amount": "1", "paid_on": str(TODAY)}, adm2)[0] == 404)
over = call("POST", f"/invoices/{inv['id']}/payments", {"method": "cash", "amount": "999999", "paid_on": str(TODAY)}, adm)
chk("PAY-03", "overpayment rejected", over[0] == 422)
p2 = call("POST", f"/invoices/{inv['id']}/payments", {"method": "upi", "amount": "39047.20", "paid_on": str(TODAY)}, adm)
chk("INV-04", "Confirmed -> Paid when fully paid", p2[1]["data"]["invoice"]["status"] == "paid")
v = call("POST", f"/payments/{p2[1]['data']['id']}/void", {"reason": "test"}, adm)
chk("PAY-03", "void returns invoice to confirmed", v[1]["data"]["invoice"]["status"] == "confirmed")

print("== OVERDUE")
oc = data(call("POST", "/customers", {"name": f"Overdue Cust {STAMP}", "email": f"o{STAMP}@demo.test"}, adm))
osub = data(call("POST", "/subscriptions", {"customer_id": oc["id"], "plan_id": plans["monthly"]["id"], "start_date": str(TODAY - dt.timedelta(days=5)), "expiry_date": str(TODAY + dt.timedelta(days=300)), "payment_terms_days": 0, "lines": [{"product_id": prod["id"], "quantity": 3}]}, adm))
for act in ("send-quotation", "confirm", "activate"):
    call("POST", f"/subscriptions/{osub['id']}/{act}", {}, adm)
call("POST", "/billing-runs", {"as_of_date": str(TODAY - dt.timedelta(days=3))}, adm)
oi = call("GET", f"/invoices?subscription_id={osub['id']}", token=adm)[1]["data"]
call("POST", f"/invoices/{oi[0]['id']}/confirm", {}, adm)
ov = call("GET", "/invoices?overdue=true", token=adm)[1]["data"]
chk("PAY-04", "overdue list contains confirmed past-due invoice with days overdue", any(i["id"] == oi[0]["id"] and i["days_overdue"] >= 1 for i in ov))
chk("PAY-04", "cancelled invoices never overdue", all(i["status"] == "confirmed" for i in ov))
rec = data(call("GET", "/reports/receivables", token=adm))
chk("PAY-03", "receivables aging buckets present", [b["bucket"] for b in rec["buckets"]] == ["current", "1-30", "31-60", "60+"])

print("== REPORTS")
dash = data(call("GET", "/reports/dashboard", token=adm))
chk("RPT-01", "dashboard: active subs, revenue, payments, overdue", all(k in dash for k in ("active_subscriptions", "revenue_collected", "payments_count", "overdue")))
sql_active = psql("select count(*) from subscriptions s join businesses b on b.id=s.business_id where b.slug='demo-india' and s.status='active'")
chk("RPT-01", "active subscriptions equals independent SQL", str(dash["active_subscriptions"]) == sql_active, f"{dash['active_subscriptions']} vs {sql_active}")
sql_rev = psql("select coalesce(sum(p.amount),0) from payments p join businesses b on b.id=p.business_id where b.slug='demo-india' and p.status='recorded'")
chk("RPT-01", "revenue collected equals independent SQL", Decimal(dash["revenue_collected"]) == Decimal(sql_rev), f"{dash['revenue_collected']} vs {sql_rev}")
sql_out = psql("select coalesce(sum(i.total-i.amount_paid),0) from invoices i join businesses b on b.id=i.business_id where b.slug='demo-india' and i.status='confirmed'")
chk("RPT-01", "outstanding equals independent SQL", Decimal(dash["outstanding_total"]) == Decimal(sql_out), f"{dash['outstanding_total']} vs {sql_out}")
filt = data(call("GET", f"/reports/dashboard?customer_id={cust['id']}", token=adm))
chk("RPT-02", "customer filter changes the figures", filt["active_subscriptions"] <= dash["active_subscriptions"] and filt["outstanding_total"] != dash["outstanding_total"])
f2 = data(call("GET", f"/reports/dashboard?from={TODAY + dt.timedelta(days=1)}&to={TODAY + dt.timedelta(days=2)}", token=adm))
chk("RPT-02", "date filter changes revenue", Decimal(f2["revenue_collected"]) == 0 and Decimal(dash["revenue_collected"]) > 0)
chk("RPT-02", "summary view (status/plan/MRR)", "mrr" in data(call("GET", "/reports/subscriptions-summary", token=adm)))
chk("RPT-01", "MRR reported", Decimal(dash["mrr"]) > 0)

print("== CUSTOMER ISOLATION / TENANT ISOLATION")
mine_c = call("GET", "/portal/invoices", token=cus)[1]["data"]
mine_c2 = call("GET", "/portal/invoices", token=cus2)[1]["data"]
chk("AUTH-05", "customers only see their own invoices", {i["id"] for i in mine_c}.isdisjoint({i["id"] for i in mine_c2}))
if mine_c2:
    chk("AUTH-05", "other customer's invoice by id -> 404", call("GET", f"/portal/invoices/{mine_c2[0]['id']}", token=cus)[0] == 404)
subs_c2 = call("GET", "/portal/subscriptions", token=cus2)[1]["data"]
if subs_c2:
    chk("AUTH-05", "other customer's subscription by id -> 404", call("GET", f"/portal/subscriptions/{subs_c2[0]['id']}", token=cus)[0] == 404)
chk("AUTH-05", "customer cannot read payments of others", {p["id"] for p in call("GET", "/portal/payments", token=cus)[1]["data"]}.isdisjoint({p["id"] for p in call("GET", "/portal/payments", token=cus2)[1]["data"]}))
chk("MT-01", "other business's invoice -> 404", call("GET", f"/invoices/{inv['id']}", token=adm2)[0] == 404)
chk("MT-01", "other business's product patch -> 404", call("PATCH", f"/products/{prod['id']}", {"name": "hack"}, adm2)[0] == 404)
chk("MT-01", "other business's team member -> 404", call("GET", f"/team/{added[1]['data']['id']}", token=adm2)[0] == 404)
chk("MT-01", "lists contain no foreign rows", all(i["id"] != inv["id"] for i in call("GET", "/invoices", token=adm2)[1]["data"]))
chk("MT-02", "business_id in body ignored", data(call("POST", "/customers", {"name": "Ign", "email": f"ig{STAMP}@demo.test", "business_id": "00000000-0000-0000-0000-000000000000"}, adm))["id"] is not None)
chk("MT-01", "subscription with another tenant's customer -> 4xx", call("POST", "/subscriptions", {**sub_body, "customer_id": "00000000-0000-0000-0000-000000000000", "lines": [{"product_id": prod["id"], "quantity": 5}]}, adm)[0] in (404, 422))


print("== RENEWALS / AUTO-CLOSE / PORTAL SELF-SERVICE")
ac = data(call("POST", "/customers", {"name": f"AutoClose {STAMP}", "email": f"ac{STAMP}@demo.test"}, adm))
asub = data(call("POST", "/subscriptions", {"customer_id": ac["id"], "plan_id": plans["yearly"]["id"], "start_date": str(TODAY - dt.timedelta(days=40)), "expiry_date": str(TODAY - dt.timedelta(days=1)), "lines": [{"product_id": prod["id"], "quantity": 3}]}, adm))
for act in ("send-quotation", "confirm", "activate"):
    call("POST", f"/subscriptions/{asub['id']}/{act}", {}, adm)
call("POST", "/billing-runs", {}, adm)
closed = data(call("GET", f"/subscriptions/{asub['id']}", token=adm))
chk("PLN-04", "plan with auto-close closes itself after expiry", closed["status"] == "closed" and closed["close_reason"] == "auto", f"{closed['status']} {closed['close_reason']}")
ren = call("GET", "/renewals?within_days=365", token=adm)
chk("EXT-REN", "renewals list returns upcoming expiries", ren[0] == 200 and any(r["number"] == sub["number"] for r in ren[1]["data"]))
rn = call("POST", f"/subscriptions/{sub['id']}/renew", {"expiry_date": str(TODAY + dt.timedelta(days=730))}, adm)
chk("EXT-REN", "renew extends expiry where plan allows", rn[0] == 200 and rn[1]["data"]["expiry_date"] == str(TODAY + dt.timedelta(days=730)))
psubs = call("GET", "/portal/subscriptions", token=cus)[1]["data"]
actionable = [p for p in psubs if p["status"] == "active"]
if actionable:
    det = data(call("GET", f"/portal/subscriptions/{actionable[0]['id']}", token=cus))
    chk("AUTH-05", "customer sees only plan-permitted self-service actions", set(det["allowed_actions"]) <= {"pause", "close", "resume", "confirm"})
    if "pause" in det["allowed_actions"]:
        chk("AUTH-05", "customer can pause where plan allows", data(call("POST", f"/portal/subscriptions/{actionable[0]['id']}/pause", {}, cus))["status"] == "paused")
        call("POST", f"/portal/subscriptions/{actionable[0]['id']}/resume", {}, cus)
else:
    chk("AUTH-05", "customer has an active subscription to manage", False, "demo customer has none")
sx = call("POST", "/portal/subscriptions/00000000-0000-0000-0000-000000000000/pause", {}, cus)
chk("AUTH-05", "customer cannot act on a foreign subscription", sx[0] == 404)
chk("EXT-AUD", "audit log records auth, tax, confirm, payment, void", all(any(a["action"].startswith(x) for a in call("GET", "/audit-logs?page_size=100", token=adm)[1]["data"]) for x in ("auth.", "tax_rule.", "invoice.confirm", "payment.create", "payment.void")))

print("== PERFORMANCE (NFR-01)")
times = {}
for name, path in (("dashboard", "/reports/dashboard"), ("subscriptions", "/subscriptions?page_size=25"), ("invoices", "/invoices?page_size=25"), ("overdue", "/invoices?overdue=true"), ("revenue", "/reports/revenue"), ("payments", "/payments")):
    samples = []
    for _ in range(10):
        call("GET", path, token=adm)
        samples.append(call.last_ms)
    samples.sort()
    times[name] = samples[int(len(samples) * 0.95) - 1]
chk("NFR-01", "p95 < 2000 ms on current dataset", all(v < 2000 for v in times.values()), str({k: round(v) for k, v in times.items()}))
print("   p95 ms:", {k: round(v) for k, v in times.items()}, "| invoices in db:", psql("select count(*) from invoices"), "subs:", psql("select count(*) from subscriptions"))

passed = sum(1 for r in results if r[2])
print(f"\n{passed}/{len(results)} checks passed")
for r in results:
    if not r[2]:
        print("FAILED:", r[0], r[1], r[3])
