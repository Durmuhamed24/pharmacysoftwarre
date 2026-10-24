import { db } from './db.js';
import { initSchema } from './schema.js';
import { hashPassword } from './auth.js';
import { randomUUID } from 'crypto';

const PASSWORD_DEMO = 'demo123';

async function main() {
  initSchema();
  const insert = (sql: string, params: any[] = []) => db.prepare(sql).run(...params);
  const now = new Date().toISOString();

  // Settings
  insert(`INSERT OR IGNORE INTO pharmacy_settings (id, pharmacy_name, address, phone, email, tax_rate, currency, currency_symbol, timezone)
    VALUES (1, 'Al-Noor Pharmacy', '123 Main Market, Faisalabad, Pakistan', '+92-300-1234567', 'info@alnoorpharmacy.pk', 0, 'PKR', 'Rs.', 'Asia/Karachi')`);

  // Users
  const ownerId = randomUUID();
  const pharmId = randomUUID();
  const cashierId = randomUUID();

  insert(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)`,
    [ownerId, 'Ahmed Owner', 'owner@demo.pk', await hashPassword(PASSWORD_DEMO), 'owner']);
  insert(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)`,
    [pharmId, 'Sara Pharmacist', 'pharmacist@demo.pk', await hashPassword(PASSWORD_DEMO), 'pharmacist']);
  insert(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?,?,?,?,?)`,
    [cashierId, 'Ali Cashier', 'cashier@demo.pk', await hashPassword(PASSWORD_DEMO), 'cashier']);

  // Categories
  const catIds: Record<string, string> = {};
  for (const name of ['Antibiotic', 'Pain Relief', 'Fever & Cold', 'Vitamins', 'Cardiac', 'Diabetes', 'Skin Care', 'Digestive']) {
    const id = randomUUID();
    catIds[name] = id;
    insert(`INSERT OR IGNORE INTO medicine_categories (id, name, description) VALUES (?,?,?)`, [id, name, '']);
  }

  // Suppliers
  const supIds: Record<string, string> = {};
  for (const row of [
    ['Sami Pharmaceuticals', 'Mr. Sami', '+92-42-1111111', 'sami@samipharma.pk', 'Lahore, Pakistan'],
    ['Getz Pharma', 'Ms. Ayesha', '+92-21-2222222', 'sales@getzpharma.com', 'Karachi, Pakistan'],
    ['Highnoon Laboratories', 'Mr. Farooq', '+92-42-3333333', 'info@highnoon.com', 'Lahore, Pakistan'],
    ['Abbott Laboratories', 'Mr. Usman', '+92-21-4444444', 'pakistan@abbott.com', 'Karachi, Pakistan'],
    ['GSK Pakistan', 'Ms. Hina', '+92-42-5555555', 'contact@gsk.com.pk', 'Lahore, Pakistan'],
    ['Pfizer Pakistan', 'Mr. Kamran', '+92-21-6666666', 'pk@pfizer.com', 'Karachi, Pakistan'],
    ['Merck Pakistan', 'Ms. Sana', '+92-42-7777777', 'pk@merck.com', 'Lahore, Pakistan'],
    ['Sanofi Pakistan', 'Mr. Adeel', '+92-21-8888888', 'pk@sanofi.com', 'Karachi, Pakistan'],
    ['Bayer Pakistan', 'Ms. Nadia', '+92-21-9999999', 'pk@bayer.com', 'Karachi, Pakistan'],
    ['Janssen Pakistan', 'Mr. Tariq', '+92-42-1010101', 'pk@janssen.com', 'Lahore, Pakistan'],
    ['J&J Pakistan', 'Ms. Rabia', '+92-21-1212121', 'pk@jnj.com', 'Karachi, Pakistan'],
    ['Novartis Pakistan', 'Mr. Hamza', '+92-42-1313131', 'pk@novartis.com', 'Lahore, Pakistan'],
    ['Test Co', 'Mr. Test', '+92-300-0000000', 'test@demo.pk', 'Faisalabad, Pakistan'],
  ] as const) {
    const [name, contact, phone, email, address] = row;
    const id = randomUUID();
    supIds[name] = id;
    insert(`INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, email, address) VALUES (?,?,?,?,?,?)`,
      [id, name, contact, phone, email, address]);
  }

  // Medicines (20+)
  const meds: Array<{
    name: string; generic: string; brand: string; cat: string; barcode: string; sku: string;
    manuf: string; strength: string; form: string; pack: string; unit: string; rx: number;
    min: number; sup: string; batches: Array<{batch: string; expiry: string; pp: number; sp: number; qty: number}>;
  }> = [
    { name: 'Paracetamol 500mg Tablet', generic: 'Paracetamol', brand: 'Panadol', cat: 'Pain Relief', barcode: '8901234567890', sku: 'MED-001', manuf: 'Getz Pharma', strength: '500mg', form: 'Tablet', pack: '20 tablets', unit: 'tablet', rx: 0, min: 50, sup: 'Getz Pharma', batches: [{ batch: 'PCT-2025-001', expiry: '2026-12-31', pp: 12, sp: 25, qty: 200 }] },
    { name: 'Amoxicillin 500mg Capsule', generic: 'Amoxicillin', brand: 'Amoxil', cat: 'Antibiotic', barcode: '8901234567891', sku: 'MED-002', manuf: 'Sami Pharma', strength: '500mg', form: 'Capsule', pack: '10 capsules', unit: 'capsule', rx: 1, min: 30, sup: 'Sami Pharmaceuticals', batches: [{ batch: 'AMX-2025-010', expiry: '2027-06-30', pp: 45, sp: 90, qty: 100 }] },
    { name: 'Cetirizine 10mg Tablet', generic: 'Cetirizine', brand: 'Zyrtec', cat: 'Fever & Cold', barcode: '8901234567892', sku: 'MED-003', manuf: 'Highnoon', strength: '10mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 0, min: 40, sup: 'Highnoon Laboratories', batches: [{ batch: 'CTZ-2025-005', expiry: '2027-03-31', pp: 18, sp: 35, qty: 150 }] },
    { name: 'Omeprazole 20mg Capsule', generic: 'Omeprazole', brand: 'Losec', cat: 'Digestive', barcode: '8901234567893', sku: 'MED-004', manuf: 'Abbott', strength: '20mg', form: 'Capsule', pack: '14 capsules', unit: 'capsule', rx: 1, min: 25, sup: 'Abbott Laboratories', batches: [{ batch: 'OME-2025-020', expiry: '2026-10-15', pp: 30, sp: 60, qty: 80 }] },
    { name: 'Vitamin C 500mg Tablet', generic: 'Ascorbic Acid', brand: 'Limcee', cat: 'Vitamins', barcode: '8901234567894', sku: 'MED-005', manuf: 'GSK', strength: '500mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 0, min: 60, sup: 'GSK Pakistan', batches: [{ batch: 'VTC-2025-030', expiry: '2028-01-31', pp: 20, sp: 45, qty: 300 }] },
    { name: 'Amlodipine 5mg Tablet', generic: 'Amlodipine', brand: 'Norvasc', cat: 'Cardiac', barcode: '8901234567895', sku: 'MED-006', manuf: 'Pfizer', strength: '5mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 1, min: 40, sup: 'Pfizer Pakistan', batches: [{ batch: 'AML-2025-040', expiry: '2027-08-31', pp: 25, sp: 55, qty: 120 }] },
    { name: 'Metformin 500mg Tablet', generic: 'Metformin', brand: 'Glucophage', cat: 'Diabetes', barcode: '8901234567896', sku: 'MED-007', manuf: 'Merck', strength: '500mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 1, min: 50, sup: 'Merck Pakistan', batches: [{ batch: 'MTF-2025-050', expiry: '2027-11-30', pp: 15, sp: 30, qty: 250 }] },
    { name: 'Ibuprofen 400mg Tablet', generic: 'Ibuprofen', brand: 'Brufen', cat: 'Pain Relief', barcode: '8901234567897', sku: 'MED-008', manuf: 'Abbott', strength: '400mg', form: 'Tablet', pack: '20 tablets', unit: 'tablet', rx: 0, min: 30, sup: 'Abbott Laboratories', batches: [{ batch: 'IBU-2025-060', expiry: '2027-05-31', pp: 22, sp: 40, qty: 180 }] },
    { name: 'Salbutamol Inhaler 100mcg', generic: 'Salbutamol', brand: 'Ventolin', cat: 'Fever & Cold', barcode: '8901234567898', sku: 'MED-009', manuf: 'GSK', strength: '100mcg', form: 'Inhaler', pack: '1 inhaler', unit: 'piece', rx: 1, min: 20, sup: 'GSK Pakistan', batches: [{ batch: 'SAL-2025-070', expiry: '2026-09-30', pp: 150, sp: 280, qty: 60 }] },
    { name: 'Azithromycin 500mg Tablet', generic: 'Azithromycin', brand: 'Zithromax', cat: 'Antibiotic', barcode: '8901234567899', sku: 'MED-010', manuf: 'Pfizer', strength: '500mg', form: 'Tablet', pack: '3 tablets', unit: 'tablet', rx: 1, min: 20, sup: 'Pfizer Pakistan', batches: [{ batch: 'AZT-2025-080', expiry: '2027-02-28', pp: 60, sp: 120, qty: 90 }] },
    { name: 'Loratadine 10mg Tablet', generic: 'Loratadine', brand: 'Claritin', cat: 'Fever & Cold', barcode: '8901234567900', sku: 'MED-011', manuf: 'Merck', strength: '10mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 0, min: 40, sup: 'Merck Pakistan', batches: [{ batch: 'LOR-2025-090', expiry: '2027-12-31', pp: 28, sp: 50, qty: 130 }] },
    { name: 'Ranitidine 150mg Tablet', generic: 'Ranitidine', brand: 'Zantac', cat: 'Digestive', barcode: '8901234567901', sku: 'MED-012', manuf: 'GSK', strength: '150mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 1, min: 30, sup: 'GSK Pakistan', batches: [{ batch: 'RNT-2025-100', expiry: '2026-08-31', pp: 20, sp: 40, qty: 110 }] },
    { name: 'Atorvastatin 20mg Tablet', generic: 'Atorvastatin', brand: 'Lipitor', cat: 'Cardiac', barcode: '8901234567902', sku: 'MED-013', manuf: 'Pfizer', strength: '20mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 1, min: 35, sup: 'Pfizer Pakistan', batches: [{ batch: 'ATV-2025-110', expiry: '2028-04-30', pp: 40, sp: 85, qty: 160 }] },
    { name: 'Insulin Glargine 100iu/ml', generic: 'Insulin Glargine', brand: 'Lantus', cat: 'Diabetes', barcode: '8901234567903', sku: 'MED-014', manuf: 'Sanofi', strength: '100iu/ml', form: 'Injection', pack: '1 pen', unit: 'piece', rx: 1, min: 15, sup: 'Sanofi Pakistan', batches: [{ batch: 'ING-2025-120', expiry: '2026-11-30', pp: 1200, sp: 1800, qty: 40 }] },
    { name: 'Clotrimazole Cream 1%', generic: 'Clotrimazole', brand: 'Canesten', cat: 'Skin Care', barcode: '8901234567904', sku: 'MED-015', manuf: 'Bayer', strength: '1%', form: 'Cream', pack: '20g tube', unit: 'tube', rx: 0, min: 25, sup: 'Bayer Pakistan', batches: [{ batch: 'CLT-2025-130', expiry: '2027-07-31', pp: 85, sp: 150, qty: 70 }] },
    { name: 'Domperidone 10mg Tablet', generic: 'Domperidone', brand: 'Motilium', cat: 'Digestive', barcode: '8901234567905', sku: 'MED-016', manuf: 'Janssen', strength: '10mg', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 1, min: 30, sup: 'Janssen Pakistan', batches: [{ batch: 'DOM-2025-140', expiry: '2027-09-30', pp: 25, sp: 45, qty: 140 }] },
    { name: 'Cough Syrup 100ml', generic: 'Dextromethorphan', brand: 'Benadryl', cat: 'Fever & Cold', barcode: '8901234567906', sku: 'MED-017', manuf: 'Johnson & Johnson', strength: '15mg/5ml', form: 'Syrup', pack: '100ml bottle', unit: 'bottle', rx: 0, min: 40, sup: 'J&J Pakistan', batches: [{ batch: 'CSY-2025-150', expiry: '2026-05-31', pp: 110, sp: 190, qty: 90 }] },
    { name: 'Diclofenac 50mg Tablet', generic: 'Diclofenac', brand: 'Voltaren', cat: 'Pain Relief', barcode: '8901234567907', sku: 'MED-018', manuf: 'Novartis', strength: '50mg', form: 'Tablet', pack: '20 tablets', unit: 'tablet', rx: 1, min: 30, sup: 'Novartis Pakistan', batches: [{ batch: 'DCL-2025-160', expiry: '2027-01-31', pp: 30, sp: 55, qty: 100 }] },
    { name: 'Multivitamin Tablet', generic: 'Multivitamin', brand: 'Supradyn', cat: 'Vitamins', barcode: '8901234567908', sku: 'MED-019', manuf: 'Bayer', strength: '1 tablet', form: 'Tablet', pack: '30 tablets', unit: 'tablet', rx: 0, min: 50, sup: 'Bayer Pakistan', batches: [{ batch: 'MVT-2025-170', expiry: '2028-02-28', pp: 35, sp: 70, qty: 220 }] },
    { name: 'Low Stock Medicine', generic: 'Test Generic', brand: 'Test Brand', cat: 'Vitamins', barcode: '8901234567909', sku: 'MED-LOW', manuf: 'Test Co', strength: '10mg', form: 'Tablet', pack: '10 tablets', unit: 'tablet', rx: 0, min: 100, sup: 'Test Co', batches: [{ batch: 'LS-2025-001', expiry: '2027-12-31', pp: 10, sp: 20, qty: 5 }] },
    { name: 'Near Expiry Medicine', generic: 'Near Generic', brand: 'Near Brand', cat: 'Pain Relief', barcode: '8901234567910', sku: 'MED-NEAR', manuf: 'Test Co', strength: '500mg', form: 'Tablet', pack: '20 tablets', unit: 'tablet', rx: 0, min: 10, sup: 'Test Co', batches: [{ batch: 'NE-2025-002', expiry: '2026-10-30', pp: 15, sp: 30, qty: 25 }] },
  ];

  // Insert medicines & batches
  for (const m of meds) {
    const mid = randomUUID();
    insert(`INSERT OR IGNORE INTO medicines (id, name, generic_name, brand_name, category_id, barcode, sku, manufacturer, strength, dosage_form, pack_size, unit, prescription_required, min_stock_level, supplier_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [mid, m.name, m.generic, m.brand, catIds[m.cat], m.barcode, m.sku, m.manuf, m.strength, m.form, m.pack, m.unit, m.rx, m.min, supIds[m.sup]]);

    for (const b of m.batches) {
      const bid = randomUUID();
      insert(`INSERT OR IGNORE INTO medicine_batches (id, medicine_id, batch_number, expiry_date, purchase_price, selling_price, current_quantity, received_date)
        VALUES (?,?,?,?,?,?,?,?)`,
        [bid, mid, b.batch, b.expiry, b.pp, b.sp, b.qty, now]);
    }
  }

  // Customers
  const custs: Array<{name: string; phone: string; address: string}> = [
    { name: 'Mr. Muhammad Ali', phone: '+92-300-1111111', address: 'House 5, Street 2, Faisalabad' },
    { name: 'Ms. Fatima Khan', phone: '+92-301-2222222', address: 'Flat B, Gulberg, Lahore' },
    { name: 'Mr. Imran Ahmed', phone: '+92-302-3333333', address: 'House 12, Clifton, Karachi' },
    { name: 'Ms. Ayesha Siddiqui', phone: '+92-303-4444444', address: 'House 7, Defence, Lahore' },
    { name: 'Mr. Bilal Hassan', phone: '+92-304-5555555', address: 'House 3, Saddar, Faisalabad' },
    { name: 'Ms. Zara Malik', phone: '+92-305-6666666', address: 'Flat 12, Bahria Town, Karachi' },
    { name: 'Mr. Omar Farooq', phone: '+92-306-7777777', address: 'House 21, Model Town, Lahore' },
    { name: 'Ms. Hina Shahid', phone: '+92-307-8888888', address: 'House 8, Gulshan, Faisalabad' },
    { name: 'Mr. Yasir Ali', phone: '+92-308-9999999', address: 'House 15, DHA, Karachi' },
    { name: 'Ms. Nosheen Iqbal', phone: '+92-309-0000000', address: 'Flat 5, PECHS, Karachi' },
  ];
  for (const c of custs) {
    insert(`INSERT OR IGNORE INTO customers (id, name, phone, address) VALUES (?,?,?,?)`, [randomUUID(), c.name, c.phone, c.address]);
  }

  console.log('Database seeded successfully.');
  console.log(`Demo credentials:\n  owner@demo.pk / ${PASSWORD_DEMO}\n  pharmacist@demo.pk / ${PASSWORD_DEMO}\n  cashier@demo.pk / ${PASSWORD_DEMO}`);
}

main().catch((e) => { console.error(e); process.exit(1); });