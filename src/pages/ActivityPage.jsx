import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';
import { formatDate } from '../utils/constants';
import { ROLE_LABELS } from '../utils/constants';

export default function ActivityPage() {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/activities', { params: filter ? { entityType: filter } : {} })
      .then(({ data }) => setActivities(data.data));
  }, [filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.activity', 'Journal d\'activité')}</h1>
      <div className="flex gap-2 flex-wrap">
        {['', 'user', 'client', 'intervention', 'invoice', 'contract', 'equipment'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {f || 'Tous'}
          </button>
        ))}
      </div>
      <div className="card divide-y dark:divide-gray-700">
        {activities.map((a) => (
          <div key={a._id} className="py-3 flex justify-between gap-4 text-sm">
            <div>
              <p className="font-medium">{a.action} — {a.entityType}</p>
              <p className="text-gray-500">{a.entityName || a.entityId}</p>
              <p className="text-xs text-gray-400">{a.user?.firstName} {a.user?.lastName} ({ROLE_LABELS[a.user?.role]})</p>
            </div>
            <span className="text-gray-400 whitespace-nowrap">{formatDate(a.createdAt)}</span>
          </div>
        ))}
        {!activities.length && <p className="py-8 text-center text-gray-500">Aucune activité</p>}
      </div>
    </div>
  );
}
