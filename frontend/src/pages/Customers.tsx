import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { customersApi } from '@/services/api';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    customersApi.list().then((r) => { setCustomers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await customersApi.create(form);
      setForm({ name: '', phone: '', address: '' });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500">Customer records and purchase history</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">New Customer</h2>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <input className="input-field" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input-field" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input-field" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Phone</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Total Purchases</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No customers</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-800">{c.name}</div><div className="text-xs text-gray-500">{c.address || '-'}</div></td>
                    <td className="px-4 py-3 text-sm">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">Rs. {Number(c.total_purchases || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={`font-medium ${Number(c.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        Rs. {Number(c.outstanding_balance || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
