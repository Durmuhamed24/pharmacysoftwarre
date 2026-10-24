import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db.js';
import initSchema from './schema.js';
import { hashPassword, comparePassword } from './auth.js';

beforeEach(() => {
  // Reinitialize schema for clean state
  initSchema();
});

describe('Password hashing', () => {
  it('hashes and verifies passwords correctly', async () => {
    const hash = await hashPassword('demo123');
    expect(await comparePassword('demo123', hash)).toBe(true);
    expect(await comparePassword('wrong', hash)).toBe(false);
  });
});

describe('Database schema', () => {
  it('creates all required tables', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map(t => t.name);
    const required = ['users', 'medicines', 'medicine_batches', 'sales_invoices', 'sale_items', 'stock_movements', 'customers', 'suppliers', 'expenses', 'sales_returns', 'customer_orders', 'purchase_orders', 'audit_logs', 'pharmacy_settings'];
    for (const r of required) {
      expect(names).toContain(r);
    }
  });
});

describe('Foreign keys', () => {
  it('enforces foreign key constraints', () => {
    const result = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(result.foreign_keys).toBe(1);
  });
});

describe('Seed data', () => {
  it('can count medicines', () => {
    const count = db.prepare('SELECT COUNT(*) AS c FROM medicines').get() as { c: number };
    expect(count.c).toBeGreaterThan(0);
  });
});