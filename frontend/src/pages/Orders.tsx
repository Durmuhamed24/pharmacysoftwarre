import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { ordersApi, medicinesApi, customersApi } from '@/services/api';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-indigo-100 text-indigo-700',
  ready_for_pickup: 'bg-green-100 text-green-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled'];

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [medicineId, setMedicineId] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([ordersApi.list(), medicinesApi.list(), customersApi.list()])
      .then(([o, m, c]) => {
        setOrders(o.data);
        setMedicines(m.data);
        setCustomers(c.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const customer = customers.find((c) => c.id === customerId);
    const med = medicines.find((m) => m.id === medicineId);
    if (!customer || !med) {
      setError('Select customer and medicine');
      return;
    }
    const quantity = Number(qty) || 1;
    const unit_price = Number(med.selling_price || 0);
    setSaving(true);
    setError('');
    try {
      await ordersApi.create({
        order_number: 'ORD-' + Date.now().toString().slice(-8),
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        total_amount: quantity * unit_price,
        notes,
        items: [{
          medicine_id: med.id,
          medicine_name: med.name,
          quantity,
          unit_price,
          line_total: quantity * unit_price,
        }],
      });
      const r = await ordersApi.list();
      setOrders(r.data);
      setShowForm(false);
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customer Orders</h1>
          <p className="text-gray-500">Manage pharmacy orders and fulfillment</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> New Order
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">New Order</h2>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <select className="input-field" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input-field" value={medicineId} onChange={(e) => setMedicineId(e.target.value)}>
            <option value="">Medicine</option>
            {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="input-field" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          <input className="input-field" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-xs text-gray-500">Stock is not deducted until the order is converted to a sale at POS.</p>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Create Order'}</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Order #</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Total</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Advance status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No orders</td></tr>
              ) : (
                orders.map((o) => {
                  const idx = STATUSES.indexOf(o.status);
                  const next = idx >= 0 && idx < STATUSES.length - 2 ? STATUSES[idx + 1] : null;
                  return (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="font-medium text-gray-800">{o.order_number}</div></td>
                      <td className="px-4 py-3 text-sm">{o.customer_name}<div className="text-xs text-gray-500">{o.customer_phone || '-'}</div></td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">Rs. {Number(o.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{String(o.created_at).slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {next && (
                            <button
                              type="button"
                              className="text-xs text-green-700 font-medium"
                              onClick={() => ordersApi.update(o.id, { status: next }).then(() => setOrders(orders.map((x) => x.id === o.id ? { ...x, status: next } : x)))}
                            >
                              Mark {next.replace(/_/g, ' ')}
                            </button>
                          )}
                          {o.status !== 'cancelled' && o.status !== 'completed' && (
                            <button
                              type="button"
                              className="text-xs text-red-600"
                              onClick={() => ordersApi.update(o.id, { status: 'cancelled' }).then(() => setOrders(orders.map((x) => x.id === o.id ? { ...x, status: 'cancelled' } : x)))}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
