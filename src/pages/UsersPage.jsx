import { useEffect, useState } from 'react';
import { Plus, Mail, Trash2, Ban, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { ROLE_LABELS, ROLE_OPTIONS } from '../utils/constants';
import { useDialog } from '../context/DialogContext';


const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'viewer',
  phone: '',
  sendCredentialsEmail: true,
  autoPassword: true,
};

export default function UsersPage() {
  const { alert, confirm } = useDialog();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/users').then(({ data }) => { setUsers(data.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    let password = form.password;
    if (form.autoPassword) {
      const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
      password = '';
      for (let i = 0; i < 10; i++) password += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!password) {
      await alert({ title: 'Mot de passe requis', message: 'Saisissez un mot de passe ou activez la génération automatique.', variant: 'warning' });
      return;
    }
    setSaving(true);
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password,
      role: form.role,
      phone: form.phone,
      sendCredentialsEmail: form.sendCredentialsEmail,
    };
    try {
      const { data } = await api.post('/auth/register', payload);
      setShowForm(false);
      setForm(emptyForm);
      load();
      if (data.emailSent) {
        await alert({
          title: 'Utilisateur créé',
          message: `Identifiants envoyés par email à ${form.email}.`,
          variant: 'success',
        });
      } else {
        await alert({
          title: 'Utilisateur créé',
          message: data.emailError || 'Compte créé mais l\'email n\'a pas pu être envoyé.',
          variant: 'warning',
        });
      }
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de créer l\'utilisateur',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      load();
    } catch (err) {
      await alert({ title: 'Erreur', message: 'Impossible de modifier le statut', variant: 'danger' });
    }
  };

  const handleDelete = async (user) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer l'utilisateur ${user.firstName} ${user.lastName} ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/users/${user._id}`);
      load();
    } catch (err) {
      await alert({ title: 'Erreur', message: 'Impossible de supprimer l\'utilisateur', variant: 'danger' });
    }
  };

  const columns = [
    { key: 'name', label: 'Nom', render: (r) => `${r.firstName} ${r.lastName}` },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
    { key: 'role', label: 'Rôle', render: (r) => ROLE_LABELS[r.role] || r.role },
    { key: 'isActive', label: 'Statut', render: (r) => (
      <span className={`px-2 py-1 text-xs rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {r.isActive ? 'Actif' : 'Bloqué'}
      </span>
    )},
    { key: 'actions', label: 'Actions', render: (r) => (
      <div className="flex items-center gap-2">
        <button onClick={() => toggleActive(r)} className="p-1 rounded text-gray-500 hover:bg-gray-100" title={r.isActive ? 'Bloquer' : 'Débloquer'}>
          {r.isActive ? <Ban className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
        </button>
        <button onClick={() => handleDelete(r)} className="p-1 rounded text-gray-500 hover:bg-red-100 hover:text-red-600" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>
      <DataTable columns={columns} data={users} loading={loading} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Créer un utilisateur">
        <form onSubmit={handleCreate} className="space-y-3">
          <input className="input-field" placeholder="Prénom" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="input-field" placeholder="Nom" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input type="email" className="input-field" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="tel" className="input-field" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4 text-nfc-red" /> Mot de passe & email
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoPassword}
                onChange={(e) => setForm({ ...form, autoPassword: e.target.checked, password: e.target.checked ? '' : form.password })}
                className="rounded text-nfc-red"
              />
              Générer un mot de passe automatiquement
            </label>
            {!form.autoPassword && (
              <input
                type="password"
                className="input-field"
                placeholder="Mot de passe"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.sendCredentialsEmail}
                onChange={(e) => setForm({ ...form, sendCredentialsEmail: e.target.checked })}
                className="rounded text-nfc-red"
              />
              Envoyer les identifiants par email
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
