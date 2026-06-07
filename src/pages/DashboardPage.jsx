import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Users, FileText, AlertTriangle, Wrench, DollarSign, Receipt, Activity, Calendar,
  Building2, MapPin, ClipboardList, CheckCircle, Clock,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiGet } from '../api/safeApi';
import KpiCard from '../components/ui/KpiCard';
import StatusBadge from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../utils/constants';

const COLORS = ['#C41E3A', '#374151', '#6B7280', '#F59E0B', '#10B981', '#3B82F6'];

function AdminDashboard({ data, t }) {
  const { kpis, charts, recentActivities, upcomingInterventions, technicianActivities } = data || {};

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.totalClients')} value={kpis?.totalClients} icon={Users} color="red" />
        <KpiCard title={t('dashboard.activeContracts')} value={kpis?.activeContracts} icon={FileText} color="blue" />
        <KpiCard title={t('dashboard.upcomingInspections')} value={kpis?.upcomingInspections} icon={AlertTriangle} color="orange" />
        <KpiCard title={t('dashboard.expiredMaintenance')} value={kpis?.expiredMaintenance} icon={Wrench} color="red" />
        <KpiCard title={t('dashboard.equipmentIntervention')} value={kpis?.equipmentNeedingIntervention} icon={Wrench} color="purple" />
        <KpiCard title={t('dashboard.monthlyRevenue')} value={formatCurrency(kpis?.monthlyRevenue)} icon={DollarSign} color="green" />
        <KpiCard title={t('dashboard.pendingInvoices')} value={kpis?.pendingInvoices} icon={Receipt} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Revenus mensuels (MAD)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts?.revenueByMonth?.map((r) => ({ month: `M${r._id}`, revenue: r.revenue })) || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="revenue" fill="#C41E3A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Équipements par catégorie</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts?.equipmentByCategory?.map((e) => ({ name: e._id, value: e.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {charts?.equipmentByCategory?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-nfc-red" /> {t('dashboard.recentActivities')}
          </h3>
          <div className="space-y-3">
            {recentActivities?.map((a) => (
              <div key={a._id} className="flex items-center gap-3 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs">
                  {a.user?.firstName?.[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{a.action} - {a.entityType}</p>
                  <p className="text-gray-500 text-xs">{a.user?.firstName} {a.user?.lastName}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-nfc-red" /> {t('dashboard.upcomingInterventions')}
            </h3>
            <Link to="/calendar" className="text-xs text-nfc-red hover:underline">Voir calendrier →</Link>
          </div>
          <div className="space-y-3">
            {upcomingInterventions?.map((i) => (
              <div key={i._id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="font-medium">{i.reference}</p>
                  <p className="text-gray-500">{i.client?.companyName}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={i.status} />
                  <p className="text-xs text-gray-400 mt-1">{formatDate(i.scheduledDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {technicianActivities?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Techniciens en intervention</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {technicianActivities.map((tech, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                <p className="font-medium">{tech.name}</p>
                <p className="text-nfc-red">{tech.count} en cours</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ViewerDashboard({ data, t }) {
  const { client, kpis, charts, upcomingInterventions, message } = data || {};

  if (!client) {
    return (
      <div className="card text-center py-12 text-gray-500">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>{message || 'Aucune entreprise liée à votre compte.'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="card bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 border border-red-100 dark:border-red-900/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.myCompany')}</p>
            <h2 className="text-xl font-bold">{client.companyName}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {client.contactPerson} {client.city ? `· ${client.city}` : ''}
            </p>
          </div>
          <Link to={`/clients/${client._id}`} className="btn-primary text-sm">
            {t('dashboard.viewMyProfile')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title={t('dashboard.activeContracts')} value={kpis?.activeContracts} icon={FileText} color="blue" />
        <KpiCard title={t('dashboard.myEquipment')} value={kpis?.totalEquipment} icon={Wrench} color="purple" />
        <KpiCard title={t('dashboard.mySites')} value={kpis?.sitesCount} icon={MapPin} color="green" />
        <KpiCard title={t('dashboard.upcomingInspections')} value={kpis?.upcomingInspections} icon={AlertTriangle} color="orange" />
        <KpiCard title={t('dashboard.expiredMaintenance')} value={kpis?.expiredMaintenance} icon={Wrench} color="red" />
        <KpiCard title={t('dashboard.pendingInvoices')} value={kpis?.pendingInvoices} icon={Receipt} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts?.equipmentByCategory?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">{t('dashboard.myEquipmentByCategory')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={charts.equipmentByCategory.map((e) => ({ name: e._id, value: e.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {charts.equipmentByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-nfc-red" /> {t('dashboard.myUpcomingInterventions')}
          </h3>
          <div className="space-y-3">
            {upcomingInterventions?.length ? upcomingInterventions.map((i) => (
              <div key={i._id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="font-medium">{i.reference}</p>
                  <p className="text-gray-500">
                    {i.technician ? `${i.technician.firstName} ${i.technician.lastName}` : 'Technicien à assigner'}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={i.status} />
                  <p className="text-xs text-gray-400 mt-1">{formatDate(i.scheduledDate)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500">{t('dashboard.noUpcoming')}</p>
            )}
          </div>
          <Link to="/interventions" className="text-xs text-nfc-red hover:underline mt-3 inline-block">
            {t('dashboard.seeAllInterventions')} →
          </Link>
        </div>
      </div>
    </>
  );
}

function TechnicianDashboard({ data, t }) {
  const { kpis, charts, upcomingInterventions } = data || {};

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={t('dashboard.myPendingJobs')} value={kpis?.myPending} icon={Clock} color="orange" />
        <KpiCard title={t('dashboard.myInProgress')} value={kpis?.myInProgress} icon={ClipboardList} color="blue" />
        <KpiCard title={t('dashboard.myCompletedMonth')} value={kpis?.myCompletedMonth} icon={CheckCircle} color="green" />
        <KpiCard title={t('dashboard.equipmentIntervention')} value={kpis?.equipmentNeedingIntervention} icon={Wrench} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-nfc-red" /> {t('dashboard.mySchedule')}
            </h3>
            <Link to="/technician" className="text-xs text-nfc-red hover:underline">{t('nav.technician')} →</Link>
          </div>
          <div className="space-y-3">
            {upcomingInterventions?.length ? upcomingInterventions.map((i) => (
              <div key={i._id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                <div>
                  <p className="font-medium">{i.reference}</p>
                  <p className="text-gray-500">{i.client?.companyName} {i.site?.name ? `· ${i.site.name}` : ''}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={i.status} />
                  <p className="text-xs text-gray-400 mt-1">{formatDate(i.scheduledDate)}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500">{t('dashboard.noUpcoming')}</p>
            )}
          </div>
        </div>
        {charts?.equipmentByCategory?.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">{t('dashboard.clientEquipment')}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={charts.equipmentByCategory.map((e) => ({ name: e._id, value: e.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {charts.equipmentByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: res } = await apiGet('/dashboard');
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-center py-20">{t('common.loading')}</div>;

  if (!data) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="text-red-600 dark:text-red-400">{t('common.error') || 'Erreur'} — impossible de charger le tableau de bord.</p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          {t('common.retry') || 'Réessayer'}
        </button>
      </div>
    );
  }

  const role = data?.role || user?.role;
  const titles = {
    viewer: t('dashboard.titleClient'),
    technician: t('dashboard.titleTechnician'),
    admin: t('dashboard.title'),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">{titles[role] || titles.admin}</h1>
      {role === 'viewer' && <ViewerDashboard data={data} t={t} />}
      {role === 'technician' && <TechnicianDashboard data={data} t={t} />}
      {role !== 'viewer' && role !== 'technician' && <AdminDashboard data={data} t={t} />}
    </div>
  );
}
