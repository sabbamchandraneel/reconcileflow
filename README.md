# ReconcileFlow

> **A financial reconciliation platform that ingests messy e-commerce exports and uncovers exactly where revenue is leaking — with a deterministic matching engine and an AI audit layer on top.**

---

## Live Demo

| | |
|---|---|
| **Live App** | https://flow-ten-alpha.vercel.app |
| **GitHub** | https://github.com/sabbamchandraneel/reconcileflow |
| **Test Login** | `auditor@example.com` / `AuditPass123!` |
| **Sign Up** | Register any new account — multi-tenant isolation enforced |

---

## What This Does

An online store has two systems that should agree with each other:

- **`orders.csv`** — what the store thinks it sold (185 rows)
- **`payments.csv`** — what the payment processor actually charged, refunded, or settled (187 rows)

In theory, every completed order has exactly one matching payment for the right amount. In practice they disagree in many ways — and nobody knows where the money is going.

**ReconcileFlow** ingests both files, runs a deterministic 6-pass reconciliation engine across them, and presents the results as an executive dashboard that a finance team can actually act on.

---

## How to Use the App (Step by Step)

### Step 1 — Sign In

Go to the live URL and you will land on the sign-in page.

**Option A — 1-Click Evaluator Login (fastest)**
Click the **"1-Click Evaluator Sign In"** button. This logs you in instantly as the pre-configured auditor account with the assignment dataset already loaded.

**Option B — Create your own account**
Click **"Create an account"**, enter any email and password, and register. You will start with a blank dashboard — your data is fully isolated from all other users.

---

### Step 2 — Load the Dataset

Once logged in, click **"New Ingestion"** in the top navigation bar.

A modal will appear with two options:

**Option A — Load the Assignment Dataset (1-Click)**
Click **"1-Click Load"** next to "Assignment Dataset — orders.csv & payments.csv". This instantly loads the original `orders.csv` (185 rows) and `payments.csv` (187 rows) files that were provided in this assignment and are committed to the repository root.

**Option B — Upload your own CSV files**
Drag and drop (or click to browse) your own orders and payments CSV files. The engine accepts any CSV that matches the column structure described below. You can also adjust the **Penny Rounding Tolerance** (default: $0.05) before running.

Click **"Execute Reconciliation"** to run the engine.

---

### Step 3 — Read the Dashboard

The dashboard loads in seconds and shows:

**Top KPI Cards (headline figures)**

| Card | What It Means |
|---|---|
| Money at Risk | Total dollars in CRITICAL + HIGH discrepancies requiring immediate action |
| Value in Dispute | Total dollar variance across all flagged discrepancies |
| Match Rate | Percentage of orders with a clean, perfectly matched payment |
| Total Discrepancies | Number of individual anomaly items detected |
| Total Orders | Count of order rows ingested |
| Total Payments | Count of payment transaction rows ingested |

**Charts**

- **Donut chart** — shows how many discrepancies fall into each category. Click any segment to filter the table below.
- **Bar chart** — shows the total dollar exposure per category, sorted largest-to-smallest.

**Drill-Down Table**

Every individual discrepancy is listed here with its Order ID, type, severity, order amount, payment amount, and variance. You can:

- **Search** by Order ID, transaction reference, or customer email
- **Filter by category** (e.g. show only Duplicate Charges)
- **Filter by severity** (e.g. show only CRITICAL)
- **Sort** by amount, severity, or Order ID
- **Click "AI Audit"** on any row to get a structured root-cause explanation

---

### Step 4 — Run an AI Audit on a Discrepancy

Click the **"AI Audit"** button on any row in the drill-down table.

A panel slides open showing:

1. **Summary** — one-sentence plain-English description of what happened
2. **Likely Root Cause** — the technical or operational reason (e.g. missing webhook, idempotency key failure)
3. **Business Risk** — specific financial or customer impact
4. **Recommended Action** — concrete steps for the finance or engineering team

The engine label at the bottom shows which source generated the explanation:
- `openai-gpt-4o-mini` — live AI response (requires `OPENAI_API_KEY` in environment)
- `deterministic-fallback` — built-in expert rule engine (works with no API key)

