import { useEffect, useState } from 'react';
import {
  DollarSign, CreditCard, Package, AlertTriangle, Clock, TrendingUp,
  Activity, Banknote, Building, RefreshCw, FileText
} from 'lucide-react';
import { reportsApi } from '@/services/api';
import { DashboardStats } from '@/types';

const statIcons: Record<string, any> = {
  today_sales: Banknote,
  today_bills: FileText,
  total_purchases: Package,
  cogs: CreditCard,
  gross_profit: TrendingUp,
  operating_expenses: DollarSign,
  net_operating_profit: Activity,
  cash_received: Banknote,
  card_received: CreditCard,
  bank_received: Building,
  outstanding_customers: AlertTriangle,
  outstanding_suppliers: AlertTriangle,
  inventory_value: Package,
  low_stock_count: AlertTriangle,
  near_expiry_value: Clock,
  expired_value: AlertTriangle,
};

const statLabels: Record<string, string> = {
  today_sales: "Today's Sales",
  today_bills: 'Bills Today',
  total_purchases: 'Total Purchases',
  cogs: 'Cost of Goods Sold',
  gross_profit: 'Gross Profit',
  operating_expenses: 'Operating Expenses',
  net_operating_profit: 'Net Operating Profit',
  cash_received: 'Cash Received',
  card_received: 'Card / Bank',
  bank_received: 'Bank Transfer',
  outstanding_customers: 'Customer Outstanding',
  outstanding_suppliers: 'Supplier Outstanding',
  inventory_value: 'Inventory Value',
  low_stock_count: 'Low Stock Items',
  near_expiry_value: 'Near Expiry Value',
  expired_value: 'Expired Stock Value',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [profitChart, setProfitChart] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiry, setExpiry] = useState<any[]>([]);
  const [expired, setExpired] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [d, s, p, r, ls, ex, ep] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.sales(),
        reportsApi.profit(),
        reportsApi.recentActivity(),
        reportsApi.lowStock(),
        reportsApi.expiry(),
        reportsApi.expired(),
      ]);
      setStats(d.data);
      setSalesChart(s.data);
      setProfitChart(p.data);
      setRecent(r.data);
      setLowStock(ls.data);
      setExpiry(ex.data);
      setExpired(ep.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  const currency = 'Rs.';
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Overview of pharmacy performance</p>
        </div>
        <button className="btn-outline" onClick={loadData}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Object.entries(stats as any).map(([key, value]) => {
          const Icon = statIcons[key] || DollarSign;
          return (
            <div key={key} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <Icon size={18} />
                </div>
                <span className="text-xs text-gray-500 uppercase font-medium">{statLabels[key]}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-gray-800">{currency} {Number(value || 0).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4">Sales & Profit Trend</h2>
          <div className="h-64">
            <SimpleChart data={profitChart} label="Gross Profit" valueKey="gross_profit" />
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-gray-500 text-sm">No low stock items</p>
            ) : (
              lowStock.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center p-2 bg-red-50 rounded-lg border border-red-100 text-sm">
                  <div>
                    <div className="font-medium text-gray-800">{m.name}</div>
                    <div className="text-xs text-gray-500">SKU: {m.sku}</div>
                  </div>
                  <div className="text-red-600 font-bold">{m.qty} / min {m.min_stock_level}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4">Near Expiry & Expired</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-medium text-amber-800 mb-2">Near Expiry (90 days)</h3>
              <div className="text-xl font-bold text-amber-700">{currency} {expiry.reduce((a: any, b: any) => a + (b.value || 0), 0).toLocaleString()}</div>
              <p className="text-xs text-amber-600 mt-1">{expiry.length} batches</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <h3 className="text-sm font-medium text-red-800 mb-2">Expired Stock</h3>
              <div className="text-xl font-bold text-red-700">{currency} {expired.reduce((a: any, b: any) => a + (b.value || 0), 0).toLocaleString()}</div>
              <p className="text-xs text-red-600 mt-1">{expired.length} batches</p>
            </div>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recent.map((a: any) => (
                <div key={a.ref + a.created_at} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm border border-gray-100">
                  <div>
                    <div className="font-medium text-gray-800">{a.type === 'sale' ? 'Sale' : a.type === 'purchase' ? 'Purchase' : 'Expense'} • {a.ref}</div>
                    <div className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="font-bold text-gray-700">{currency} {Number(a.amount || 0).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimpleChart({ data, label, valueKey }: { data: any[]; label: string; valueKey: string }) {
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm">No data available</p>;
  const max = Math.max(...data.map(d => d[valueKey] || 0));
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex items-end gap-1 px-2 pb-2">
        {data.map((d, i) => {
          const h = max > 0 ? ((d[valueKey] || 0) / max) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className={`w-full bg-green-600 rounded-t-sm transition-all duration-500`} style={{ height: `${h}%` }}></div>
              <span className="text-[10px] text-gray-500 mt-1">{d.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}