import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { db, uuid } from './db.js';
import initSchema from './schema.js';
import { hashPassword, comparePassword, generateToken } from './auth.js';
import { findUserByEmail, createUser, getAllUsers, updateUserRole, setUserActive, UserRow } from './auth.js';
import { requireAuth, requireRole, AuthRequest } from './middleware/auth.js';

dotenv.config();
initSchema();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

// ---------- Helpers ----------
function isoNow(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`;
}

function karachiDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

function audit(req: AuthRequest | null, action: string, entityType: string, entityId: string, details: string) {
  const userId = req?.user?.id ?? null;
  db.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?,?)')
    .run(uuid(), userId, action, entityType, entityId, details);
}

function getMedicineBatchStock(batchId: string): number {
  const row = db.prepare('SELECT current_quantity FROM medicine_batches WHERE id = ?').get(batchId) as { current_quantity: number } | undefined;
  return row?.current_quantity ?? 0;
}

function reduceBatchStock(batchId: string, qty: number, reason: string, refType: string, refId: string, performedBy: string | null) {
  db.prepare('UPDATE medicine_batches SET current_quantity = current_quantity - ? WHERE id = ?').run(qty, batchId);
  db.prepare('INSERT INTO stock_movements (id, medicine_batch_id, movement_type, quantity, reference_type, reference_id, reason, performed_by) VALUES (?,?,?,?,?,?,?,?)')
    .run(uuid(), batchId, 'sale', qty, refType, refId, reason, performedBy);
}

function increaseBatchStock(batchId: string, qty: number, reason: string, refType: string, refId: string, performedBy: string | null) {
  db.prepare('UPDATE medicine_batches SET current_quantity = current_quantity + ? WHERE id = ?').run(qty, batchId);
  db.prepare('INSERT INTO stock_movements (id, medicine_batch_id, movement_type, quantity, reference_type, reference_id, reason, performed_by) VALUES (?,?,?,?,?,?,?,?)')
    .run(uuid(), batchId, 'purchase', qty, refType, refId, reason, performedBy);
}

// ---------- Auth ----------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = findUserByEmail(email);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: { id: req.user!.id, name: req.user!.name, email: req.user!.email, role: req.user!.role } });
});

app.get('/api/auth/users', requireAuth, requireRole('owner'), (_req, res) => {
  res.json(getAllUsers());
});

app.post('/api/auth/users', requireAuth, requireRole('owner'), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role: string };
    if (findUserByEmail(email)) return res.status(400).json({ error: 'Email already exists' });
    const id = uuid();
    createUser({ id, name, email, password_hash: await hashPassword(password), role });
    audit(req, 'create_user', 'users', id, `Created user ${name} (${role})`);
    res.status(201).json({ id, name, email, role });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/auth/users/:id', requireAuth, requireRole('owner'), (req: AuthRequest, res) => {
  try {
    const { role, is_active } = req.body as { role?: string; is_active?: boolean };
    if (role) updateUserRole(req.params.id, role);
    if (is_active !== undefined) setUserActive(req.params.id, is_active);
    audit(req, 'update_user', 'users', req.params.id, JSON.stringify({ role, is_active }));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Settings ----------
app.get('/api/settings', (_req, res) => {
  const s = db.prepare('SELECT * FROM pharmacy_settings WHERE id = 1').get() as any;
  res.json(s);
});

app.patch('/api/settings', requireAuth, requireRole('owner'), (req: AuthRequest, res) => {
  try {
    const fields = req.body as Record<string, any>;
    const keys = Object.keys(fields).filter(k => ['pharmacy_name','address','phone','email','tax_rate','currency','currency_symbol','timezone'].includes(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields' });
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    db.prepare(`UPDATE pharmacy_settings SET ${setClause}, updated_at = datetime('now','localtime') WHERE id = 1`).run(...values);
    audit(req, 'update_settings', 'pharmacy_settings', '1', JSON.stringify(fields));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Medicines ----------
app.get('/api/medicines', requireAuth, (req: AuthRequest, res) => {
  try {
    const { search, category, stock, expiry } = req.query as Record<string, string>;
    let sql = `SELECT m.*, c.name AS category_name, s.name AS supplier_name,
      (SELECT b.selling_price FROM medicine_batches b WHERE b.medicine_id = m.id AND b.is_active = 1 ORDER BY b.expiry_date ASC LIMIT 1) AS selling_price,
      (SELECT COALESCE(SUM(b.current_quantity),0) FROM medicine_batches b WHERE b.medicine_id = m.id AND b.is_active = 1) AS total_stock
      FROM medicines m
      LEFT JOIN medicine_categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE 1=1`;
    const params: any[] = [];
    if (search) {
      sql += ` AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.brand_name LIKE ? OR m.barcode LIKE ? OR m.sku LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }
    if (category) { sql += ` AND m.category_id = ?`; params.push(category); }
    if (stock === 'low') {
      sql += ` AND EXISTS (SELECT 1 FROM medicine_batches b WHERE b.medicine_id = m.id AND b.current_quantity <= m.min_stock_level AND b.is_active = 1)`;
    }
    if (expiry === 'soon') {
      const soon = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
      sql += ` AND EXISTS (SELECT 1 FROM medicine_batches b WHERE b.medicine_id = m.id AND b.expiry_date <= ? AND b.is_active = 1 AND b.current_quantity > 0)`;
      params.push(soon);
    }
    sql += ` ORDER BY m.name ASC`;
    const rows = db.prepare(sql).all(params) as any[];
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/medicines/:id', requireAuth, (req, res) => {
  try {
    const m = db.prepare(`SELECT m.*, c.name AS category_name, s.name AS supplier_name FROM medicines m
      LEFT JOIN medicine_categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id WHERE m.id = ?`).get(req.params.id) as any;
    if (!m) return res.status(404).json({ error: 'Medicine not found' });
    const batches = db.prepare('SELECT * FROM medicine_batches WHERE medicine_id = ? ORDER BY expiry_date ASC').all(req.params.id) as any[];
    res.json({ ...m, batches });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/medicines', requireAuth, requireRole('owner','pharmacist'), (req: AuthRequest, res) => {
  try {
    const {
      name, generic_name, brand_name, category_id, barcode, sku, manufacturer,
      strength, dosage_form, pack_size, unit, prescription_required, min_stock_level, supplier_id
    } = req.body as any;
    const id = uuid();
    db.prepare(`INSERT INTO medicines (id,name,generic_name,brand_name,category_id,barcode,sku,manufacturer,strength,dosage_form,pack_size,unit,prescription_required,min_stock_level,supplier_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, name, generic_name, brand_name, category_id, barcode, sku, manufacturer, strength, dosage_form, pack_size, unit, prescription_required ? 1 : 0, min_stock_level || 0, supplier_id);
    audit(req, 'create_medicine', 'medicines', id, name);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/medicines/:id', requireAuth, requireRole('owner','pharmacist'), (req, res) => {
  try {
    const fields = req.body as Record<string, any>;
    const allowed = ['name','generic_name','brand_name','category_id','barcode','sku','manufacturer','strength','dosage_form','pack_size','unit','prescription_required','min_stock_level','supplier_id','is_active'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields' });
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    db.prepare(`UPDATE medicines SET ${setClause}, updated_at = datetime('now','localtime') WHERE id = ?`).run(...values, req.params.id);
    audit(req, 'update_medicine', 'medicines', req.params.id, JSON.stringify(fields));
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/categories', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM medicine_categories ORDER BY name ASC').all());
});

app.post('/api/categories', requireAuth, requireRole('owner','pharmacist'), (req, res) => {
  try {
    const { name, description } = req.body as { name: string; description?: string };
    const id = uuid();
    db.prepare('INSERT INTO medicine_categories (id,name,description) VALUES (?,?,?)').run(id, name, description || '');
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/suppliers', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all());
});

app.post('/api/suppliers', requireAuth, requireRole('owner','pharmacist'), (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body as any;
    const id = uuid();
    db.prepare('INSERT INTO suppliers (id,name,contact_person,phone,email,address) VALUES (?,?,?,?,?,?)')
      .run(id, name, contact_person, phone, email, address);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customers', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM customers ORDER BY name ASC').all());
});

app.post('/api/customers', requireAuth, (req, res) => {
  try {
    const { name, phone, address } = req.body as any;
    const id = uuid();
    db.prepare('INSERT INTO customers (id,name,phone,address) VALUES (?,?,?,?)').run(id, name, phone, address);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- POS / Sales ----------
app.post('/api/sales', requireAuth, (req: AuthRequest, res) => {
  const tx = db.transaction(() => {
    const {
      customer_id, payment_method, items, discount_amount = 0, tax_amount = 0,
      amount_received, change_due = 0
    } = req.body as {
      customer_id?: string; payment_method: string;
      items: Array<{ medicine_batch_id: string; quantity: number; unit_price: number; cost_price: number; line_total: number }>;
      discount_amount?: number; tax_amount?: number; amount_received: number; change_due?: number;
    };

    if (!items || items.length === 0) throw new Error('No items in sale');
    if (!payment_method) throw new Error('Payment method required');

    const subtotal = items.reduce((s, i) => s + i.line_total, 0);
    const total_amount = subtotal - (discount_amount || 0) + (tax_amount || 0);

    // Validate stock & expiry using FEFO
    for (const item of items) {
      const batch = db.prepare('SELECT b.*, m.name AS medicine_name, m.prescription_required FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id WHERE b.id = ?').get(item.medicine_batch_id) as any;
      if (!batch) throw new Error(`Batch not found for item`);
      if (!batch.is_active) throw new Error(`Batch ${batch.batch_number} is inactive`);
      const today = new Date().toISOString().split('T')[0];
      if (new Date(batch.expiry_date) < new Date(today)) throw new Error(`Batch ${batch.batch_number} (${batch.medicine_name}) is expired`);
      if (batch.current_quantity < item.quantity) throw new Error(`Insufficient stock for ${batch.medicine_name} batch ${batch.batch_number}`);
    }

    const invoiceId = uuid();
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-8);
    const now = isoNow();

    db.prepare(`INSERT INTO sales_invoices (id, invoice_number, customer_id, cashier_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, amount_received, change_due, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(invoiceId, invoiceNumber, customer_id || null, req.user!.id, subtotal, discount_amount, tax_amount, total_amount, payment_method, amount_received, change_due, 'completed', now);

    for (const item of items) {
      const batch = db.prepare('SELECT b.*, m.name AS medicine_name FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id WHERE b.id = ?').get(item.medicine_batch_id) as any;
      db.prepare(`INSERT INTO sale_items (id, invoice_id, medicine_batch_id, medicine_name, batch_number, quantity, unit_price, cost_price, line_total)
        VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(uuid(), invoiceId, item.medicine_batch_id, batch.medicine_name, batch.batch_number, item.quantity, item.unit_price, item.cost_price, item.line_total);
      reduceBatchStock(item.medicine_batch_id, item.quantity, 'Sale ' + invoiceNumber, 'sale', invoiceId, req.user!.id);
    }

    if (customer_id) {
      db.prepare('UPDATE customers SET total_purchases = total_purchases + ?, outstanding_balance = outstanding_balance + ? WHERE id = ?')
        .run(total_amount, payment_method === 'credit' ? total_amount : 0, customer_id);
    }

    // Payment record
    db.prepare(`INSERT INTO payments (id, invoice_id, payment_method, amount, received_at, recorded_by)
      VALUES (?,?,?,?,?,?)`)
      .run(uuid(), invoiceId, payment_method, amount_received, now, req.user!.id);

    audit(req, 'create_sale', 'sales_invoices', invoiceId, `Invoice ${invoiceNumber}, total ${total_amount}`);
    return { id: invoiceId, invoice_number: invoiceNumber, total_amount, subtotal, discount_amount, tax_amount };
  });

  try {
    const result = tx();
    res.status(201).json(result);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/sales', requireAuth, (req: AuthRequest, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    let sql = `SELECT si.*, c.name AS customer_name, u.name AS cashier_name FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id WHERE 1=1`;
    const params: any[] = [];
    if (from) { sql += ` AND date(si.created_at) >= date(?)`; params.push(from); }
    if (to) { sql += ` AND date(si.created_at) <= date(?)`; params.push(to); }
    sql += ` ORDER BY si.created_at DESC`;
    res.json(db.prepare(sql).all(params));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sales/:id', requireAuth, (req, res) => {
  try {
    const inv = db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(req.params.id) as any;
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const items = db.prepare('SELECT * FROM sale_items WHERE invoice_id = ?').all(req.params.id);
    const customer = inv.customer_id ? db.prepare('SELECT * FROM customers WHERE id = ?').get(inv.customer_id) : null;
    res.json({ ...inv, items, customer });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Returns ----------
app.post('/api/returns', requireAuth, (req: AuthRequest, res) => {
  const tx = db.transaction(() => {
    const { original_invoice_id, reason, items, refund_amount } = req.body as {
      original_invoice_id: string; reason: string;
      items: Array<{ sale_item_id: string; medicine_batch_id: string; quantity: number; refund_amount: number; restock_inventory: boolean }>;
      refund_amount: number;
    };
    const returnId = uuid();
    const returnNumber = 'RET-' + Date.now().toString().slice(-8);
    const now = isoNow();

    db.prepare(`INSERT INTO sales_returns (id, original_invoice_id, return_number, reason, refund_amount, status, created_at, created_by)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(returnId, original_invoice_id, returnNumber, reason, refund_amount, 'completed', now, req.user!.id);

    for (const it of items) {
      db.prepare(`INSERT INTO sales_return_items (id, return_id, sale_item_id, medicine_batch_id, quantity, refund_amount, restock_inventory)
        VALUES (?,?,?,?,?,?,?)`)
        .run(uuid(), returnId, it.sale_item_id, it.medicine_batch_id, it.quantity, it.refund_amount, it.restock_inventory ? 1 : 0);
      if (it.restock_inventory) {
        increaseBatchStock(it.medicine_batch_id, it.quantity, 'Return ' + returnNumber, 'return', returnId, req.user!.id);
      }
    }

    // Mark invoice partially/refunded
    db.prepare('UPDATE sales_invoices SET status = ? WHERE id = ?').run('refunded', original_invoice_id);

    audit(req, 'create_return', 'sales_returns', returnId, `Return ${returnNumber}, refund ${refund_amount}`);
    return { id: returnId, return_number: returnNumber, refund_amount };
  });
  try {
    res.status(201).json(tx());
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ---------- Customer Orders ----------
app.get('/api/orders', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM customer_orders ORDER BY created_at DESC').all());
});

app.post('/api/orders', requireAuth, (req, res) => {
  try {
    const { order_number, customer_id, customer_name, customer_phone, items, total_amount, notes } = req.body as any;
    const id = uuid();
    const now = isoNow();
    db.prepare(`INSERT INTO customer_orders (id, order_number, customer_id, customer_name, customer_phone, status, total_amount, notes, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, order_number, customer_id || null, customer_name, customer_phone, 'pending', total_amount, notes || '', now, now);
    for (const it of items) {
      db.prepare(`INSERT INTO customer_order_items (id, order_id, medicine_id, medicine_name, quantity, unit_price, line_total)
        VALUES (?,?,?,?,?,?,?)`)
        .run(uuid(), id, it.medicine_id, it.medicine_name, it.quantity, it.unit_price, it.line_total);
    }
    res.status(201).json({ id, order_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/orders/:id', requireAuth, (req, res) => {
  try {
    const { status } = req.body as { status: string };
    db.prepare('UPDATE customer_orders SET status = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(status, req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Purchase Orders ----------
app.get('/api/purchases', requireAuth, (_req, res) => {
  res.json(db.prepare('SELECT po.*, s.name AS supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.created_at DESC').all());
});

app.get('/api/purchases/:id', requireAuth, (req, res) => {
  try {
    const po = db.prepare('SELECT po.*, s.name AS supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?').get(req.params.id) as any;
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(req.params.id);
    res.json({ ...po, items });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases', requireAuth, requireRole('owner','pharmacist'), (req, res) => {
  try {
    const { order_number, supplier_id, items, total_amount } = req.body as any;
    const id = uuid();
    const now = isoNow();
    db.prepare(`INSERT INTO purchase_orders (id, order_number, supplier_id, status, total_amount, amount_paid, created_at)
      VALUES (?,?,?,?,?,?,?)`)
      .run(id, order_number, supplier_id, 'ordered', total_amount, 0, now);
    for (const it of items) {
      db.prepare(`INSERT INTO purchase_order_items (id, purchase_order_id, medicine_id, medicine_name, batch_number, quantity, purchase_price, expiry_date, line_total, received_quantity)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(uuid(), id, it.medicine_id, it.medicine_name, it.batch_number, it.quantity, it.purchase_price, it.expiry_date, it.line_total, 0);
    }
    res.status(201).json({ id, order_number });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases/:id/receive', requireAuth, requireRole('owner','pharmacist'), (req: AuthRequest, res) => {
  const tx = db.transaction(() => {
    const { received_items } = req.body as { received_items: Array<{ purchase_order_item_id: string; quantity: number; medicine_id: string; batch_number: string; expiry_date: string; purchase_price: number; selling_price: number }> };
    const poId = req.params.id;
    const now = isoNow();
    for (const it of received_items) {
      // Find or create medicine batch
      let batch = db.prepare('SELECT * FROM medicine_batches WHERE medicine_id = ? AND batch_number = ?').get(it.medicine_id, it.batch_number) as any;
      if (!batch) {
        const bid = uuid();
        db.prepare(`INSERT INTO medicine_batches (id, medicine_id, batch_number, expiry_date, purchase_price, selling_price, current_quantity, received_date)
          VALUES (?,?,?,?,?,?,?,?)`)
          .run(bid, it.medicine_id, it.batch_number, it.expiry_date, it.purchase_price, it.selling_price, 0, now);
        increaseBatchStock(bid, it.quantity, 'Purchase receive ' + poId, 'purchase', poId, req.user!.id);
        batch = { id: bid };
      } else {
        increaseBatchStock(batch.id, it.quantity, 'Purchase receive ' + poId, 'purchase', poId, req.user!.id);
      }
      db.prepare('UPDATE purchase_order_items SET received_quantity = received_quantity + ? WHERE id = ?').run(it.quantity, it.purchase_order_item_id);
    }
    db.prepare('UPDATE purchase_orders SET status = \'received\', received_at = datetime(\'now\',\'localtime\') WHERE id = ?').run(poId);
    audit(req, 'receive_purchase', 'purchase_orders', poId, 'Stock received');
    return { ok: true };
  });
  try { res.json(tx()); } catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ---------- Expenses ----------
app.get('/api/expenses', requireAuth, (_req, res) => {
  const { from, to } = _req.query as Record<string, string>;
  let sql = `SELECT e.*, u.name AS recorded_by_name FROM expenses e LEFT JOIN users u ON e.recorded_by = u.id WHERE 1=1`;
  const params: any[] = [];
  if (from) { sql += ` AND date(e.expense_date) >= date(?)`; params.push(from); }
  if (to) { sql += ` AND date(e.expense_date) <= date(?)`; params.push(to); }
  sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;
  res.json(db.prepare(sql).all(params));
});

app.post('/api/expenses', requireAuth, (req: AuthRequest, res) => {
  try {
    const { title, category, amount, expense_date, payment_method, description } = req.body as any;
    const id = uuid();
    db.prepare(`INSERT INTO expenses (id,title,category,amount,expense_date,payment_method,description,recorded_by)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, title, category, amount, expense_date, payment_method, description || '', req.user!.id);
    audit(req, 'create_expense', 'expenses', id, title);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Supplier Payments ----------
app.post('/api/supplier-payments', requireAuth, requireRole('owner','pharmacist'), (req: AuthRequest, res) => {
  try {
    const { purchase_order_id, supplier_id, amount, payment_method } = req.body as any;
    const id = uuid();
    const now = isoNow();
    db.prepare(`INSERT INTO payments_to_suppliers (id,purchase_order_id,supplier_id,amount,payment_method,paid_at,recorded_by)
      VALUES (?,?,?,?,?,?,?)`)
      .run(id, purchase_order_id || null, supplier_id, amount, payment_method, now, req.user!.id);
    if (purchase_order_id) {
      db.prepare('UPDATE purchase_orders SET amount_paid = amount_paid + ? WHERE id = ?').run(amount, purchase_order_id);
    }
    db.prepare('UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE id = ?').run(amount, supplier_id);
    res.status(201).json({ id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------- Stock Movements ----------
app.get('/api/stock-movements', requireAuth, (_req, res) => {
  const { from, to, medicine_id } = _req.query as Record<string, string>;
  let sql = `SELECT sm.*, m.name AS medicine_name, b.batch_number FROM stock_movements sm
    JOIN medicine_batches b ON sm.medicine_batch_id = b.id
    JOIN medicines m ON b.medicine_id = m.id WHERE 1=1`;
  const params: any[] = [];
  if (from) { sql += ` AND date(sm.created_at) >= date(?)`; params.push(from); }
  if (to) { sql += ` AND date(sm.created_at) <= date(?)`; params.push(to); }
  if (medicine_id) { sql += ` AND b.medicine_id = ?`; params.push(medicine_id); }
  sql += ` ORDER BY sm.created_at DESC`;
  res.json(db.prepare(sql).all(params));
});

// ---------- Audit Logs ----------
app.get('/api/audit-logs', requireAuth, requireRole('owner'), (_req, res) => {
  res.json(db.prepare('SELECT al.*, u.name AS user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT 200').all());
});

// ---------- Reports / Dashboard ----------
app.get('/api/reports/dashboard', requireAuth, (_req, res) => {
  const today = karachiDate();

  const todaySales = db.prepare(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS count FROM sales_invoices WHERE date(created_at) = ? AND status='completed'`).get(today) as { total: number; count: number };
  const totalPurchases = db.prepare(`SELECT COALESCE(SUM(total_amount),0) AS total FROM purchase_orders WHERE status='received' AND date(received_at) = ?`).get(today) as { total: number };
  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date(expense_date) = ?`).get(today) as { total: number };

  const cogs = db.prepare(`SELECT COALESCE(SUM(si.cost_price * si.quantity),0) AS total FROM sale_items si JOIN sales_invoices sii ON si.invoice_id = sii.id WHERE sii.status='completed' AND date(sii.created_at) = ?`).get(today) as { total: number };

  const grossProfit = todaySales.total - cogs.total;
  const netOpProfit = grossProfit - totalExpenses.total;

  const cashReceived = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_method='cash' AND date(received_at) = ?`).get(today) as { total: number };
  const cardReceived = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_method='card' AND date(received_at) = ?`).get(today) as { total: number };
  const bankReceived = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE payment_method='bank_transfer' AND date(received_at) = ?`).get(today) as { total: number };

  const outstandingCustomers = db.prepare(`SELECT COALESCE(SUM(outstanding_balance),0) AS total FROM customers`).get() as { total: number };
  const outstandingSuppliers = db.prepare(`SELECT COALESCE(SUM(outstanding_balance),0) AS total FROM suppliers`).get() as { total: number };

  const inventoryValue = db.prepare(`SELECT COALESCE(SUM(b.current_quantity * b.purchase_price),0) AS total FROM medicine_batches b WHERE b.is_active=1`).get() as { total: number };
  const lowStock = db.prepare(`SELECT COUNT(DISTINCT m.id) AS cnt FROM medicines m WHERE m.is_active=1 AND EXISTS (SELECT 1 FROM medicine_batches b WHERE b.medicine_id=m.id AND b.current_quantity <= m.min_stock_level AND b.is_active=1 AND b.current_quantity>0)`).get() as { cnt: number };

  const soon = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
  const nearExpiry = db.prepare(`SELECT COALESCE(SUM(b.current_quantity * b.purchase_price),0) AS total FROM medicine_batches b WHERE b.is_active=1 AND b.current_quantity>0 AND b.expiry_date <= ? AND b.expiry_date >= date('now')`).get(soon) as { total: number };
  const expired = db.prepare(`SELECT COALESCE(SUM(b.current_quantity * b.purchase_price),0) AS total FROM medicine_batches b WHERE b.is_active=1 AND b.current_quantity>0 AND b.expiry_date < date('now')`).get() as { total: number };

  res.json({
    today_sales: todaySales.total,
    today_bills: todaySales.count,
    total_purchases: totalPurchases.total,
    cogs: cogs.total,
    gross_profit: grossProfit,
    operating_expenses: totalExpenses.total,
    net_operating_profit: netOpProfit,
    cash_received: cashReceived.total,
    card_received: cardReceived.total,
    bank_received: bankReceived.total,
    outstanding_customers: outstandingCustomers.total,
    outstanding_suppliers: outstandingSuppliers.total,
    inventory_value: inventoryValue.total,
    low_stock_count: lowStock.cnt,
    near_expiry_value: nearExpiry.total,
    expired_value: expired.total,
  });
});

app.get('/api/reports/sales', requireAuth, (_req, res) => {
  const { from, to } = _req.query as Record<string, string>;
  let sql = `SELECT date(created_at) AS date, COUNT(*) AS invoices, COALESCE(SUM(total_amount),0) AS sales,
    COALESCE(SUM(discount_amount),0) AS discounts, COALESCE(SUM(tax_amount),0) AS tax
    FROM sales_invoices WHERE status='completed'`;
  const params: any[] = [];
  if (from) { sql += ` AND date(created_at) >= date(?)`; params.push(from); }
  if (to) { sql += ` AND date(created_at) <= date(?)`; params.push(to); }
  sql += ` GROUP BY date(created_at) ORDER BY date ASC`;
  res.json(db.prepare(sql).all(params));
});

app.get('/api/reports/profit', requireAuth, (_req, res) => {
  const { from, to } = _req.query as Record<string, string>;
  let sql = `SELECT date(si.created_at) AS date,
    COALESCE(SUM(si.total_amount),0) AS net_sales,
    COALESCE(SUM(si.discount_amount),0) AS discounts,
    COALESCE(SUM(sii.cost_price * sii.quantity),0) AS cogs
    FROM sales_invoices si JOIN sale_items sii ON si.id = sii.invoice_id
    WHERE si.status='completed'`;
  const params: any[] = [];
  if (from) { sql += ` AND date(si.created_at) >= date(?)`; params.push(from); }
  if (to) { sql += ` AND date(si.created_at) <= date(?)`; params.push(to); }
  sql += ` GROUP BY date(si.created_at) ORDER BY date ASC`;
  const rows = db.prepare(sql).all(params) as any[];
  const result = rows.map((r: any) => ({ ...r, gross_profit: r.net_sales - r.cogs }));
  res.json(result);
});

app.get('/api/reports/inventory-value', requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT m.id, m.name, m.sku, SUM(b.current_quantity) AS qty,
    SUM(b.current_quantity * b.purchase_price) AS cost_value,
    SUM(b.current_quantity * b.selling_price) AS retail_value
    FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id
    WHERE b.is_active=1 AND m.is_active=1 GROUP BY m.id ORDER BY m.name`).all();
  res.json(rows);
});

app.get('/api/reports/low-stock', requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT m.id, m.name, m.sku, m.min_stock_level, SUM(b.current_quantity) AS qty
    FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id
    WHERE b.is_active=1 AND m.is_active=1 AND b.current_quantity <= m.min_stock_level AND b.current_quantity > 0
    GROUP BY m.id ORDER BY m.name`).all();
  res.json(rows);
});

app.get('/api/reports/expiry', requireAuth, (_req, res) => {
  const soon = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0];
  const rows = db.prepare(`SELECT m.id, m.name, m.sku, b.batch_number, b.expiry_date, b.current_quantity, b.purchase_price,
    (b.current_quantity * b.purchase_price) AS value
    FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id
    WHERE b.is_active=1 AND m.is_active=1 AND b.current_quantity>0 AND b.expiry_date <= ? AND b.expiry_date >= date('now')
    ORDER BY b.expiry_date ASC`).all(soon);
  res.json(rows);
});

app.get('/api/reports/expired', requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT m.id, m.name, m.sku, b.batch_number, b.expiry_date, b.current_quantity, b.purchase_price,
    (b.current_quantity * b.purchase_price) AS value
    FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id
    WHERE b.is_active=1 AND m.is_active=1 AND b.current_quantity>0 AND b.expiry_date < date('now')
    ORDER BY b.expiry_date ASC`).all();
  res.json(rows);
});

app.get('/api/reports/recent-activity', requireAuth, (_req, res) => {
  const sales = db.prepare(`SELECT 'sale' AS type, invoice_number AS ref, total_amount AS amount, created_at FROM sales_invoices WHERE status='completed' ORDER BY created_at DESC LIMIT 5`).all();
  const purchases = db.prepare(`SELECT 'purchase' AS type, order_number AS ref, total_amount AS amount, created_at FROM purchase_orders WHERE status='received' ORDER BY created_at DESC LIMIT 5`).all();
  const expenses = db.prepare(`SELECT 'expense' AS type, title AS ref, amount, expense_date AS created_at FROM expenses ORDER BY expense_date DESC LIMIT 5`).all();
  res.json([...sales, ...purchases, ...expenses].sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)).slice(0, 10));
});

// ---------- Stock Adjustment ----------
app.post('/api/stock-adjustment', requireAuth, requireRole('owner','pharmacist'), (req: AuthRequest, res) => {
  const tx = db.transaction(() => {
    const { medicine_batch_id, quantity, reason } = req.body as { medicine_batch_id: string; quantity: number; reason: string };
    const batch = db.prepare('SELECT * FROM medicine_batches WHERE id = ?').get(medicine_batch_id) as any;
    if (!batch) throw new Error('Batch not found');
    const newQty = batch.current_quantity + quantity;
    if (newQty < 0) throw new Error('Adjustment would result in negative inventory');
    db.prepare('UPDATE medicine_batches SET current_quantity = ? WHERE id = ?').run(newQty, medicine_batch_id);
    db.prepare(`INSERT INTO stock_movements (id, medicine_batch_id, movement_type, quantity, reference_type, reference_id, reason, performed_by)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), medicine_batch_id, 'adjustment', quantity, 'adjustment', null, reason, req.user!.id);
    audit(req, 'stock_adjustment', 'medicine_batches', medicine_batch_id, `Adjusted by ${quantity}, reason: ${reason}`);
    return { ok: true, new_quantity: newQty };
  });
  try { res.json(tx()); } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Pharmacy backend running on http://localhost:${PORT}`);
});

export default app;