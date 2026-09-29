# MSA – Medicine Shop Automation

**MSA (Medicine Shop Automation)** is a clean, modern, zero-backend retail pharmacy management web application designed for independent medical shop owners. It provides complete end-to-end automation for sales dispensing with First-Expired-First-Out (FEFO) batch allocation, inventory tracking, wholesale inward supplies, automated cheque generation, end-of-day reorder forecasting, expired stock returns, and financial reporting.

Built for seamless **Vercel** deployment with zero configuration, zero external database setup, and zero environment variables.

---

## Key Highlights

- **Zero-Config Vercel Deployment**: No external database, no third-party APIs, no environment variables. Simply import into Vercel and deploy.
- **Offline & Browser-Persistent**: Built on Zustand with local storage persistence (`/lib/store/useAppStore.ts`), hydration mismatch guards, and atomic mutations.
- **Reproducible Seed Data**: Deterministic pseudo-random seed generator (`/lib/seed.ts`) generates 25 Indian medicines, 5 vendors, multi-batch inventories (including expired and near-expiry batches), and 6 weeks of historical sales relative to the current day.
- **Strict FEFO Dispensing**: Point of Sale automatically spans and consumes the earliest-expiring non-expired batches first. Prevents selling expired stock or overselling.
- **Printable Documents**: Includes `@media print` optimized layouts for POS Cash Memos, CTS-2010 Bank Cheques (words in Indian numbering system), Adhesive Shelf Barcode Labels, Purchase Reorder Indents, and Expired Stock Return Memos.
- **Indian Pharmacy Conventions**: Currency in INR (`₹1,23,456.00`), dates in `DD MMM YYYY`, and amount in Indian words ("Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only").

---

## Feature-to-Page Map

