import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Trash2, PlusCircle, MinusCircle,
  Landmark, CreditCard as CardIcon, Banknote, Phone, Save, FileText, Loader2
} from 'lucide-react';
import { medicinesApi, salesApi, settingsApi, customersApi } from '@/services/api';
import { Customer, Medicine, SaleItem, Settings } from '@/types';

const PAYMENT_METHODS: Array<{ value: string; label: string; icon: typeof Banknote }> = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CardIcon },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'split', label: 'Split Payment', icon: Save },
  { value: 'credit', label: 'Credit Sale', icon: Phone },
];

interface CartItem extends SaleItem {
  medicine_name: string;
  batch_number: string;
  max_qty: number;
}

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
}

export default function POS() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'success' as 'success' | 'error' });
  const [settings, setSettings] = useState<Pick<Settings, 'pharmacy_name' | 'phone' | 'address' | 'tax_rate' | 'currency_symbol'>>({
    pharmacy_name: 'Al-Noor Pharmacy',
    phone: '+92-300-1234567',
    address: '123 Main Market, Faisalabad, Pakistan',
    tax_rate: 0,
    currency_symbol: 'Rs.',
  });

  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsApi.get().then((r) => {
      if (r.data) {
        setSettings({
          pharmacy_name: r.data.pharmacy_name,
          phone: r.data.phone,
          address: r.data.address,
          tax_rate: Number(r.data.tax_rate) || 0,
          currency_symbol: r.data.currency_symbol || 'Rs.',
        });
      }
    }).catch(() => {});
    customersApi.list().then((r) => setCustomers(r.data || [])).catch(() => {});
  }, []);

  async function loadMedicines(q: string) {
    try {
      const res = await medicinesApi.list({ search: q || undefined });
      setMedicines(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    const deb = setTimeout(() => loadMedicines(search), 300);
    return () => clearTimeout(deb);
  }, [search]);

  const subtotal = cart.reduce((s, i) => s + i.line_total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = settings.tax_rate ? subtotal * (settings.tax_rate / 100) : 0;
  const total = Math.max(0, subtotal - discountAmount + taxAmount);
  const received = parseFloat(amountReceived) || 0;
  const changeDue = paymentMethod === 'cash' ? received - total : 0;

  const addToCart = async (medicine: Medicine) => {
    const batches = await getMedicineBatches(medicine.id);
    const today = todayISO();
    const activeBatches = batches
      .filter((b: any) => b.is_active && b.current_quantity > 0 && String(b.expiry_date).slice(0, 10) >= today)
      .sort((a: any, b: any) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
    if (activeBatches.length === 0) {
      setMessage({ text: 'No active (non-expired) stock available for this medicine', type: 'error' });
      return;
    }
    addBatchToCart(activeBatches[0], medicine);
  };

  async function getMedicineBatches(id: string) {
    try {
      const res = await medicinesApi.get(id);
      return res.data.batches || [];
    } catch {
      return [];
    }
  }

  function addBatchToCart(batch: any, medicine: Medicine) {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.medicine_batch_id === batch.id);
      if (existing >= 0) {
        const newQty = prev[existing].quantity + 1;
        if (newQty > batch.current_quantity) {
          setMessage({ text: 'Insufficient stock for this batch', type: 'error' });
          return prev;
        }
        return prev.map((i, idx) =>
          idx === existing ? { ...i, quantity: newQty, line_total: newQty * i.unit_price } : i
        );
      }
      return [...prev, {
        medicine_batch_id: batch.id,
        medicine_name: medicine.name,
        batch_number: batch.batch_number,
        quantity: 1,
        unit_price: batch.selling_price,
        cost_price: batch.purchase_price,
        line_total: batch.selling_price,
        max_qty: batch.current_quantity,
      }];
    });
    setSearch('');
    searchInput.current?.focus();
    setMessage({ text: `${medicine.name} added to cart`, type: 'success' });
  }

  function updateQuantity(index: number, delta: number) {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      if (newQty > item.max_qty) {
        setMessage({ text: 'Insufficient stock for this batch', type: 'error' });
        return prev;
      }
      return prev.map((i, idx) => idx === index ? { ...i, quantity: newQty, line_total: newQty * i.unit_price } : i);
    });
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setMessage({ text: 'Cart is empty', type: 'error' });
      return;
    }
    if (paymentMethod === 'credit' && !customerId) {
      setMessage({ text: 'Select a customer for credit sales', type: 'error' });
      return;
    }
    if (paymentMethod === 'cash' && received < total) {
      setMessage({ text: 'Amount received is less than total', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const items = cart.map((i) => ({
        medicine_batch_id: i.medicine_batch_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price: i.cost_price,
        line_total: i.line_total,
      }));
      const res = await salesApi.create({
        customer_id: customerId || null,
        payment_method: paymentMethod,
        items,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        amount_received: paymentMethod === 'cash' ? received : total,
        change_due: changeDue > 0 ? changeDue : 0,
      });
      setMessage({ text: `Sale completed! Invoice ${res.data.invoice_number}`, type: 'success' });
      setCart([]);
      setCustomerId('');
      setDiscount('');
      setAmountReceived('');
      setPaymentMethod('cash');
      loadMedicines('');
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Sale failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Point of Sale</h1>
          <p className="text-gray-500">Fast billing for counter staff</p>
        </div>
        {message.text && (
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <div className="card">
            <div className="flex gap-2">
              <input
                ref={searchInput}
                type="text"
                className="input-field flex-1"
                placeholder="Search by name, barcode, brand, or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <button type="button" className="px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700">
                <Search size={18} />
              </button>
            </div>
            <div className="mt-4 max-h-[400px] overflow-y-auto">
              {medicines.length === 0 && search ? (
                <p className="text-center text-gray-500 text-sm py-4">No medicines found</p>
              ) : (
                medicines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => addToCart(m)}>
                    <div>
                      <div className="font-medium text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.generic_name || ''} {m.brand_name ? `(${m.brand_name})` : ''}</div>
                      <div className="text-xs text-gray-400">{m.barcode || m.sku}</div>
                    </div>
                    <button type="button" className="text-green-600 hover:bg-green-50 p-1.5 rounded">
                      <Plus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3">Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)</h3>
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">Empty cart</div>
              ) : (
                cart.map((item, i) => (
                  <div key={item.medicine_batch_id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg bg-gray-50 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{item.medicine_name}</div>
                      <div className="text-xs text-gray-500">Batch {item.batch_number} · Qty {item.quantity} × {settings.currency_symbol} {item.unit_price.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(i, -1)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                        <MinusCircle size={16} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(i, 1)} className="p-1 hover:bg-green-50 text-green-600 rounded">
                        <PlusCircle size={16} />
                      </button>
                      <button type="button" onClick={() => removeItem(i)} className="p-1 hover:bg-red-50 text-red-600 rounded">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="text-sm font-bold text-gray-800 whitespace-nowrap">{settings.currency_symbol} {item.line_total.toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <form className="card space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Customer (optional)</label>
              <select className="input-field" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{settings.currency_symbol} {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm items-center"><span className="text-gray-500">Discount</span><input className="input-field w-24 text-sm" value={discount} onChange={(e) => setDiscount(e.target.value)} /></div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{settings.currency_symbol} {taxAmount.toLocaleString()}</span></div>
              )}
              <div className="flex justify-between text-sm font-bold"><span>Total</span><span>{settings.currency_symbol} {total.toLocaleString()}</span></div>
            </div>
            <hr className="border-gray-100" />
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-500 uppercase">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    type="button"
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`flex items-center gap-2 p-2 rounded border text-sm transition-colors ${
                      paymentMethod === pm.value ? 'bg-green-50 border-green-200 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <pm.icon size={16} /> {pm.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Amount Received</label>
                  <input type="number" className="input-field" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder="0" />
                </div>
              )}
              {paymentMethod === 'credit' && (
                <div className="p-3 bg-blue-50 rounded border border-blue-100">
                  <div className="text-xs font-medium text-blue-800">Credit sale — customer outstanding will increase</div>
                </div>
              )}
              {changeDue > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Change Due</span><span className="font-bold text-green-600">{settings.currency_symbol} {changeDue.toLocaleString()}</span></div>
              )}
            </div>
            <button type="submit" disabled={loading || cart.length === 0} className="btn-primary w-full py-3 text-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              Complete Sale
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