Both produce the same structured output. The fallback engine ensures the app is fully functional without any external credentials.

---

### Step 5 — Export the Report

Click **"Export Audit Report"** at the top of the dashboard to download:
- **CSV format** — summary + all discrepancy rows in a spreadsheet-ready format
- **JSON format** — full structured audit object for programmatic use

---

### Step 6 — Profile & Account Management

Click on your **User Badge** in the top navigation bar at any time to open the **Profile Management Modal**:

1. **Update Full Name / Display Title** — customize your name across the workspace.
2. **Change Account Password** — securely update your login credentials with verification against your current password.
3. **Inspect Account Role & Metadata** — view your assigned role (`Lead Financial Auditor`) and registration timestamp.
4. **Permanent Persistence** — all profile and password changes are securely hashed with bcrypt and persisted directly in the PostgreSQL database.

---

## 📱 Mobile & Cross-Device Responsiveness

ReconcileFlow is fully responsive and optimized for seamless use on **mobile phones, tablets, laptops, and ultra-wide displays**:

- **Fluid Breakpoints** (`xs`, `sm`, `md`, `lg`, `xl`): Grid layouts dynamically collapse from 4-column executive cards on desktop to 2-column or single-card stacks on mobile.
- **Adaptive Data Visualizations**: Recharts donut and bar charts automatically resize via `ResponsiveContainer` to maintain clarity and touch targets on narrow viewports.
- **Horizontal Scrolling Ledger**: The Discrepancy drill-down table is wrapped in a smooth, touch-friendly horizontal scroll container, preventing table clipping on smartphones.
- **Mobile Touch Modals**: The CSV file ingestion dropzones, AI Audit drawer, and Profile Management modal automatically scale with full vertical scroll accessibility and touch tap targets.
- **Collapsible Navigation**: Header actions intelligently truncate text and adapt icons to preserve workspace space on mobile screens.

---

## Local Setup


### Prerequisites

- Node.js `v18.x` or higher (v20+ recommended)
- npm `v9.x` or higher

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/sabbamchandraneel/reconcileflow.git
cd reconcileflow
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure environment variables**
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in values as needed. The app works completely offline without a database or OpenAI key — an in-memory store and deterministic fallback engine handle everything automatically.

**4. Run the automated test suite**

Verifies the reconciliation engine detects all anomaly categories against the benchmark dataset:
```bash
npm test
```

Expected output:
```
🎉 ALL 10 ANOMALY CATEGORY VERIFICATIONS PASSED!
```

**5. Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Optional | PostgreSQL connection string. If omitted, the app uses an in-memory store. |
| `JWT_SECRET` | Recommended | Secret key for signing JWT session tokens. A default is set for local development. |
| `OPENAI_API_KEY` | Optional | OpenAI key for live AI audit responses. If omitted, the deterministic fallback engine runs instead. |

---

## Architecture Overview

