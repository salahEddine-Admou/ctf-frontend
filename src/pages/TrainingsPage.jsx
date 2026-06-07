import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, GraduationCap, Award } from 'lucide-react';
import api from '../api/axios';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/constants';
import { openPdf } from '../utils/exportDownload';

const TYPES = ['fire_safety', 'extinguisher', 'evacuation', 'first_aid', 'hse', 'custom'];

export default function TrainingsPage() {
  const { t } = useTranslation();
  const [trainings, setTrainings] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [participantForm, setParticipantForm] = useState({ name: '', email: '', company: '' });
  const [form, setForm] = useState({
    title: '', type: 'fire_safety', client: '', trainer: '', scheduledDate: '', location: '', city: '', maxParticipants: 20,
  });

  const load = () => {
    setLoading(true);
    api.get('/trainings').then(({ data }) => { setTrainings(data.data); setLoading(false); });
  };

  useEffect(() => {
    load();
    api.get('/users').then(({ data }) => setUsers(data.data));
    api.get('/clients', { params: { limit: 100 } }).then(({ data }) => setClients(data.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/trainings', form);
    setShowForm(false);
    load();
  };

  const addParticipant = async (e) => {
    e.preventDefault();
    await api.post(`/trainings/${detail._id}/participants`, participantForm);
    const { data } = await api.get(`/trainings/${detail._id}`);
    setDetail(data.data);
    setParticipantForm({ name: '', email: '', company: '' });
  };

  const issueCertificate = async (trainingId, participantId) => {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const { data } = await api.post(`/trainings/${trainingId}/participants/${participantId}/certificate`, {
      expiryDate: expiry.toISOString(),
    });
    if (data.data.certificateUrl) openPdf(data.data.certificateUrl);
    load();
    if (detail) {
      const res = await api.get(`/trainings/${detail._id}`);
      setDetail(res.data.data);
    }
  };

  const columns = [
    { key: 'reference', label: 'Réf.' },
    { key: 'title', label: 'Formation' },
    { key: 'type', label: 'Type' },
    { key: 'client', label: 'Client', render: (r) => r.client?.companyName || '-' },
    { key: 'trainer', label: 'Formateur', render: (r) => `${r.trainer?.firstName || ''} ${r.trainer?.lastName || ''}` },
    { key: 'scheduledDate', label: 'Date', render: (r) => formatDate(r.scheduledDate) },
    { key: 'participants', label: 'Participants', render: (r) => r.participants?.length || 0 },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-nfc-red" />
          {t('nav.trainings', 'Formations & Sensibilisation HSE')}
        </h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvelle formation
        </button>
      </div>
      <DataTable columns={columns} data={trainings} loading={loading} onRowClick={async (r) => {
        const { data } = await api.get(`/trainings/${r._id}`);
        setDetail(data.data);
      }} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Planifier une formation" wide>
        <form onSubmit={handleCreate} className="space-y-3">
          <input className="input-field" placeholder="Titre" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input-field" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
            <option value="">Client (optionnel)</option>
            {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
          </select>
          <select className="input-field" required value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })}>
            <option value="">Formateur</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
          </select>
          <input type="datetime-local" className="input-field" required value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
          <input className="input-field" placeholder="Lieu" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input className="input-field" placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Créer</button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title} wide>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">Réf:</span> {detail.reference}</p>
              <p><span className="text-gray-500">Date:</span> {formatDate(detail.scheduledDate)}</p>
              <p><span className="text-gray-500">Formateur:</span> {detail.trainer?.firstName} {detail.trainer?.lastName}</p>
              <p><StatusBadge status={detail.status} /></p>
            </div>
            <form onSubmit={addParticipant} className="flex gap-2 flex-wrap">
              <input className="input-field flex-1 min-w-[120px]" placeholder="Nom participant" required value={participantForm.name} onChange={(e) => setParticipantForm({ ...participantForm, name: e.target.value })} />
              <input className="input-field flex-1 min-w-[120px]" placeholder="Email" value={participantForm.email} onChange={(e) => setParticipantForm({ ...participantForm, email: e.target.value })} />
              <button type="submit" className="btn-secondary">Ajouter</button>
            </form>
            <div className="space-y-2">
              {detail.participants?.map((p) => (
                <div key={p._id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-gray-500">{p.email} {p.attended && '✓ Présent'}</p>
                  </div>
                  {p.certificateIssued ? (
                    <button onClick={() => openPdf(p.certificateUrl)} className="text-nfc-red text-xs flex items-center gap-1">
                      <Award className="w-4 h-4" /> Attestation
                    </button>
                  ) : (
                    <button onClick={() => issueCertificate(detail._id, p._id)} className="btn-primary text-xs py-1">
                      Générer attestation PDF
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