| Feature | Route | Description |
| :--- | :--- | :--- |
| **Dashboard** | `/` | KPI summary cards (Today's Sales, Low-stock alerts, Expired batches, Month Profit), instant global medicine search autocomplete, quick actions, recent sales ledger. |
| **New Sale (POS)** | `/sales` | Fast POS prescription counter. Code lookup and autocomplete, live non-expired stock indicators, live FEFO batch deduction breakdown, oversell prevention, instant cash memo receipt generation. |
| **Receive Supply** | `/supply` | Inward wholesale stock from distributors. Select vendor, add batches with expiry dates and purchase costs, atomic inventory update, and auto-generated bank cheque with figures and words. |
| **Medicines Catalog** | `/medicines` | Complete medicine inventory table with code, generic composition, rack location, MRP, cost, and live stock on hand. Add/edit modal with multi-vendor linking and printable rack barcode label generation. |
| **Vendors / Distributors** | `/vendors` | Directory of wholesale pharmaceutical distributors with contact details and linked medicine lines. Add/edit modal with catalog selection. |
| **Stock & Batch Query** | `/query` | Fast, case-insensitive partial search by brand/trade name or generic molecule. Displays rack number, total non-expired stock, and granular batch-by-batch breakdown (batch no, expiry date, status, supplier). |
| **Reorder List** | `/reorder` | End-of-day inventory forecasting command. Computes weekly sales velocity: $\text{Units Sold} / (N / 7)$ over $N$ days (default 28). If stock < weekly average, suggests reorder quantity: $\lceil \text{Weekly Avg} \times \text{Multiplier} - \text{Stock} \rceil$. Grouped by vendor with printable Purchase Indent. |
| **Expiry Reports** | `/expiry` | End-of-day quarantine audit. Shows all expired batches and groups them by vendor for debit replacement claims. Includes one-click **"Mark as Returned / Written Off"** action that zeroes out batches. |
| **Financial Reports** | `/reports` | Date-filtered financial analytics (Today, 7D, 30D, This Month, All Time). Summarizes Gross Revenue, Wholesale Cost of Goods Sold (COGS), Gross Profit, and Margin %. Interactive daily trend chart using Recharts and distributor remittance table. |
| **Settings** | `/settings` | Store profile configuration (Shop Name, Address, Phone, GSTIN/DL), default reorder parameters, storage diagnostics, and one-click **"Reset Demo Data"** button with confirmation. |

### Printable Documents (`@media print`)

| Document | Route | Print Details |
| :--- | :--- | :--- |
| **POS Cash Receipt** | `/print/receipt/[id]` | Retail cash memo with store header, receipt sequence, batch-wise items, total in INR and words, receipt barcode, and customer care notes. |
| **Bank Cheque** | `/print/cheque/[id]` | CTS-2010 cheque leaf with DDMMYYYY date boxes, vendor payee line, amount in Indian words ("Rupees ... Only"), security figures box, A/C Payee stamp, and MICR line. |
| **Rack Barcode Label** | `/print/label/[medicineId]` | High-contrast shelf/bin adhesive stickers with medicine code, trade name, generic molecule, rack coordinates, retail MRP, and crisp SVG barcode. |
| **Purchase Order Indent** | `/print/reorder` | Official procurement indent grouped by distributor with current stock, sales velocity, order quantity, and signature lines. |
| **Expiry Return Memo** | `/print/expiry` | Formal expired stock quarantine and credit debit memo grouped by distributor with batch details and replacement return value. |

---

## Architecture & Technology Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **State & Persistence**: Zustand with `persist` middleware backed by `localStorage`
- **Hydration Safety**: `<HydrationShield>` component with client skeleton fallback to prevent React SSR hydration mismatches
- **Pure Domain Services**: Business logic lives strictly in `/lib/services/` as side-effect-free pure functions:
  - `sales.ts`: First-Expired-First-Out (FEFO) batch allocation spanning batches, oversell validation, and snapshot pricing.
  - `supply.ts`: Inward stock batch incrementation/creation and cheque sequencing.
  - `reorder.ts`: Weekly sales velocity calculation and vendor grouping.
  - `expiry.ts`: Expired batch identification, vendor replacement grouping, and atomic write-offs.
  - `finance.ts`: Revenue, COGS, gross margin calculations, daily trend bucketing, and vendor remittance tracking.
  - `codegen.ts`: Standard sequential code formatters (`MED-0001`, `REC-000001`, `CHQ-000001`).
  - `numberToWords.ts`: Indian numbering currency word converter (Crores, Lakhs, Thousands, Hundreds, Units, Paise).
- **Styling**: Tailwind CSS with medical emerald/teal palette, accessible modals, and custom `@media print` rules.
- **Charts & Icons**: Recharts (ComposedChart, Bar, Line) and Lucide Icons.
- **Testing**: Vitest unit test suite covering 100% of pure domain services.

---

## Swapping Client-Side Storage with a Server Database

Persistence is cleanly isolated behind a single store repository module:

```
lib/store/
└── useAppStore.ts    # Single persistence abstraction
```

All UI components and pages interact **only** with `useAppStore()` or pure services in `/lib/services/`. UI components contain zero storage-specific code or raw SQL/IndexedDB calls.

To swap browser local storage for a server database (such as PostgreSQL with Prisma or Supabase):

1. **API Layer**: Create Next.js Route Handlers (`app/api/sales/route.ts`, `app/api/supplies/route.ts`, `app/api/medicines/route.ts`).
2. **Database Schema**: Map the TypeScript interfaces in `lib/types/index.ts` (`Medicine`, `Vendor`, `StockBatch`, `Supply`, `Sale`) directly to your database ORM models.
3. **Repository Swap**: Replace the Zustand `persist` middleware in `lib/store/useAppStore.ts` with API fetch calls (e.g., using TanStack React Query or SWR). Because all mutations call the pure functions in `lib/services/`, the exact same business logic (FEFO allocation, weekly averages, cheque issuance) can execute on the server or client without modifying UI components.

---

## Getting Started Locally

### 1. Prerequisites
- Node.js 18+ or 20+
- npm (or pnpm / yarn)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd se-project
npm install
```

### 3. Run Development Server
Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The app will automatically initialize with realistic seed data.

### 4. Run Automated Unit Tests
Run the Vitest test suite:

```bash
npm test
```

### 5. Production Build
Verify production build and static page generation:

```bash
npm run build
npm run start
```

---

## Deploying to Vercel

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Log in to [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Import the repository.
4. Leave all build settings at their defaults:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Environment Variables**: *None needed!*
5. Click **"Deploy"**. The application will be live immediately.
