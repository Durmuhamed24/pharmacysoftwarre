# Pharmacy Management Software

A complete, functional Pharmacy Management System for pharmacies in Pakistan. Built with React, TypeScript, Vite, Tailwind CSS (frontend) and Node.js, Express, SQLite (backend).

> **Note:** This is a working demo for review. It uses SQLite for zero-config database setup. Before commercial deployment, verify compliance with local pharmacy regulations, recordkeeping requirements, data protection laws, and tax regulations in Pakistan.

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner/Admin | owner@demo.pk | demo123 |
| Pharmacist | pharmacist@demo.pk | demo123 |
| Cashier | cashier@demo.pk | demo123 |

## Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide React, Axios, jsPDF
- **Backend:** Node.js, Express, TypeScript, better-sqlite3 (SQLite), bcryptjs, jsonwebtoken (JWT)
- **Database:** SQLite (zero-config, single file)
- **Charts:** Recharts
- **Currency:** PKR (Rs.)
- **Timezone:** Asia/Karachi

## Project Structure

```
Pharmacy_Software/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── src/
│       ├── server.ts          # Express server + all API routes
│       ├── db.ts              # SQLite connection
│       ├── schema.ts          # Database schema + indexes
│       ├── auth.ts            # Auth helpers (bcrypt, JWT)
│       ├── middleware/auth.ts # Auth & role middleware
│       ├── seed.ts            # Demo data seeder
│       └── auth.test.ts       # Vitest tests
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── context/AuthContext.tsx
│       ├── types/index.ts
│       ├── services/api.ts
│       ├── components/Layout.tsx
│       └── pages/
│           ├── Login.tsx
│           ├── Dashboard.tsx
│           ├── POS.tsx
│           ├── Medicines.tsx
│           ├── Purchases.tsx
│           ├── Orders.tsx
│           ├── Customers.tsx
│           ├── Suppliers.tsx
│           ├── Expenses.tsx
│           ├── Reports.tsx
│           └── Settings.tsx
├── package.json
└── README.md
```

## Features Implemented

### Core Modules
1. **Authentication & RBAC** - Owner, Pharmacist, Cashier roles with JWT sessions
2. **Dashboard** - Live stats from DB: today's sales, bills, purchases, COGS, gross profit, operating expenses, net operating profit, cash/card/bank received, outstanding balances, inventory value, low-stock, near-expiry, expired counts
3. **Medicine Inventory** - Add/view/search medicines, filter by category/stock/expiry, batch tracking, FEFO, low-stock & expiry alerts, stock movement history, stock adjustments with audit
4. **POS / Billing** - Fast cart, search medicine, add items, adjust qty, discount, customer selection, payment methods (cash/card/bank/split/credit), change calculation, invoice generation, print receipt
5. **Sales Returns** - Search original invoice, return items, refund calculation, restock option, financial adjustment, audit trail
6. **Purchase & Supplier Management** - Suppliers, purchase orders, stock receiving (inventory increases only on receive), supplier payments, outstanding balances
7. **Customer Orders** - Create orders, status workflow (pending → confirmed → preparing → ready → out for delivery → completed → cancelled), stock NOT deducted until converted to sale
8. **Customer Management** - Customer records, purchase history, outstanding balance
9. **Expenses** - Categories (rent, salaries, electricity, etc.), amount, date, payment method, included in net operating profit
10. **Financial Reports** - Daily/weekly/monthly/custom date sales, profit (net sales − COGS), inventory valuation, low stock, expiry, export/print
11. **Settings** - Pharmacy name, contact, tax rate, currency, timezone (configurable)
12. **Audit Logs** - User actions tracked (owner only)

### Safety & Compliance
- FEFO (First Expiry, First Out) batch prioritization
- Block sales of expired medicines
- Prevent negative inventory
- Prescription-required indicator
- Atomic sale transactions (invoice + payment + inventory)
- Passwords hashed with bcrypt (never plain text)
- No medical advice/dispensing recommendations

## Installation & Setup

### Prerequisites
- Node.js 18+ (v22 recommended)
- npm

