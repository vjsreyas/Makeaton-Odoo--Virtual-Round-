import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

API = os.environ.get("API", "http://localhost:8000/api/v1")
MAIL = os.environ.get("MAILPIT", "http://localhost:8025")
PLATFORM = (os.environ["PLATFORM_EMAIL"], os.environ["PLATFORM_PASSWORD"])
OWNER = (os.environ.get("OWNER_EMAIL", "owner@demo.test"), os.environ.get("OWNER_PASSWORD", "Owner!Passw0rd1"))
SLUG = os.environ.get("BUSINESS_SLUG", "demo-co")


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("content-type", "application/json")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null")


status, login = call("POST", "/auth/login", {"email": PLATFORM[0], "password": PLATFORM[1]})
if status != 200:
    sys.exit(f"platform login failed: {login}")
token = login["data"]["access_token"]
status, created = call("POST", "/platform/businesses", {"name": "Demo Co", "slug": SLUG, "admin_full_name": "Olive Owner", "admin_email": OWNER[0]}, token)
if status == 201:
    for _ in range(40):
        found = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/search?query=to:{OWNER[0]}"))
        if found["messages"]:
            text = json.load(urllib.request.urlopen(f"{MAIL}/api/v1/message/{found['messages'][0]['ID']}"))["Text"]
            invite = re.search(r"token=([\w-]+)", text).group(1)
            break
        time.sleep(1)
    else:
        sys.exit("invitation email did not arrive")
    status, accepted = call("POST", "/auth/reset-password", {"token": invite, "new_password": OWNER[1]})
    print("business created; owner activated:", status)
elif status == 409:
    print("business already exists")
else:
    sys.exit(f"create failed: {created}")
print(f"Business Admin: {OWNER[0]} / {OWNER[1]}   (business slug: {SLUG})")
