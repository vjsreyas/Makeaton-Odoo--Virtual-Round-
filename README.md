# Brightloop

Subscription billing for businesses that sell on repeat.

Brightloop replaces the spreadsheet, the hand-typed invoices and the quarter-end revenue scramble. A business sets up its products and plans, signs customers up, and lets the system do the rest: it works out what is due, creates the invoices, emails them, records payments and shows what is overdue. Many businesses can share one installation without ever seeing each other's data, and each business's customers get their own portal.

Built for the Makeaton hackathon.

## What it does

**For the platform owner**
- Creates businesses and invites their first administrator.
- Sees counts and status only, never a business's invoices.

**For a business (admin and staff)**
- Products with variants that add to the price, and plans from daily to yearly.
- Tax rules and discount rules (percentage or fixed, with dates and usage limits).
- Customers, quotation templates and subscriptions that move through Draft, Quotation, Confirmed, Active, Paused and Closed.
- One-click billing: invoices are created for everything that is due, with the discount applied first and tax on what is left.
- Invoice workflow (draft, confirmed, paid), email sending, printing, partial payments.
- Outstanding and overdue views with aging buckets, plus a dashboard with MRR, revenue collected and outstanding.
- A team page where the admin grants each staff member exactly the permissions they need.

**For customers**
- A portal showing their own subscriptions, invoices and payment history, with pause or accept where the plan allows it.

## How it is built

| Part | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router |
| Runtime | Docker Compose: `db`, `migrate`, `api`, `worker`, `mailpit` |

The `worker` runs the scheduled billing sweep and delivers queued email. `mailpit` catches every outgoing email locally so you can read invitations and reset links without a real mail server.

```
backend/    FastAPI app, migrations, demo and check tools
frontend/   React app (business workspace, platform admin, customer portal)
docker/     database initialisation
```

## Run it

You need Docker with Compose, Node 20+, Python 3, curl and git.

```bash
git clone <repo-url>
cd <repo>

cp .env.example .env
```

Open `.env` and replace the three placeholders with your own values:

```bash
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(python3 -c 'import secrets;print(secrets.token_hex(16))')|" .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(python3 -c 'import secrets;print(secrets.token_hex(32))')|" .env
sed -i "s|^OUTBOX_ENCRYPTION_KEY=.*|OUTBOX_ENCRYPTION_KEY=$(python3 -c 'import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())')|" .env
```

Then start the stack, create the platform admin and load the sample data:

```bash
docker compose up --build -d

docker compose run --rm api python -m app.tools.create_platform_admin \
  --email platform@demo.test --password 'Admin12345@' --name "Platform Admin"

python3 backend/tools/seed_demo.py

cd frontend && npm install && npm run dev
```

The seed script fills the system through the public API with realistic Indian-business sample data. It takes about ten seconds and skips itself if the data already exists. Wait until `http://localhost:8000/api/v1/health` answers before running it.

`docker-compose.yml` turns `ALLOW_BILLING_TIME_TRAVEL` on by default so billing can be run for past dates. Set it to `false` in `.env` for a real deployment.

Then open:

| What | Where |
|---|---|
| The app | http://localhost:5173 |
| API docs | http://localhost:8000/docs |
| Email inbox (Mailpit) | http://localhost:8025 |

### Demo logins

Every account uses the password `Admin12345@`.

| Email | Role |
|---|---|
| `platform@demo.test` | Platform admin |
| `admin@demo.test` | Business admin, Brightloop Software India |
| `admin2@demo.test` | Business admin, a second and empty business |
| `staff@demo.test` | Staff with limited permissions |
| `customer@demo.test` | Customer portal, Lakshmi Traders |
| `customer2@demo.test` | Customer portal, Sahyadri Foods |

Login is limited to five attempts a minute per email, so go slowly if you mistype.

### A good first five minutes

1. Sign in as `admin@demo.test` and look at Products, Plans and Subscriptions.
2. Open **Billing Run** and click **Run billing**. Run it again and notice nothing is billed twice.
3. Open an invoice: confirm it, send it (check Mailpit), record a partial payment, then the rest.
4. Look at **Outstanding & Overdue** and the dashboard.
5. Sign in as `staff@demo.test` to see the reduced menu, then as `customer@demo.test` for the portal.

### Stopping and cleaning up

```bash
docker compose down        # stop, keep the data
docker compose down -v     # stop and delete the database too
```

## Design choices worth knowing

- **Tenant isolation is enforced by the database.** The business always comes from the login token, every query filters on it, and composite foreign keys make a cross-business reference impossible even if application code had a bug. Someone else's record answers 404.
- **Billing cannot double-charge.** A unique key on subscription and period, an atomic schedule update and a per-business advisory lock mean running billing twice, or at the same moment from two places, creates each invoice once.
- **One bad subscription never blocks the rest.** Failures are recorded with a reason; fix the cause, run again, and only the unbilled ones are retried.
- **Money is exact.** `numeric(14,2)` in the database, `Decimal` with half-up rounding in code, and check constraints on invoice totals. Confirmed invoices are frozen by a trigger; mistakes are fixed by cancelling.
- **Safe retries on payments.** An `Idempotency-Key` returns the original payment for an identical retry and rejects a changed request.
- **Careful sign-in.** Argon2id passwords, short-lived tokens re-checked against the database on every request, single-use reset and invitation links, and token storage in the browser tab only (never `localStorage`).
- **The server owns the rules.** Subscription actions come from the API as `allowed_actions`, and permissions are enforced on the server whatever the UI shows.

## Tests

```bash
cd frontend && npm test                   # 111 component and routing tests
cd frontend && npm run lint && npm run build
python3 backend/tools/e2e_smoke.py        # full flow against the running stack
python3 backend/tools/requirements_check.py   # drives the whole hackathon scenario, 104 checks
```

The backend also has its own pytest suite (312 tests), but it is kept out of this repository, so it is not part of the clone. A benchmark with 5,000 subscriptions and 30,000 invoices answered every page in well under a second.

## Known gaps

Being honest about what is not here:
- Email verification at sign-up.
- A payment gateway; payments are recorded manually.
- PDF and CSV export (invoices print from the browser).
- The app connects to the database as its owner role rather than a least-privilege one.
- Rate-limit counters live in each API process rather than being shared.
- No UI yet for editing quotation templates or browsing the audit log (both exist in the API).

## Configuration

Everything is set through `.env` (copied from `.env.example` by the setup script, with secrets generated). The ones you are most likely to change are `APP_BASE_URL`, `DEFAULT_TIMEZONE`, `JWT_SECRET`, `OUTBOX_ENCRYPTION_KEY`, the SMTP settings and `BILLING_SWEEP_MINUTES`. Never commit a real `.env`.
