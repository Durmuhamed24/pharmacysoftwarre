import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { expensesApi } from '@/services/api';

const CATEGORIES = ['Rent', 'Employee Salaries', 'Electricity', 'Internet', 'Transportation', 'Packaging', 'Maintenance', 'Other'];

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: 'Rent',
    amount: '',
    expense_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
    payment_method: 'cash',
    description: '',
  });

  useEffect(() => {
    load();
  }, []);

  function load() {
    expensesApi.list().then((r) => {
      setExpenses(r.data);
      setTotal(r.data.reduce((a: number, b: any) => a + Number(b.amount), 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.amount) {
      setError('Title and amount are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await expensesApi.create({ ...form, amount: Number(form.amount) });
      setShowForm(false);
      setForm({ ...form, title: '', amount: '', description: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
          <p className="text-gray-500">Operating expense tracking</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3 max-w-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">New Expense</h2>
            <button type="button" onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <input className="input-field" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input-field" type="number" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="input-field" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          <select className="input-field" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          <input className="input-field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="stat-card">
          <div className="text-lg font-bold text-gray-800">Rs. {total.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Total Expenses</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-bold text-gray-800">{expenses.length}</div>
          <div className="text-sm text-gray-500">Expense Records</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Title</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Amount</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600">Method</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-600 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">No expenses</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-gray-800">{e.title}</div><div className="text-xs text-gray-500">{e.description || '-'}</div></td>
                    <td className="px-4 py-3 text-sm">{e.category}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">Rs. {Number(e.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.expense_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.payment_method}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">{e.recorded_by_name || '-'}</td>
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