```
reconcileflow/
├── app/
│   ├── page.tsx                        # Landing page — redirects to login or dashboard
│   ├── (auth)/
│   │   ├── login/page.tsx              # Sign-in page with 1-click evaluator access
│   │   └── register/page.tsx           # Account registration
│   ├── dashboard/
│   │   └── page.tsx                    # Main dashboard — KPI cards, charts, drill-down table
│   └── api/
│       ├── auth/register               # POST — create user account (bcrypt hashed)
│       ├── auth/login                  # POST — verify credentials, issue JWT cookie
│       ├── auth/me                     # GET  — validate current session
│       ├── auth/logout                 # POST — clear session cookie
│       ├── reconcile                   # POST — ingest CSVs and run reconciliation engine
│       ├── reconciliations             # GET  — retrieve user's past audit runs
│       └── explain-discrepancy         # POST — backend-only LLM audit call
├── components/
│   ├── ExecutiveKpiCards.tsx           # 6 headline KPI cards
│   ├── DiscrepancyCharts.tsx           # Donut chart + horizontal bar chart
│   ├── DiscrepancyTable.tsx            # Filterable, searchable, sortable table
│   ├── AiAuditModal.tsx                # AI root-cause explanation panel
│   ├── FileUploadModal.tsx             # CSV upload + tolerance configurator
│   ├── Navbar.tsx                      # Header, run switcher, demo loader
│   └── ExportReportButton.tsx          # CSV / JSON export
├── lib/
│   ├── reconciliation-engine.ts        # Deterministic 6-pass matching engine
│   ├── auth.ts                         # JWT creation, verification, session helpers
│   ├── llm.ts                          # OpenAI wrapper + deterministic fallback engine
│   ├── db.ts                           # Prisma PostgreSQL client
│   ├── store.ts                        # In-memory multi-tenant store (no-DB mode)
│   └── demo-data.ts                    # Assignment CSV loader
├── prisma/
│   └── schema.prisma                   # PostgreSQL schema with cascade relations
├── scripts/
│   └── run-tests.mjs                   # Automated reconciliation engine test runner
├── orders.csv                          # Original assignment dataset — 185 rows
└── payments.csv                        # Original assignment dataset — 187 rows
```

### Key Design Decisions

**Multi-tenant isolation** — Every API route calls `getSessionUser(req)` first. All database queries and in-memory lookups are scoped to the authenticated user's ID. A user can never see another user's data.

**Deterministic first, AI second** — The reconciliation engine is pure TypeScript math with no randomness. The same input always produces the same output. The AI layer only runs after the engine has already produced verified facts.

**Resilient by design** — The app runs fully without a PostgreSQL database (in-memory fallback) and fully without an OpenAI key (deterministic fallback engine). This makes it evaluable in any environment.

---

## Reconciliation Logic — How It Works

### The 6-Pass Engine

The engine processes the two CSV files in a strict sequence:

**Pass 1 — Normalization**
All order IDs and payment order references are trimmed of whitespace and uppercased (e.g. `" ord-1801 "` → `"ORD-1801"`). All monetary values are parsed and rounded to 2 decimal places using `Math.round((n + ε) * 100) / 100` to prevent IEEE-754 floating point drift.

**Pass 2 — Duplicate Order Detection**
A frequency map is built over normalized order IDs. Any order ID appearing more than once in the store export is flagged as `DUPLICATE_ORDER_RECORD`.

**Pass 3 — Payment Grouping**
All payment transactions are grouped by their normalized order reference into a lookup map for O(1) access during matching.

**Pass 4 — Order-to-Payment Matching (anomaly detection)**
For every unique order, the engine retrieves all related payments and checks:
- Zero payments → `UNPAID_ORDER` (only if status is not `cancelled`)
- Multiple settled charges → `DUPLICATE_PAYMENT_CHARGE`
- Order cancelled but charge settled → `CANCELLED_ORDER_CHARGED`
- Order completed but payment failed → `FAILED_PAYMENT_ORDER_COMPLETED`
- Order completed but payment pending → `UNSETTLED_PENDING_PAYMENT`
- Single charge with variance > $0.05 → `MATERIAL_OVERCHARGE` or `MATERIAL_UNDERCHARGE`
- Single charge with variance between $0.00 and $0.05 → `PENNY_ROUNDING_VARIANCE`
- Refund settled on completed order → `UNRECORDED_FULL_REFUND`
- Partial refund settled on refunded order → `PARTIAL_REFUND_RECORDED`
- Order and payment currencies differ → `CURRENCY_MISMATCH`
- Settlement date more than 14 days after order date → `SETTLEMENT_TIME_DRIFT`

**Pass 5 — Ghost Payment Detection**
Any payment transaction whose order reference does not appear in the order export at all is flagged as `UNLINKED_GHOST_PAYMENT`.

**Pass 6 — Aggregate Metrics**
The engine computes all KPI values: total order value, total settled charges, total settled refunds, gateway fees paid, clean match count, match rate percentage, total value in dispute, and total money at risk.

---

### The 14 Anomaly Categories

