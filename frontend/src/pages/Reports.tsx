import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, Search, Printer } from 'lucide-react';
import { reportsApi } from '@/services/api';

export default function Reports() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [invData, setInvData] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any[]>([]);
  const [expired, setExpired] = useState<any[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [from, to]);

  async function loadData() {
    try {
      const [s, p, i, ls, ex, ep] = await Promise.all([
        reportsApi.sales({ from, to }),
        reportsApi.profit({ from, to }),
        reportsApi.inventoryValue(),
        reportsApi.lowStock(),
        reportsApi.expiry(),
        reportsApi.expired(),
      ]);
      setSalesData(s.data);
      setProfitData(p.data);
      setInvData(i.data);
      setLowStock(ls.data);
      setExpiry(ex.data);
      setExpired(ep.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }

  const totalSales = salesData.reduce((a, b) => a + Number(b.sales), 0);
  const totalCogs = profitData.reduce((a, b) => a + Number(b.cogs), 0);
  const totalGross = profitData.reduce((a, b) => a + Number(b.gross_profit), 0);
  const totalDiscounts = salesData.reduce((a, b) => a + Number(b.discounts), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <input type="date" className="input-field w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="input-field w-44" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={loadData} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
          <Search size={18} />
        </button>
        <button type="button" onClick={() => {
          const rows = [['Date', 'Invoices', 'Sales', 'Discounts'], ...salesData.map((r) => [r.date, r.invoices, r.sales, r.discounts])];
          const csv = rows.map((r) => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'sales-report.csv';
          a.click();
        }} className="px-4 py-2 bg-green-600 rounded-lg text-white hover:bg-green-700 flex items-center">
          <FileText size={18} className="mr-2" /> Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200">
          <Printer size={18} />
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="stat-card">
          <div className="text-lg font-bold text-gray-800">Rs. {totalSales.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Net Sales (period)</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-bold text-gray-800">Rs. {totalGross.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Gross Profit</div>
        </div>
        <div className="stat-card">
          <div className="text-lg font-bold text-gray-800">Rs. {totalDiscounts.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Discounts Given</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 card">
          <h3 className="text-sm font-semibold mb-4">Sales Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Profit vs COGS</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="net_sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Low Stock</h3>
          <div className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-gray-500 text-sm">None</p>
            ) : (
              lowStock.map((m) => (
                <div key={m.id} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="text-red-600 font-bold">{m.qty}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Near Expiry</h3>
          <div className="space-y-2">
            {expiry.length === 0 ? (
              <p className="text-gray-500 text-sm">None</p>
            ) : (
              expiry.map((e) => (
                <div key={e.batch_number} className="flex justify-between text-sm p-2 bg-amber-50 rounded">
                  <span className="text-gray-700 truncate" title={e.name}>{e.name}</span>
                  <span className="text-amber-700 font-bold">{e.batch_number}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold mb-4">Expired</h3>
          <div className="space-y-2">
            {expired.length === 0 ? (
              <p className="text-gray-500 text-sm">None</p>
            ) : (
              expired.map((e) => (
                <div key={e.batch_number} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                  <span className="text-gray-700 truncate" title={e.name}>{e.name}</span>
                  <span className="text-red-700 font-bold">{e.batch_number}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-4">Inventory Valuation</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr><th className="px-4 py-2">Medicine</th><th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Cost Value</th><th className="px-4 py-2 text-right">Retail Value</th></tr>
            </thead>
            <tbody>
              {invData.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-gray-700">{m.name}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{Number(m.qty).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-600">Rs. {Number(m.cost_value).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-600">Rs. {Number(m.retail_value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}