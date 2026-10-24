// Database schema initialization
import { db } from './db.js';

export function initSchema() {
  const sql = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner','pharmacist','cashier')),
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pharmacy_settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      pharmacy_name TEXT NOT NULL DEFAULT 'Al-Noor Pharmacy',
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_rate REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'PKR',
      currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
      timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS medicine_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      brand_name TEXT,
      category_id TEXT,
      barcode TEXT,
      sku TEXT UNIQUE,
      manufacturer TEXT,
      strength TEXT,
      dosage_form TEXT,
      pack_size TEXT,
      unit TEXT DEFAULT 'tablet',
      prescription_required INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      min_stock_level REAL NOT NULL DEFAULT 0,
      supplier_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(category_id) REFERENCES medicine_categories(id) ON DELETE SET NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS medicine_batches (
      id TEXT PRIMARY KEY,
      medicine_id TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      manufacturing_date TEXT,
      expiry_date TEXT NOT NULL,
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      current_quantity REAL NOT NULL DEFAULT 0,
      received_date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      is_active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_medicine_batches_medicine ON medicine_batches(medicine_id);
    CREATE INDEX IF NOT EXISTS idx_medicine_batches_expiry ON medicine_batches(expiry_date);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      medicine_batch_id TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('sale','purchase','return','adjustment','restock')),
      quantity REAL NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      reason TEXT,
      performed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(medicine_batch_id) REFERENCES medicine_batches(id) ON DELETE CASCADE,
      FOREIGN KEY(performed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      address TEXT,
      outstanding_balance REAL NOT NULL DEFAULT 0,
      total_purchases REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      cashier_id TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card','bank_transfer','split','credit')),
      amount_received REAL NOT NULL DEFAULT 0,
      change_due REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided','refunded')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY(cashier_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      medicine_batch_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      batch_number TEXT,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(medicine_batch_id) REFERENCES medicine_batches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      received_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      recorded_by TEXT,
      FOREIGN KEY(invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales_returns (
      id TEXT PRIMARY KEY,
      original_invoice_id TEXT NOT NULL,
      return_number TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','pending','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      created_by TEXT,
      approved_by TEXT,
      FOREIGN KEY(original_invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sales_return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      sale_item_id TEXT NOT NULL,
      medicine_batch_id TEXT,
      quantity REAL NOT NULL,
      refund_amount REAL NOT NULL DEFAULT 0,
      restock_inventory INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
      FOREIGN KEY(sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
      FOREIGN KEY(medicine_batch_id) REFERENCES medicine_batches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS customer_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','preparing','ready_for_pickup','out_for_delivery','completed','cancelled')),
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS customer_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY(order_id) REFERENCES customer_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ordered','received','partially_received','cancelled')),
      total_amount REAL NOT NULL DEFAULT 0,
      amount_paid REAL NOT NULL DEFAULT 0,
      received_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      received_by TEXT,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY(received_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      batch_number TEXT,
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      expiry_date TEXT,
      line_total REAL NOT NULL,
      received_quantity REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY(medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments_to_suppliers (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT,
      supplier_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      paid_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      recorded_by TEXT,
      FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      expense_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      description TEXT,
      receipt_path TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(recorded_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS cash_sessions (
      id TEXT PRIMARY KEY,
      cashier_id TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL,
      total_sales_cash REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
      opened_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      closed_at TEXT,
      FOREIGN KEY(cashier_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
    CREATE INDEX IF NOT EXISTS idx_medicines_barcode ON medicines(barcode);
    CREATE INDEX IF NOT EXISTS idx_medicines_sku ON medicines(sku);
    CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_customer_orders_date ON customer_orders(created_at);

    INSERT OR IGNORE INTO pharmacy_settings (id, pharmacy_name, address, phone, email, tax_rate, currency, currency_symbol, timezone)
    VALUES (1, 'Al-Noor Pharmacy', '123 Main Market, Faisalabad, Pakistan', '+92-300-1234567', 'info@alnoorpharmacy.pk', 0, 'PKR', 'Rs.', 'Asia/Karachi');
  `;

  db.exec(sql);
}

export default initSchema;