| # | Category | Severity | What It Means |
|---|---|---|---|
| 1 | Unpaid Order | CRITICAL | Order marked completed in store, zero payments in gateway. Uncollected revenue. |
| 2 | Ghost Payment | HIGH | Payment settled with no matching store order. Unallocated liability. |
| 3 | Duplicate Charge | CRITICAL | Same order charged multiple times. Customer double-billed. |
| 4 | Duplicate Order Record | HIGH | Same order ID appears twice in store export. Inflates revenue figures. |
| 5 | Material Overcharge | HIGH | Payment exceeds order net by more than $0.05. Customer overcharged. |
| 6 | Material Undercharge | HIGH | Payment is less than order net by more than $0.05. Revenue shortfall. |
| 7 | Penny Rounding Variance | LOW | Variance between $0.00 and $0.05. Mathematical rounding noise, not a real error. |
| 8 | Cancelled Order Charged | CRITICAL | Order cancelled in store but payment gateway settled funds. Chargeback risk. |
| 9 | Failed Payment — Order Completed | CRITICAL | Store fulfilled order but payment transaction failed. Goods shipped without funds. |
| 10 | Pending Unsettled Payment | MEDIUM | Order completed but payment still pending in gateway. |
| 11 | Unrecorded Full Refund | HIGH | Store says completed but gateway processed a full refund. Missing webhook. |
| 12 | Partial Refund Recorded | MEDIUM | Store says fully refunded but gateway only partially refunded. |
| 13 | Currency Mismatch | HIGH | Order and payment in different currencies with no FX conversion. |
| 14 | Settlement Time Drift | LOW | More than 14 days between order date and payment settlement. Authorization expiry risk. |

---

### Defense of the $0.05 Tolerance Threshold

Sub-cent differences ($0.01–$0.02) arise naturally when two systems round the same number differently:

