import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import { apiGet } from '../api/safeApi';
import { downloadExport } from '../utils/exportDownload';

export default function SalesReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/reports/sales', { params: { period } });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [period]);

  const exportReport = (format) => {
    downloadExport(`reports/sales?period=${period}&format=${format}`, `rapport_ventes_${period}.${format}`);
  };

  if (loading && !data) return <div className="p-4">Chargement des rapports...</div>;

  const { metrics, bestSellingProducts, mostActiveCustomers } = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-nfc-red" /> Rapports des Ventes
        </h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportReport('xlsx')} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={() => exportReport('pdf')} className="btn-primary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {['today', 'week', 'month', 'year'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${period === p ? 'bg-nfc-red text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            {p === 'today' ? "Aujourd'hui" : p === 'week' ? 'Cette Semaine' : p === 'month' ? 'Ce Mois' : 'Cette Année'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-full"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Ventes</p>
            <p className="text-2xl font-bold">{metrics?.numberOfSales || 0}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="bg-green-100 text-green-600 p-3 rounded-full"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Chiffre d'Affaires HT</p>
            <p className="text-2xl font-bold">{metrics?.revenueHT?.toLocaleString()} DH</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">TVA</p>
            <p className="text-2xl font-bold">{metrics?.vatAmount?.toLocaleString()} DH</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="bg-purple-100 text-purple-600 p-3 rounded-full"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500">Chiffre d'Affaires TTC</p>
            <p className="text-2xl font-bold">{metrics?.revenueTTC?.toLocaleString()} DH</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <h3 className="font-semibold mb-4 text-lg border-b pb-2">Produits les plus vendus</h3>
          {bestSellingProducts?.length > 0 ? (
            <ul className="space-y-3">
              {bestSellingProducts.map((p, i) => (
                <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="font-medium text-gray-700">{p.name}</span>
                  <span className="bg-gray-200 text-sm px-2 py-1 rounded font-bold">{p.count} ventes</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">Aucune donnée pour cette période</p>
          )}
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-4 text-lg border-b pb-2 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" /> Clients les plus actifs
          </h3>
          {mostActiveCustomers?.length > 0 ? (
            <ul className="space-y-3">
              {mostActiveCustomers.map((c, i) => (
                <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                  <span className="font-medium text-gray-700">{c.client}</span>
                  <span className="bg-gray-200 text-sm px-2 py-1 rounded font-bold">{c.total.toLocaleString()} DH</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">Aucune donnée pour cette période</p>
          )}
        </div>
      </div>
    </div>
  );
}
