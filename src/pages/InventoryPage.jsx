import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Package } from 'lucide-react';
import { downloadExport } from '../utils/exportDownload';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useDialog } from '../context/DialogContext';

const emptyForm = {
  name: '',
  sku: '',
  category: 'extinguisher',
  description: '',
  brand: '',
  model: '',
  defaultPrice: 0,
  stockQuantity: 0,
  minimumStockLevel: 5,
  isActive: true,
};

export default function InventoryPage() {
  const { t } = useTranslation();
  const { alert } = useDialog();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet('/inventory', { params: { search } })
      .then(({ data }) => setProducts(data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/inventory', form);
      setShowForm(false);
      setForm(emptyForm);
      load();
      await alert({
        title: 'Produit créé',
        message: 'Le produit a été ajouté à l\'inventaire avec succès.',
        variant: 'success',
      });
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de créer le produit',
        variant: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Nom du produit', required: true },
    { key: 'sku', label: 'SKU / Référence' },
    { key: 'category', label: 'Catégorie', required: true },
    { key: 'brand', label: 'Marque' },
    { key: 'model', label: 'Modèle' },
    { key: 'defaultPrice', label: 'Prix par défaut (DH)', required: true, type: 'number' },
    { key: 'stockQuantity', label: 'Quantité en stock', required: true, type: 'number' },
    { key: 'minimumStockLevel', label: 'Seuil d\'alerte stock', type: 'number' },
  ];

  const columns = [
    { key: 'name', label: 'Nom du produit' },
    { key: 'sku', label: 'SKU', render: (r) => r.sku || '-' },
    { key: 'category', label: 'Catégorie' },
    { key: 'stockQuantity', label: 'En stock', render: (r) => (
      <span className={r.stockQuantity <= r.minimumStockLevel ? 'text-red-500 font-bold' : ''}>
        {r.stockQuantity}
      </span>
    )},
    { key: 'defaultPrice', label: 'Prix (DH)', render: (r) => `${r.defaultPrice} DH` },
    { key: 'isActive', label: 'Statut', render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-nfc-red" />
          Gestion des Stocks
        </h1>
        <div className="flex gap-2">
          {user?.role !== 'viewer' && (
          <button onClick={() => downloadExport('inventory', 'inventory.xlsx')} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Exporter
          </button>
          )}
          {user?.role !== 'viewer' && (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter Produit
            </button>
          )}
        </div>
      </div>
      <input type="text" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />
      <div className={showForm ? 'pointer-events-none' : undefined}>
        <DataTable columns={columns} data={products} loading={loading} />
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Ajouter un Produit" wide>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(({ key, label, required, type }) => {
              const inputId = `product-form-${key}`;
              return (
                <div key={key}>
                  <label htmlFor={inputId} className="text-sm font-medium flex items-center gap-1">
                    {label}
                    {required && <span className="text-nfc-red">*</span>}
                  </label>
                  {key === 'category' ? (
                    <select
                      id={inputId}
                      className="input-field mt-1"
                      required={required}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    >
                      <option value="extinguisher">Extincteur</option>
                      <option value="ria">RIA</option>
                      <option value="smoke_detector">Détecteur de fumée</option>
                      <option value="fire_alarm_panel">Centrale incendie</option>
                      <option value="sprinkler">Sprinkler</option>
                      <option value="emergency_lighting">Éclairage de sécurité</option>
                      <option value="safety_signage">Signalisation</option>
                      <option value="fire_door">Porte coupe-feu</option>
                      <option value="hydrant">Poteau d'incendie</option>
                      <option value="other">Autre</option>
                    </select>
                  ) : (
                    <input
                      id={inputId}
                      name={key}
                      type={type || 'text'}
                      className="input-field mt-1"
                      required={required}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Création...' : 'Créer Produit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
