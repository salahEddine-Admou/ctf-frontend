import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/constants';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  const [interventions, setInterventions] = useState([]);

  useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setMonth(to.getMonth() + 2);
    api.get('/interventions', {
      params: { from: from.toISOString(), to: to.toISOString(), limit: 50 },
    }).then(({ data }) => setInterventions(data.data));
  }, []);

  const grouped = interventions.reduce((acc, i) => {
    const dateObj = new Date(i.scheduledDate);
    const dayStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const day = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
    
    if (!acc[day]) acc[day] = [];
    acc[day].push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="w-7 h-7 text-nfc-red" /> Calendrier maintenance
      </h1>
      <div className="space-y-4">
        {Object.entries(grouped).map(([day, items]) => (
          <div key={day} className="card">
            <h3 className="font-semibold text-nfc-red mb-3">{day}</h3>
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{i.reference} - {i.client?.companyName}</p>
                    <p className="text-gray-500">{i.type} | {i.technician?.firstName} {i.technician?.lastName}</p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {!interventions.length && <p className="text-gray-500 text-center py-12">Aucune intervention planifiée</p>}
      </div>
    </div>
  );
}