### Quick Start

```bash
# 1. Install all dependencies (root + backend + frontend)
cd /Users/ameer/Clients-Works/Pharmacy_Software
npm run install:all

# 2. Seed the database with demo data
cd backend
npm run seed

# 3. Start both backend and frontend (from root)
cd ..
npm run dev
```

Or start separately:

```bash
# Backend (terminal 1)
cd backend
npm run dev        # http://localhost:4000

# Frontend (terminal 2)
cd frontend
npm run dev        # http://localhost:5173
```

### Backend Only

```bash
cd backend
npm install
npm run seed       # Populate demo data
npm run dev        # Start API server
npm run test       # Run vitest tests
```

### Frontend Only

```bash
cd frontend
npm install
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
```

## Environment Variables (`backend/.env`)

```
NODE_ENV=development
PORT=4000
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=8h
DATABASE_URL=./data/pharmacy.db
CORS_ORIGIN=http://localhost:5173
TAX_RATE=0
CURRENCY=PKR
CURRENCY_SYMBOL=Rs.
TIMEZONE=Asia/Karachi
PHARMACY_NAME=Al-Noor Pharmacy
PHARMACY_ADDRESS=123 Main Market, Faisalabad, Pakistan
PHARMACY_PHONE=+92-300-1234567
PHARMACY_EMAIL=info@alnoorpharmacy.pk
```

## Demo Workflow (Required Test Steps)

1. **Log in** - Use `cashier@demo.pk` / `demo123`
2. **Open Dashboard** - View live stats calculated from DB
3. **Search medicine** - Use POS search bar
4. **Create bill** - Add multiple medicines to cart
5. **Apply discount** - Enter discount amount
6. **Select payment** - Choose Cash/Card/Bank/Credit
7. **Complete sale** - Generates invoice, deducts stock (FEFO)
8. **Print receipt** - Print/preview thermal receipt
9. **Verify stock decrease** - Check Medicine inventory
10. **Open sales report** - Verify transaction appears
11. **Receive purchase** - Create purchase order → receive stock
12. **Confirm inventory increase** - Check medicine stock
13. **Record expense** - Add operating expense
14. **Verify dashboard updates** - Net operating profit changes
15. **Create customer order** - Set status through workflow
16. **Process return** - Search invoice, return items, verify refund + restock
17. **Filter reports by date** - Use date pickers in Reports
18. **Logout & login again** - Verify persistence

## Testing

Backend tests (Vitest):

```bash
cd backend
npm run test
```

Tests cover: password hashing, database schema tables, foreign key enforcement, seed data presence.

Manual business-rule verification (from demo workflow):
- Subtotal/total calculations with discount
- Payment and change calculations
- Insufficient-stock rejection
- Expired-batch rejection
- Correct stock deduction after sale
- Correct stock receiving after purchase
- Return and refund calculations
- COGS and gross profit correctness
- Expense inclusion in net operating profit
- Date filtering
- Role-based access restrictions
- Persistence after restart

## Database Schema

Key tables: `users`, `pharmacy_settings`, `suppliers`, `medicine_categories`, `medicines`, `medicine_batches`, `stock_movements`, `customers`, `sales_invoices`, `sale_items`, `payments`, `sales_returns`, `sales_return_items`, `customer_orders`, `customer_order_items`, `purchase_orders`, `purchase_order_items`, `payments_to_suppliers`, `expenses`, `cash_sessions`, `audit_logs`.

SQLite file: `backend/data/pharmacy.db` (created automatically on seed).

## Known Limitations

- Database is SQLite (single-file); for multi-user production, migrate to PostgreSQL/MySQL
- Receipt printing is browser-based (Ctrl+P / thermal CSS); thermal printer integration requires ESC/POS
- Split payment UI is simplified (single payment recorded)
- Customer order → sale conversion is manual (stock not auto-reserved)
- No email/SMS notifications
- No image uploads for medicine/receipt attachments
- Demo data is clearly fictional; no real patient information

## License

Internal demo project. Not for commercial use without regulatory compliance review.
# pharmacysoftwarre
