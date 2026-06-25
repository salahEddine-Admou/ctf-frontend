import { useEffect, useState } from 'react';
import { Plus, Truck, Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useDialog } from '../context/DialogContext';

const emptyForm = {
  name: '',
  iceIf: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  paymentTerms: '',
  status: 'active',
  observations: '',
};

const FIELDS = [
  { key: 'name', label: 'Nom fournisseur', required: true },
  { key: 'iceIf', label: 'ICE / IF' },
  { key: 'contact', label: 'Contact' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Adresse' },
  { key: 'paymentTerms', label: 'Conditions de paiement' },
];

export default function SuppliersPage() {
  const { alert, confirm } = useDialog();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/suppliers', { params: { search } })
      .then(({ data }) => setSuppliers(data.data || []))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '', iceIf: s.iceIf || '', contact: s.contact || '', phone: s.phone || '',
      email: s.email || '', address: s.address || '', paymentTerms: s.paymentTerms || '',
      status: s.status || 'active', observations: s.observations || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/suppliers/${editing._id}`, form);
      else await api.post('/suppliers', form);
      setShowForm(false);
      load();
      await alert({ title: editing ? 'Fournisseur mis à jour' : 'Fournisseur créé', message: 'Enregistré avec succès.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Impossible d\'enregistrer', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer le fournisseur "${s.name}" ?`, confirmText: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    await api.delete(`/suppliers/${s._id}`);
    load();
  };

  const columns = [
    { key: 'supplierCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.supplierCode || '-'}</span> },
    { key: 'name', label: 'Nom fournisseur' },
    { key: 'contact', label: 'Contact', render: (r) => r.contact || '-' },
    { key: 'phone', label: 'Téléphone', render: (r) => r.phone || '-' },
    { key: 'address', label: 'Adresse', render: (r) => r.address || '-' },
    { key: 'paymentTerms', label: 'Conditions', render: (r) => r.paymentTerms || '-' },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '', render: (r) => (
        <div className="flex gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-gray-500 hover:text-nfc-red"><Pencil className="w-4 h-4" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(r); }} className="text-gray-500 hover:text-nfc-red"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="w-6 h-6 text-nfc-red" /> Fournisseurs
        </h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter Fournisseur
        </button>
      </div>

      <input type="text" placeholder="Rechercher un fournisseur..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />

      <div className={showForm ? 'pointer-events-none' : undefined}>
        <DataTable columns={columns} data={suppliers} loading={loading} onRowClick={openEdit} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? `Modifier ${editing.supplierCode || ''}` : 'Ajouter un Fournisseur'} wide>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, required, type }) => (
              <div key={key}>
                <label className="text-sm font-medium flex items-center gap-1">
                  {label}{required && <span className="text-nfc-red">*</span>}
                </label>
                <input
                  type={type || 'text'} className="input-field mt-1" required={required}
                  value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium">Statut</label>
              <select className="input-field mt-1" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observations</label>
            <textarea className="input-field mt-1" rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