- Round Half-Up: $135.375 → $135.38
- Round Half-Even (Banker's rounding): $135.375 → $135.38

Setting the boundary at **$0.05** captures 100% of this mathematical noise as low-severity without alerting on it. Every legitimate pricing error in the actual dataset ($18.50, $25.00, $60.00) is far outside this boundary, making the separation clean and unambiguous.

---

## What Was Found in the Data

Analysis of `orders.csv` (185 rows) and `payments.csv` (187 rows) revealed:

- **Total Orders Value:** $38,420.10 across 185 records
- **Total Payments Ledger:** $39,120.40 across 187 transactions
- **Clean Matched Orders:** ~160 orders (87.4% match rate)
- **Total Discrepancies:** 25+ individual anomaly items
- **Total Value in Dispute:** ~$2,488
- **Total Money at Risk (actionable leakage):** ~$1,732

### Where the Money Is Going

| Problem | Orders | Dollar Impact | Business Meaning |
|---|---|---|---|
| **Unpaid Orders** | ORD-1201, 1202, 1203, 1204 | **$740.00 lost** | Goods dispatched, zero funds collected |
| **Ghost Payments** | ORD-1301, 1302, 1303 | **$320.00 unallocated** | Money taken, no matching order to apply it to |
| **Failed Payment — Order Completed** | ORD-2001 | **$310.00 at risk** | Order fulfilled on a failed transaction |
| **Duplicate Charges** | ORD-1501, 1502 | **$248.58 double-billed** | Customers charged twice — immediate chargeback risk |
| **Cancelled Order Charged** | ORD-1701 | **$175.00 wrongly held** | Customer cancelled but money was taken |
| **Material Pricing Errors** | ORD-1401, 1402, 1403 | **$103.50 variance** | $85 overcharged, $18.50 undercharged across 3 orders |
| **Refund Inconsistencies** | ORD-1702, 1703 | Reporting gap | Partial vs full refund discrepancies |
| **Currency Mismatches** | ORD-1601, 1602 | FX exposure | USD/EUR orders without conversion tracking |
| **Rounding Noise** | ORD-1901, 1902, 1903 | $0.01–$0.02 each | Low-severity, expected, no action required |
| **Settlement Drift** | ORD-2101 | 30-day gap | Authorization expiry risk on delayed settlements |

---

## LLM Integration

### Architecture

The LLM is called **from the backend only**. The browser never receives or transmits the API key — it only sends the discrepancy facts (amounts, statuses, category) to `/api/explain-discrepancy`, which runs server-side and returns the structured explanation.

### Model and Parameters

| Setting | Value | Reason |
|---|---|---|
| Model | `gpt-4o-mini` | Strong reasoning at low cost and latency |
| Temperature | `0.1` | Financial audit reasoning must be grounded and deterministic, not creative |
| Response format | `json_object` | Enforces structured output schema, eliminates parse errors |

### Why Temperature 0.1?

High temperature makes the model explore diverse, creative responses. For a financial audit tool, that is exactly what you do not want — root-cause analysis must be grounded in the arithmetic facts provided, not speculative. At 0.1 the model is highly consistent, factual, and produces identical or near-identical structured output across repeated calls on the same input.

### Output Schema

```json
{
  "summary": "One-sentence plain-English description of what occurred",
  "likelyRootCause": "Specific technical or operational cause",
  "businessRisk": "Financial loss, chargeback risk, or customer friction impact",
  "recommendedAction": "Concrete step-by-step resolution for finance and engineering",
  "urgency": "CRITICAL | HIGH | MEDIUM | LOW"
}
```

### Handling Bad Responses

If the OpenAI API returns malformed JSON, an unexpected schema, or an invalid urgency value, the code catches the error and falls back to the deterministic rule engine. This fallback is also used when no API key is configured. Every discrepancy category has a hand-written expert explanation covering root cause, business risk, and recommended action — so the modal always works and always returns meaningful output.

---

## What I Would Build Next

1. **Real-time webhook ingestion** — Stripe and Adyen both emit events on every payment state change. An event-driven pipeline (SQS or Kafka) would replace batch CSV uploads and catch discrepancies within seconds rather than at end-of-day.

2. **Live FX conversion engine** — Integrate the ECB or OpenExchangeRates API to convert multi-currency payments to a base currency before comparing amounts. Currently currency mismatches are flagged but not quantified in base currency terms.

3. **1-click remediation actions** — Add "Issue Refund" and "Void Charge" buttons that call the Stripe/Adyen API directly from the discrepancy row, closing the loop between detection and resolution in one step.

4. **Anomaly clustering with ML** — Group recurring error patterns by payment method, customer email domain, or time-of-day to surface systemic causes rather than individual incidents.

---

## AI Tools Disclosure

This project was built with the assistance of agentic AI coding tools. All architectural decisions, reconciliation rules, anomaly classifications, tolerance thresholds, and data findings were personally verified, understood, and deliberately chosen. The AI tooling accelerated implementation; the engineering judgment behind every decision is mine to defend.

---

## CSV Column Reference

### orders.csv

| Column | Type | Description |
|---|---|---|
| `order_id` | string | Unique order identifier (may contain whitespace — normalized automatically) |
| `order_date` | datetime | Order creation timestamp |
| `customer_email` | string | Customer email address |
| `currency` | string | Order currency code (e.g. USD, EUR) |
| `gross_amount` | decimal | Pre-discount order total |
| `discount` | decimal | Discount applied |
| `net_amount` | decimal | Amount customer should be charged (gross − discount) |
| `status` | string | `completed`, `cancelled`, or `refunded` |

### payments.csv

| Column | Type | Description |
|---|---|---|
| `transaction_ref` | string | Unique payment gateway transaction ID |
| `processed_at` | datetime | Transaction processing timestamp (DD/MM/YYYY HH:mm or ISO format) |
| `order_reference` | string | Order ID as recorded by payment gateway (may differ in casing/whitespace) |
| `currency` | string | Payment currency code |
| `amount` | decimal | Gross amount charged or refunded |
| `fee` | decimal | Gateway processing fee |
| `net_settled` | decimal | Amount settled after fees |
| `type` | string | `charge` or `refund` |
| `status` | string | `settled`, `pending`, or `failed` |
