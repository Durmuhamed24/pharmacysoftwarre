import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { purchasesApi, suppliersApi, medicinesApi } from '@/services/api';

export default function Purchases() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [medicineId, setMedicineId] = useState('');
  const [qty, setQty] = useState('10');
  const [price, setPrice] = useState('20');
  const [sellPrice, setSellPrice] = useState('40');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiry, setExpiry] = useState('2027-12-31');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, s, m] = await Promise.all([
        purchasesApi.list(),
        suppliersApi.list(),
        medicinesApi.list(),
      ]);
      setPurchases(p.data);
      setSuppliers(s.data);
      setMedicines(m.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const med = medicines.find((x) => x.id === medicineId);
    if (!supplierId || !med) {
      setError('Select supplier and medicine');
      return;
    }
    const quantity = Number(qty);
    const purchase_price = Number(price);
    const selling_price = Number(sellPrice);
    if (quantity <= 0 || purchase_price < 0) {
      setError('Enter a valid quantity and price');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const batch = batchNumber || `BAT-${Date.now().toString().slice(-6)}`;
      const created = await purchasesApi.create({
        order_number: 'PO-' + Date.now().toString().slice(-8),
        supplier_id: supplierId,
        total_amount: quantity * purchase_price,
        items: [{
          medicine_id: med.id,
          medicine_name: med.name,
          batch_number: batch,
          quantity,
          purchase_price,
          expiry_date: expiry,
          line_total: quantity * purchase_price,
        }],
      });
      const detail = await purchasesApi.get(created.data.id);
      await purchasesApi.receive(created.data.id, {
        received_items: (detail.data.items || []).map((item: any) => ({
          purchase_order_item_id: item.id,
          quantity: Number(item.quantity),
          medicine_id: item.medicine_id,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          purchase_price: item.purchase_price,
          selling_price,
        })),
      });
      setShowForm(false);
      setMedicineId('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create/receive purchase');
    } finally {
      setSaving(false);
    }
  }

  async function receiveExisting(po: any) {
    try {
      const detail = await purchasesApi.get(po.id);
      const pending = (detail.data.items || []).filter((it: any) => Number(it.received_quantity) < Number(it.quantity));
      if (pending.length === 0) return;
      await purchasesApi.receive(po.id, {
        received_items: pending.map((it: any) => ({
          purchase_order_item_id: it.id,
          quantity: Number(it.quantity) - Number(it.received_quantity),
          medicine_id: it.medicine_id,
          batch_number: it.batch_number,
          expiry_date: it.expiry_date,
          purchase_price: it.purchase_price,
          selling_price: Number(it.purchase_price) * 1.5,
        })),
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Receive failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Management</h1>
          <p className="text-gray-500">Manage suppliers and stock receiving</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> New Purchase Order
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Create & receive stock</h3>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 md:grid-cols-2">
            <select className="input-field" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="input-field" value={medicineId} onChange={(e) => setMedicineId(e.target.value)}>
              <option value="">Medicine</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input className="input-field" placeholder="Batch number" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            <input className="input-field" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <input className="input-field" type="number" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
            <input className="input-field" type="number" placeholder="Purchase price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input className="input-field" type="number" placeholder="Selling price" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create & Receive'}</button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold mb-4">Purchase Orders</h3>
          <div className="space-y-3">
            {loading ? (
              <p className="text-gray-500 text-sm py-4">Loading...</p>
            ) : purchases.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No purchase orders</p>
            ) : (
              purchases.map((po) => (
                <div key={po.id} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-800">{po.order_number}</div>
                      <div className="text-xs text-gray-500">{po.supplier_name}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      po.status === 'received' ? 'bg-green-100 text-green-700' :
                      po.status === 'ordered' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{po.status}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600">Total: Rs. {Number(po.total_amount).toLocaleString()}</span>
                    {po.status !== 'received' && (
                      <button type="button" onClick={() => receiveExisting(po)} className="text-green-700 text-xs font-medium">Receive stock</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="lg:col-span-1 card">
          <h3 className="text-sm font-semibold mb-4">Inventory snapshot</h3>
          <p className="text-xs text-gray-500 mb-4">Stock increases only when a purchase is received.</p>
          <div className="space-y-3">
            {medicines.slice(0, 8).map((m) => (
              <div key={m.id} className="p-2 border border-gray-100 rounded bg-white text-xs">
                <div className="font-medium text-gray-800 truncate">{m.name}</div>
                <div className="text-gray-500">Stock {Number(m.total_stock || 0)} · Rs. {Number(m.selling_price || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
