import argparse
import datetime as dt
import json
import re
import sys
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description="Seed realistic demo data through the public API")
parser.add_argument("--api", default="http://localhost:8000/api/v1")
parser.add_argument("--mailpit", default="http://localhost:8025")
parser.add_argument("--password", default="Admin12345@")
parser.add_argument("--prefix", default="", help="prefix for emails and slugs, e.g. t1-")
args = parser.parse_args()

P = args.prefix
PW = args.password
TODAY = dt.date.today()
day = lambda n: str(TODAY + dt.timedelta(days=n))
email = lambda name: f"{P}{name}@demo.test"


def call(method, path, body=None, token=None):
    req = urllib.request.Request(args.api + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


def ok(response, expected=(200, 201, 202)):
    status, body = response
    if status not in expected:
        sys.exit(f"unexpected {status}: {json.dumps(body)[:400]}")
    return body["data"]


def mail_ids(to):
    found = json.load(urllib.request.urlopen(f"{args.mailpit}/api/v1/search?query=to:{to}"))
    return {m["ID"] for m in found["messages"]}


def wait_token(to, known):
    for _ in range(60):
        found = json.load(urllib.request.urlopen(f"{args.mailpit}/api/v1/search?query=to:{to}"))
        for m in found["messages"]:
            if m["ID"] in known:
                continue
            text = json.load(urllib.request.urlopen(f"{args.mailpit}/api/v1/message/{m['ID']}"))["Text"]
            match = re.search(r"token=([\w-]+)", text)
            if match:
                return match.group(1)
        time.sleep(1)
    sys.exit(f"no invitation email arrived for {to} (is the worker running?)")


def activate_account(to, known):
    token = wait_token(to, known)
    ok(call("POST", "/auth/reset-password", {"token": token, "new_password": PW}))


def login(addr):
    return ok(call("POST", "/auth/login", {"email": addr, "password": PW}))["access_token"]


def step(message):
    print(f"-> {message}", flush=True)


step("Platform admin login")
plat = login(email("platform"))
slug_a, slug_b = f"{P}demo-india", f"{P}demo-isolation"
existing = {b["slug"] for b in call("GET", "/platform/businesses?page_size=100", token=plat)[1]["data"]}
if slug_a in existing:
    print(f"Business '{slug_a}' already exists - demo data is already seeded. Nothing to do.")
    sys.exit(0)

step("Creating the two businesses and activating their administrators")
known_a, known_b = mail_ids(email("admin")), mail_ids(email("admin2"))
ok(call("POST", "/platform/businesses", {"name": "Brightloop Software India", "slug": slug_a, "admin_full_name": "Priya Sharma", "admin_email": email("admin"), "timezone": "Asia/Kolkata", "currency": "INR"}, plat))
ok(call("POST", "/platform/businesses", {"name": "Sahyadri Business Services", "slug": slug_b, "admin_full_name": "Ananya Nair", "admin_email": email("admin2")}, plat))
activate_account(email("admin"), known_a)
activate_account(email("admin2"), known_b)
adm, adm2 = login(email("admin")), login(email("admin2"))

step("Tax rules")
gst18 = ok(call("POST", "/tax-rules", {"name": "GST 18% (software services)", "rate_percent": "18.0000"}, adm), (201,))
gst5 = ok(call("POST", "/tax-rules", {"name": "GST 5% (reduced)", "rate_percent": "5.0000"}, adm), (201,))
legacy = ok(call("POST", "/tax-rules", {"name": "GST Legacy 12%", "rate_percent": "12.0000"}, adm), (201,))

step("Products and variants")
def product(name, kind, price, cost, tax, notes, variants=()):
    return ok(call("POST", "/products", {"name": name, "product_type": kind, "sales_price": price, "cost_price": cost, "notes": notes, "default_tax_rule_id": tax["id"],
                                         "variants": [{"attribute": a, "value": v, "extra_price": e} for a, v, e in variants]}, adm), (201,))
odoo = product("Odoo ERP", "software", "5000.00", "3000.00", gst18, "Core ERP suite per user", [("Brand", "Odoo", "560.00"), ("Edition", "Pro", "1500.00"), ("Hosting", "Dedicated", "800.00")])
support = product("Support Add-on", "addon", "500.00", "150.00", gst18, "Priority email and phone support", [("Tier", "Gold", "250.00")])
backup = product("Cloud Backup", "service", "300.00", "90.00", gst18, "Nightly encrypted backups per user")
crm = product("CRM Suite", "software", "2500.00", "1400.00", gst18, "Sales pipeline and contacts")
training = product("Onboarding Workshop", "service", "12000.00", "6000.00", gst5, "Two-day on-site training")
legacy_prod = product("Legacy Reporting Pack", "software", "1000.00", "400.00", legacy, "Older product still on the legacy tax rule")

step("Plans (all four billing intervals, lifecycle options)")
start_avail = day(-400)
def plan(name, prod, price, interval, minq=1, **flags):
    return ok(call("POST", "/plans", {"name": name, "product_id": prod["id"], "price": price, "billing_interval": interval, "min_quantity": minq, "available_from": start_avail, **flags}, adm), (201,))
p_odoo_m = plan("Odoo Monthly", odoo, "5000.00", "monthly", allow_pause=True, allow_early_close=True, allow_renewal=True)
p_odoo_y = plan("Odoo Yearly", odoo, "55000.00", "yearly", 5, allow_renewal=True, auto_close_on_expiry=True)
p_sup_w = plan("Support Weekly", support, "500.00", "weekly", 1, allow_pause=True, allow_early_close=True)
p_crm_m = plan("CRM Monthly", crm, "2500.00", "monthly", 1, allow_pause=True, allow_early_close=True, allow_renewal=True)
p_crm_d = plan("CRM Daily Trial", crm, "100.00", "daily", 1, allow_early_close=True, auto_close_on_expiry=True)
p_bk_m = plan("Cloud Backup Monthly", backup, "300.00", "monthly", 5, allow_pause=True, allow_renewal=True)
p_leg = plan("Legacy Reporting Monthly", legacy_prod, "1000.00", "monthly")

step("Discount rules")
ok(call("POST", "/discount-rules", {"name": "10+ seats", "discount_type": "percentage", "value": "10.00", "scope": "subscription", "min_quantity": 10, "starts_on": day(-120), "ends_on": day(150), "usage_limit": 12}, adm), (201,))
ok(call("POST", "/discount-rules", {"name": "Support add-on Rs 100 off", "discount_type": "fixed", "value": "100.00", "scope": "product", "product_id": support["id"], "starts_on": day(-120), "usage_limit": 6}, adm), (201,))
ok(call("POST", "/discount-rules", {"name": "Diwali launch offer", "discount_type": "percentage", "value": "5.00", "scope": "subscription", "starts_on": day(-200), "ends_on": day(-20)}, adm), (201,))
ok(call("POST", "/discount-rules", {"name": "Annual commitment 8%", "discount_type": "percentage", "value": "8.00", "scope": "subscription", "min_purchase_amount": "50000.00", "starts_on": day(30)}, adm), (201,))

step("Customers")
people = [
    ("Lakshmi Traders", email("customer"), "12 Anna Salai, Chennai, Tamil Nadu", "FICTIONAL-GST-001"),
    ("Sahyadri Foods Pvt Ltd", email("customer2"), "45 FC Road, Pune, Maharashtra", "FICTIONAL-GST-002"),
    ("Kaveri Tech Solutions", f"accounts@{P}kaveritech.example", "88 Indiranagar, Bengaluru, Karnataka", "FICTIONAL-GST-003"),
    ("Himalayan Outfitters", f"billing@{P}himalayan.example", "7 Rajpur Road, Dehradun, Uttarakhand", "FICTIONAL-GST-004"),
    ("Coastal Logistics LLP", f"finance@{P}coastal.example", "21 Marine Drive, Kochi, Kerala", "FICTIONAL-GST-005"),
    ("Narmada Textiles", f"ap@{P}narmada.example", "3 Ring Road, Surat, Gujarat", "FICTIONAL-GST-006"),
    ("Delta Pharma Pvt Ltd", f"it@{P}deltapharma.example", "9 Banjara Hills, Hyderabad, Telangana", "FICTIONAL-GST-007"),
    ("Ananda Clinics", f"admin@{P}ananda.example", "17 Park Street, Kolkata, West Bengal", "FICTIONAL-GST-008"),
]
cust = {}
for name, addr, address, tax_id in people:
    cust[name] = ok(call("POST", "/customers", {"name": name, "email": addr, "phone": "+91 90000 00000", "billing_address": address, "tax_id": tax_id}, adm), (201,))

step("Quotation templates")
tmpl = ok(call("POST", "/quotation-templates", {"name": "Standard Odoo 12 months", "plan_id": p_odoo_m["id"], "validity_days": 14, "payment_terms_days": 15,
                                                "lines": [{"product_id": odoo["id"], "variant_id": odoo["variants"][0]["id"], "quantity": 10}]}, adm), (201,))
ok(call("POST", "/quotation-templates", {"name": "CRM starter (5 users)", "plan_id": p_crm_m["id"], "validity_days": 30, "payment_terms_days": 30,
                                         "lines": [{"product_id": crm["id"], "quantity": 5}]}, adm), (201,))

step("Subscriptions in every lifecycle state")
def sub(customer, plan_obj, start, end, lines=None, template=None, terms=None):
    body = {"customer_id": cust[customer]["id"], "start_date": day(start), "expiry_date": day(end)}
    if template:
        body["template_id"] = template["id"]
    else:
        body["plan_id"] = plan_obj["id"]
        body["lines"] = lines
    if terms is not None:
        body["payment_terms_days"] = terms
    return ok(call("POST", "/subscriptions", body, adm), (201,))
def advance(s, *actions):
    for a in actions:
        ok(call("POST", f"/subscriptions/{s['id']}/{a}", {}, adm))
ACTIVATE = ("send-quotation", "confirm", "activate")
v = lambda product_obj, i: product_obj["variants"][i]["id"]
s_lak = sub("Lakshmi Traders", None, -70, 295, template=tmpl, terms=15); advance(s_lak, *ACTIVATE)
s_sah = sub("Sahyadri Foods Pvt Ltd", p_odoo_y, -100, 265, [{"product_id": odoo["id"], "variant_id": v(odoo, 1), "quantity": 25}], terms=15); advance(s_sah, *ACTIVATE)
s_kav = sub("Kaveri Tech Solutions", p_odoo_m, -70, 295, [{"product_id": odoo["id"], "quantity": 5}, {"product_id": support["id"], "variant_id": v(support, 0), "quantity": 2}], terms=15); advance(s_kav, *ACTIVATE)
s_him = sub("Himalayan Outfitters", p_crm_m, -70, 295, [{"product_id": crm["id"], "quantity": 3}], terms=15); advance(s_him, *ACTIVATE)
s_coa = sub("Coastal Logistics LLP", p_bk_m, -40, 325, [{"product_id": backup["id"], "quantity": 20}], terms=15); advance(s_coa, *ACTIVATE)
s_ana = sub("Ananda Clinics", p_sup_w, -20, 345, [{"product_id": support["id"], "quantity": 4}], terms=7); advance(s_ana, *ACTIVATE)
s_trial = sub("Coastal Logistics LLP", p_crm_d, -30, -10, [{"product_id": crm["id"], "quantity": 2}], terms=0); advance(s_trial, *ACTIVATE)
s_nar = sub("Narmada Textiles", p_odoo_m, 0, 364, [{"product_id": odoo["id"], "quantity": 12}], terms=15); advance(s_nar, "send-quotation")
s_del = sub("Delta Pharma Pvt Ltd", p_odoo_m, 0, 364, [{"product_id": odoo["id"], "quantity": 15}], terms=15)
s_leg = sub("Ananda Clinics", p_leg, -10, 355, [{"product_id": legacy_prod["id"], "quantity": 1}], terms=15); advance(s_leg, *ACTIVATE)

step("Billing runs back in time (90, 65, 35 and 5 days ago) so invoices age naturally")
for offset in (-90, -65, -35):
    run = ok(call("POST", "/billing-runs", {"as_of_date": day(offset)}, adm))
    print(f"   as of {day(offset)}: created {run['created_count']}, skipped {run['skipped_count']}, failed {run['failed_count']}")
call("PATCH", f"/tax-rules/{legacy['id']}", {"is_active": False}, adm)
run = ok(call("POST", "/billing-runs", {"as_of_date": day(-5)}, adm))
print(f"   as of {day(-5)}: created {run['created_count']}, skipped {run['skipped_count']}, failed {run['failed_count']} (one failure is deliberate: the legacy tax rule is inactive)")
ok(call("POST", "/billing-runs", {}, adm))

step("Confirming, paying, partially paying and cancelling invoices")
invoices = call("GET", "/invoices?page_size=100&sort=issue_date", token=adm)[1]["data"]
invoices.sort(key=lambda i: (i["issue_date"], i["number"]))
old = [i for i in invoices if i["issue_date"] <= day(-30)]
recent = [i for i in invoices if i["issue_date"] > day(-30)]
for inv in old + recent[: len(recent) // 2]:
    ok(call("POST", f"/invoices/{inv['id']}/confirm", {}, adm))
methods = ["upi", "bank_transfer", "card", "cheque", "cash", "bank_transfer", "upi"]
paid_cases = 0
for index, inv in enumerate([i for i in old if i["issue_date"] <= day(-60)]):
    if index % 4 in (0, 2):
        continue
    ok(call("POST", f"/invoices/{inv['id']}/payments", {"method": methods[index % len(methods)], "amount": inv["total"], "paid_on": str(dt.date.fromisoformat(inv["issue_date"]) + dt.timedelta(days=4 + index)), "reference": f"DEMO-{inv['number']}", "notes": "Settled in full"}, adm), (201,))
    paid_cases += 1
mid = [i for i in old if day(-60) < i["issue_date"] <= day(-30)]
for index, inv in enumerate(mid):
    if index % 3 == 0:
        half = f"{(float(inv['total']) / 2):.2f}"
        ok(call("POST", f"/invoices/{inv['id']}/payments", {"method": "bank_transfer", "amount": half, "paid_on": day(-25), "reference": f"PART-{inv['number']}", "notes": "First instalment"}, adm), (201,))
    elif index % 3 == 1:
        ok(call("POST", f"/invoices/{inv['id']}/payments", {"method": "upi", "amount": inv["total"], "paid_on": day(-28), "reference": f"UPI-{inv['number']}"}, adm), (201,))
drafts = [i for i in call("GET", "/invoices?status=draft&page_size=100", token=adm)[1]["data"]]
if drafts:
    ok(call("POST", f"/invoices/{drafts[-1]['id']}/cancel", {"reason": "Duplicate order raised by customer"}, adm))
confirmed_one = next((i for i in call("GET", "/invoices?status=confirmed&page_size=100", token=adm)[1]["data"] if i["issue_date"] > day(-30)), None)
if confirmed_one:
    ok(call("POST", f"/invoices/{confirmed_one['id']}/send", {}, adm))

step("Pausing one subscription and closing the trial")
advance(s_coa, "pause")
if "close" in call("GET", f"/subscriptions/{s_trial['id']}", token=adm)[1]["data"]["allowed_actions"]:
    advance(s_trial, "close")

step("Staff and customer portal logins")
known = {"staff": mail_ids(email("staff")), "c1": mail_ids(email("customer")), "c2": mail_ids(email("customer2"))}
ok(call("POST", "/team", {"full_name": "Rohan Mehta", "email": email("staff"), "permissions": ["products.view", "plans.view", "customers.view", "subscriptions.view", "invoices.view"]}, adm), (201,))
ok(call("POST", f"/customers/{cust['Lakshmi Traders']['id']}/invite", {}, adm))
ok(call("POST", f"/customers/{cust['Sahyadri Foods Pvt Ltd']['id']}/invite", {}, adm))
activate_account(email("staff"), known["staff"])
activate_account(email("customer"), known["c1"])
activate_account(email("customer2"), known["c2"])

step("Second business (tenant isolation demo)")
gst5b = ok(call("POST", "/tax-rules", {"name": "GST 5%", "rate_percent": "5.0000"}, adm2), (201,))
gym = ok(call("POST", "/products", {"name": "Gym Membership", "product_type": "service", "sales_price": "1200.00", "cost_price": "300.00", "default_tax_rule_id": gst5b["id"]}, adm2), (201,))
gplan = ok(call("POST", "/plans", {"name": "Gym Monthly", "product_id": gym["id"], "price": "1200.00", "billing_interval": "monthly", "available_from": day(-100), "allow_pause": True}, adm2), (201,))
gcust = ok(call("POST", "/customers", {"name": "Gym One", "email": f"gym1@{P}sahyadri.example"}, adm2), (201,))
gsub = ok(call("POST", "/subscriptions", {"customer_id": gcust["id"], "plan_id": gplan["id"], "start_date": day(-10), "expiry_date": day(355), "lines": [{"product_id": gym["id"], "quantity": 1}]}, adm2), (201,))
for a in ACTIVATE:
    ok(call("POST", f"/subscriptions/{gsub['id']}/{a}", {}, adm2))
ok(call("POST", "/billing-runs", {}, adm2))

dash = ok(call("GET", "/reports/dashboard", token=adm))
print("\nSeed complete.")
print(f"  Business admin view: {dash['active_subscriptions']} active subscriptions, collected {dash['revenue_collected']}, outstanding {dash['outstanding_total']}, overdue {dash['overdue']['count']} invoices ({dash['overdue']['amount']}), MRR {dash['mrr']}")
print(f"  Logins (password {PW}): {email('platform')}, {email('admin')}, {email('admin2')}, {email('staff')}, {email('customer')}, {email('customer2')}")
