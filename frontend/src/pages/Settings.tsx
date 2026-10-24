import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, Phone, Mail, MapPin, Percent, Clock, Language } from 'lucide-react';
import { settingsApi } from '@/services/api';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    pharmacy_name: '', address: '', phone: '', email: '', tax_rate: 0,
    currency: 'PKR', currency_symbol: 'Rs.', timezone: 'Asia/Karachi',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => { setSettings(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(settings);
      alert('Settings saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon size={20} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-800">Pharmacy Settings</h1>
      </div>
      <p className="text-gray-500">Configure pharmacy details and tax settings</p>

      <form onSubmit={handleSave} className="card max-w-2xl space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pharmacy Name</label>
            <input className="input-field" value={settings.pharmacy_name} onChange={(e) => setSettings({ ...settings, pharmacy_name: e.target.value })} placeholder="Pharmacy name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input-field" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="+92-..." />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input className="input-field" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="Address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input-field" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} placeholder="email@pharmacy.pk" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input className="input-field" type="number" value={settings.tax_rate} onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) || 0 })} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <input className="input-field" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} placeholder="PKR" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input className="input-field" value={settings.currency_symbol} onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })} placeholder="Rs." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <input className="input-field" value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} placeholder="Asia/Karachi" />
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <div className="card border-yellow-100 bg-yellow-50 p-5">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠ Compliance Notice</h3>
        <p className="text-sm text-yellow-700">
          This software is a demo. Before commercial deployment in Pakistan, verify compliance with local
          pharmacy regulations, recordkeeping requirements, data protection laws, and tax regulations.
          Tax rates and invoice settings are configurable but must be validated against local requirements.
        </p>
      </div>
    </div>
  );
}