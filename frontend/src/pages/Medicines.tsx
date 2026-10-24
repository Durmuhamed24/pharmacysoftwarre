import { useState, useEffect } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import { medicinesApi, categoriesApi, suppliersApi } from '@/services/api';

const emptyForm = {
  name: '', generic_name: '', brand_name: '', category_id: '', barcode: '',
  sku: '', manufacturer: '', strength: '', dosage_form: '', pack_size: '',
  unit: 'tablet', prescription_required: '0', min_stock_level: '0', supplier_id: ''
};

export default function Medicines() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => loadData(), 250);
    return () => clearTimeout(t);
  }, [search, categoryFilter, stockFilter]);

  async function loadData() {
    try {
      const [m, c, s] = await Promise.all([
        medicinesApi.list({ search, category: categoryFilter || undefined, stock: stockFilter || undefined }),
        categoriesApi.list(),
        suppliersApi.list(),
      ]);
      setMedicines(m.data);
      setCategories(c.data);
      setSuppliers(s.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Medicine name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await medicinesApi.create({
        ...form,
        min_stock_level: Number(form.min_stock_level) || 0,
        prescription_required: form.prescription_required === '1',
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
      });
      setForm(emptyForm);
      setShowForm(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Medicine Inventory</h1>
          <p className="text-gray-500">Manage medicines, batches, and stock</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">New Medicine</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500"><X size={18} /></button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid gap-3 md:grid-cols-3">
            <input className="input-field" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input-field" placeholder="Generic name" value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} />
            <input className="input-field" placeholder="Brand" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
            <input className="input-field" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            <input className="input-field" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <input className="input-field" placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            <input className="input-field" placeholder="Strength" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
            <input className="input-field" placeholder="Dosage form" value={form.dosage_form} onChange={(e) => setForm({ ...form, dosage_form: e.target.value })} />
            <input className="input-field" placeholder="Min stock" type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} />
            <select className="input-field" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input-field" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="input-field" value={form.prescription_required} onChange={(e) => setForm({ ...form, prescription_required: e.target.value })}>
              <option value="0">OTC</option>
              <option value="1">Prescription required</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Medicine'}</button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="col-span-4 md:col-span-2">
          <input
            type="text"
            className="input-field"
            placeholder="Search by name, barcode, brand, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <select className="input-field" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="">All Stock</option>
            <option value="low">Low Stock</option>
          </select>
          <button type="button" onClick={loadData} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Generic / Brand</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Barcode / SKU</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Stock</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Price</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : medicines.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No medicines found</td></tr>
              ) : (
                medicines.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-800">{m.name}</div><div className="text-xs text-gray-500">{m.strength || ''} {m.dosage_form || ''}</div></td>
                    <td className="px-4 py-3 text-sm">{m.generic_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{m.barcode || '-'} / {m.sku || '-'}</td>
                    <td className="px-4 py-3 text-sm">{m.category_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{Number(m.total_stock || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">Rs. {Number(m.selling_price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
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
