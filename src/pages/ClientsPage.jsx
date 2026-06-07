import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Mail } from 'lucide-react';
import { downloadExport } from '../utils/exportDownload';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useDialog } from '../context/DialogContext';

const emptyForm = {
  companyName: '',
  ice: '',
  contactPerson: '',
  phone: '',
  email: '',
  city: '',
  sector: '',
  status: 'active',
  createPortalAccess: true,
  sendWelcomeEmail: true,
};

export default function ClientsPage() {
  const { t } = useTranslation();
  const { alert } = useDialog();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/clients', { params: { search } })
      .then(({ data }) => setClients(data.data || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  useEffect(() => {
    if (user?.role === 'viewer') {
      apiGet('/clients')
        .then(({ data }) => {
          const client = data.data?.[0];
          if (client?._id) navigate(`/clients/${client._id}`, { replace: true });
        })
        .catch(() => {});
    }
  }, [user?.role, navigate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email?.trim()) {
      await alert({ title: 'Email requis', message: 'L\'email est obligatoire pour envoyer les identifiants au client.', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/clients', form);
      setShowForm(false);
      setForm(emptyForm);
      load();
      if (data.emailSent) {
        await alert({
          title: 'Client créé',
          message: data.credentialsIncluded
            ? `Email avec identifiants (email + mot de passe) envoyé à ${form.email}.`
            : `Email de bienvenue envoyé à ${form.email} (sans identifiants — cochez « Créer un accès portail »).`,
          variant: 'success',
        });
      } else {
        await alert({
          title: 'Client créé',
          message: data.emailError || data.warning || 'Client enregistré mais l\'email n\'a pas pu être envoyé.',
          variant: 'warning',
        });
      }
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de créer le client',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'companyName', required: true },
    { key: 'ice' },
    { key: 'contactPerson', labelKey: 'contact', required: true },
    { key: 'phone', required: true, type: 'tel' },
    { key: 'email', required: true, type: 'email' },
    { key: 'city' },
    { key: 'sector' },
  ];

  const columns = [
    { key: 'customerId', label: 'ID Client', render: (r) => r.customerId || '-' },
    { key: 'companyName', label: t('clients.companyName') },
    { key: 'ice', label: t('clients.ice') },
    { key: 'contactPerson', label: t('clients.contact') },
    { key: 'email', label: t('clients.email'), render: (r) => r.email || '-' },
    { key: 'phone', label: t('clients.phone') },
    { key: 'city', label: t('clients.city') },
    { key: 'status', label: t('clients.status'), render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{user?.role === 'viewer' ? t('nav.myCompany') : t('clients.title')}</h1>
        <div className="flex gap-2">
          {user?.role !== 'viewer' && (
          <button onClick={() => downloadExport('clients', 'clients.xlsx')} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> {t('common.export')}
          </button>
          )}
          {user?.role !== 'viewer' && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t('clients.add')}
            </button>
          )}
        </div>
      </div>
      <input type="text" placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />
      <div className={showForm ? 'pointer-events-none' : undefined}>
        <DataTable columns={columns} data={clients} loading={loading} onRowClick={(r) => navigate(`/clients/${r._id}`)} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('clients.add')} wide>
        <form onSubmit={handleCreate} className="space-y-3">
          {fields.map(({ key, labelKey, required, type }) => {
            const inputId = `client-form-${key}`;
            return (
              <div key={key}>
                <label htmlFor={inputId} className="text-sm font-medium flex items-center gap-1">
                  {t(`clients.${labelKey || key}`) || key}
                  {required && <span className="text-nfc-red">*</span>}
                </label>
                <input
                  id={inputId}
                  name={key}
                  type={type || 'text'}
                  className="input-field mt-1"
                  required={required}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={key === 'email' ? 'contact@entreprise.ma' : ''}
                  autoComplete={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'off'}
                />
              </div>
            );
          })}

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-nfc-red" /> Envoi par email
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendWelcomeEmail}
                onChange={(e) => setForm({ ...form, sendWelcomeEmail: e.target.checked })}
                onClick={(e) => e.stopPropagation()}
                className="rounded text-nfc-red"
              />
              Envoyer un email de bienvenue au client
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.createPortalAccess}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    createPortalAccess: checked,
                    sendWelcomeEmail: checked ? true : form.sendWelcomeEmail,
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                className="rounded text-nfc-red"
              />
              Créer un accès portail (viewer) et envoyer identifiants par email
            </label>
            <p className="text-xs text-gray-500">
              Obligatoire pour recevoir email + mot de passe dans le message. Si décoché, seul un message de bienvenue est envoyé.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
