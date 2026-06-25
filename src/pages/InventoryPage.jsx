import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Download, Package, ArrowDownToLine, ArrowUpFromLine, Pencil } from 'lucide-react';
import { downloadExport } from '../utils/exportDownload';
import { formatCurrency } from '../utils/constants';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useDialog } from '../context/DialogContext';

const emptyArticle = {
  sku: '', name: '', category: 'Extincteur', type: '', capacity: '', unit: 'U', location: '',
  initialStock: 0, stockQuantity: 0, minimumStockLevel: 5, averageCost: 0, defaultPrice: 0,
  supplierRef: '', isActive: true, observations: '',
};

const PAYMENT_METHODS = [
  { value: '', label: '—' },
  { value: 'cash', label: 'Espèces' },
  { value: 'transfer', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

const PAYMENT_STATUS = [
  { value: 'unpaid', label: 'Non payé' },
  { value: 'paid', label: 'Payé' },
  { value: 'partial', label: 'Partiel' },
];

const TYPE_LABEL = { in: 'Entrée', out: 'Sortie', adjustment: 'Ajustement' };

export default function InventoryPage() {
  const { alert } = useDialog();
  const { user } = useSelector((s) => s.auth);
  const canWrite = user?.role !== 'viewer' && user?.role !== 'technician';

  const [tab, setTab] = useState('articles');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showArticle, setShowArticle] = useState(false);
  const [article, setArticle] = useState(emptyArticle);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);

  const [movement, setMovement] = useState(null);

  const loadProducts = () => {
    setLoading(true);
    apiGet('/inventory', { params: { search } })
      .then(({ data }) => setProducts(data.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  };

  const loadMovements = () => {
    setLoading(true);
    apiGet('/inventory/movements')
      .then(({ data }) => setMovements(data.data || []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiGet('/suppliers', { params: { limit: 200 } }).then(({ data }) => setSuppliers(data.data || [])).catch(() => {});
    apiGet('/clients', { params: { limit: 200 } }).then(({ data }) => setClients(data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'articles') loadProducts();
    else loadMovements();
  }, [tab, search]);

  const openCreateArticle = () => { setEditingArticle(null); setArticle(emptyArticle); setShowArticle(true); };
  const openEditArticle = (p) => {
    setEditingArticle(p);
    setArticle({
      sku: p.sku || '', name: p.name || '', category: p.category || '', type: p.type || '', capacity: p.capacity || '',
      unit: p.unit || 'U', location: p.location || '', initialStock: p.initialStock || 0, stockQuantity: p.stockQuantity || 0,
      minimumStockLevel: p.minimumStockLevel || 0, averageCost: p.averageCost || 0, defaultPrice: p.defaultPrice || 0,
      supplierRef: p.supplierRef?._id || p.supplierRef || '', isActive: p.isActive !== false, observations: p.observations || '',
    });
    setShowArticle(true);
  };

  const saveArticle = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...article, supplierRef: article.supplierRef || undefined };
      if (editingArticle) await api.put(`/inventory/${editingArticle._id}`, payload);
      else await api.post('/inventory', payload);
      setShowArticle(false);
      loadProducts();
      await alert({ title: editingArticle ? 'Article mis à jour' : 'Article créé', message: 'Enregistré avec succès.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Impossible d\'enregistrer', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (type, product) => {
    setMovement({
      type, product: product?._id || '', date: new Date().toISOString().slice(0, 10),
      supplier: '', client: '', partnerName: '', projectSite: '', invoiceRef: '',
      quantity: 1, unitPrice: type === 'out' ? (product?.defaultPrice || 0) : (product?.averageCost || 0),
      vatRate: 20, paymentMethod: '', paymentStatus: 'unpaid', responsible: '', observation: '',
    });
  };

  const saveMovement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...movement,
        supplier: movement.supplier || undefined,
        client: movement.client || undefined,
      };
      await api.post('/inventory/movements', payload);
      setMovement(null);
      loadProducts();
      if (tab === 'movements') loadMovements();
      await alert({ title: 'Mouvement enregistré', message: 'Le stock a été mis à jour.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Échec du mouvement', variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const articleColumns = [
    { key: 'sku', label: 'Code Article', render: (r) => <span className="font-mono text-xs">{r.sku || '-'}</span> },
    { key: 'name', label: 'Désignation' },
    { key: 'category', label: 'Catégorie', render: (r) => r.category || '-' },
    { key: 'type', label: 'Type', render: (r) => r.type || '-' },
    { key: 'location', label: 'Emplacement', render: (r) => r.location || '-' },
    { key: 'stockQuantity', label: 'Stock', render: (r) => (
      <span className={r.stockQuantity <= r.minimumStockLevel ? 'text-nfc-red font-bold' : 'font-medium'}>
        {r.stockQuantity}{r.stockQuantity <= r.minimumStockLevel && ' ⚠'}
      </span>
    ) },
    { key: 'averageCost', label: 'Coût moyen', render: (r) => `${r.averageCost || 0} DH` },
    { key: 'defaultPrice', label: 'Prix vente', render: (r) => `${r.defaultPrice || 0} DH` },
    { key: 'stockValue', label: 'Valeur stock', render: (r) => formatCurrency(r.stockValue ?? (r.stockQuantity * (r.averageCost || 0))) },
    { key: 'isActive', label: 'Statut', render: (r) => <StatusBadge status={r.isActive ? 'active' : 'inactive'} /> },
    ...(canWrite ? [{ key: 'actions', label: '', render: (r) => (
      <div className="flex gap-1.5">
        <button type="button" title="Entrée" onClick={(e) => { e.stopPropagation(); openMovement('in', r); }} className="text-green-600 hover:text-green-700"><ArrowDownToLine className="w-4 h-4" /></button>
        <button type="button" title="Sortie" onClick={(e) => { e.stopPropagation(); openMovement('out', r); }} className="text-nfc-red hover:text-red-700"><ArrowUpFromLine className="w-4 h-4" /></button>
        <button type="button" title="Modifier" onClick={(e) => { e.stopPropagation(); openEditArticle(r); }} className="text-gray-500 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
      </div>
    ) }] : []),
  ];

  const movementColumns = [
    { key: 'movementNumber', label: 'N°', render: (r) => <span className="font-mono text-xs">{r.movementNumber}</span> },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('fr-MA') },
    { key: 'type', label: 'Type', render: (r) => (
      <span className={`badge ${r.type === 'in' ? 'bg-green-100 text-green-800' : r.type === 'out' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{TYPE_LABEL[r.type]}</span>
    ) },
    { key: 'sku', label: 'Article', render: (r) => `${r.sku || ''} — ${r.designation || ''}` },
    { key: 'partnerName', label: 'Partenaire', render: (r) => r.partnerName || r.supplier?.name || r.client?.companyName || '-' },
    { key: 'invoiceRef', label: 'N° Facture/BL', render: (r) => r.invoiceRef || '-' },
    { key: 'quantity', label: 'Qté' },
    { key: 'unitPrice', label: 'PU', render: (r) => `${r.unitPrice || 0} DH` },
    { key: 'amountTTC', label: 'Montant TTC', render: (r) => formatCurrency(r.amountTTC) },
    { key: 'paymentMethod', label: 'Paiement', render: (r) => (PAYMENT_METHODS.find((m) => m.value === r.paymentMethod)?.label || '-') },
    { key: 'paymentStatus', label: 'Statut', render: (r) => (PAYMENT_STATUS.find((m) => m.value === r.paymentStatus)?.label || '-') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-nfc-red" /> Inventaire
        </h1>
        <div className="flex gap-2">
          {canWrite && (
            <button onClick={() => downloadExport('inventory', 'inventory.xlsx')} className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Exporter
            </button>
          )}
          {canWrite && tab === 'articles' && (
            <button onClick={openCreateArticle} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Ajouter Article
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {[['articles', 'Articles & stock'], ['movements', 'Entrées / Sorties']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === k ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'articles' && (
        <input type="text" placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field max-w-sm" />
      )}

      <div className="overflow-x-auto">
        <DataTable
          columns={tab === 'articles' ? articleColumns : movementColumns}
          data={tab === 'articles' ? products : movements}
          loading={loading}
          onRowClick={tab === 'articles' && canWrite ? openEditArticle : undefined}
        />
      </div>

      {/* Article form */}
      <Modal open={showArticle} onClose={() => setShowArticle(false)} title={editingArticle ? `Modifier ${editingArticle.sku || 'article'}` : 'Ajouter un Article'} wide>
        <form onSubmit={saveArticle} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Code Article" value={article.sku} onChange={(v) => setArticle({ ...article, sku: v })} />
            <Field label="Désignation" required value={article.name} onChange={(v) => setArticle({ ...article, name: v })} />
            <Field label="Catégorie" required value={article.category} onChange={(v) => setArticle({ ...article, category: v })} />
            <Field label="Type" value={article.type} onChange={(v) => setArticle({ ...article, type: v })} />
            <Field label="Capacité" value={article.capacity} onChange={(v) => setArticle({ ...article, capacity: v })} />
            <Field label="Unité" value={article.unit} onChange={(v) => setArticle({ ...article, unit: v })} />
            <Field label="Emplacement" value={article.location} onChange={(v) => setArticle({ ...article, location: v })} />
            <div>
              <label className="text-sm font-medium">Fournisseur</label>
              <select className="input-field mt-1" value={article.supplierRef} onChange={(e) => setArticle({ ...article, supplierRef: e.target.value })}>
                <option value="">—</option>
                {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <Field label="Stock initial" type="number" value={article.initialStock} onChange={(v) => setArticle({ ...article, initialStock: Number(v) })} />
            <Field label="Stock actuel" type="number" value={article.stockQuantity} onChange={(v) => setArticle({ ...article, stockQuantity: Number(v) })} />
            <Field label="Stock minimum" type="number" value={article.minimumStockLevel} onChange={(v) => setArticle({ ...article, minimumStockLevel: Number(v) })} />
            <Field label="Coût moyen (DH)" type="number" value={article.averageCost} onChange={(v) => setArticle({ ...article, averageCost: Number(v) })} />
            <Field label="Prix vente (DH)" required type="number" value={article.defaultPrice} onChange={(v) => setArticle({ ...article, defaultPrice: Number(v) })} />
            <div>
              <label className="text-sm font-medium">Statut</label>
              <select className="input-field mt-1" value={article.isActive ? 'active' : 'inactive'} onChange={(e) => setArticle({ ...article, isActive: e.target.value === 'active' })}>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Observations</label>
            <textarea className="input-field mt-1" rows={2} value={article.observations} onChange={(e) => setArticle({ ...article, observations: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowArticle(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>

      {/* Movement form */}
      <Modal open={!!movement} onClose={() => setMovement(null)} title={movement ? `${TYPE_LABEL[movement.type]} de stock` : ''} wide>
        {movement && (
          <form onSubmit={saveMovement} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-1">Article <span className="text-nfc-red">*</span></label>
                <select className="input-field mt-1" required value={movement.product} onChange={(e) => setMovement({ ...movement, product: e.target.value })}>
                  <option value="">Sélectionner...</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.sku} — {p.name}</option>)}
                </select>
              </div>
              <Field label="Date" type="date" value={movement.date} onChange={(v) => setMovement({ ...movement, date: v })} />

              {movement.type === 'in' ? (
                <div>
                  <label className="text-sm font-medium">Fournisseur</label>
                  <select className="input-field mt-1" value={movement.supplier}
                    onChange={(e) => setMovement({ ...movement, supplier: e.target.value, partnerName: suppliers.find((s) => s._id === e.target.value)?.name || '' })}>
                    <option value="">—</option>
                    {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Client</label>
                  <select className="input-field mt-1" value={movement.client}
                    onChange={(e) => setMovement({ ...movement, client: e.target.value, partnerName: clients.find((c) => c._id === e.target.value)?.companyName || '' })}>
                    <option value="">—</option>
                    {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                  </select>
                </div>
              )}

              <Field label={movement.type === 'out' ? 'Projet / Site' : 'Partenaire (libre)'} value={movement.type === 'out' ? movement.projectSite : movement.partnerName}
                onChange={(v) => setMovement(movement.type === 'out' ? { ...movement, projectSite: v } : { ...movement, partnerName: v })} />
              <Field label={movement.type === 'in' ? 'N° facture fournisseur' : 'N° BL / Facture client'} value={movement.invoiceRef} onChange={(v) => setMovement({ ...movement, invoiceRef: v })} />
              <Field label="Quantité" required type="number" value={movement.quantity} onChange={(v) => setMovement({ ...movement, quantity: Number(v) })} />
              <Field label={movement.type === 'in' ? 'PU achat (DH)' : 'PU vente (DH)'} type="number" value={movement.unitPrice} onChange={(v) => setMovement({ ...movement, unitPrice: Number(v) })} />
              <Field label="TVA %" type="number" value={movement.vatRate} onChange={(v) => setMovement({ ...movement, vatRate: Number(v) })} />
              <div>
                <label className="text-sm font-medium">Mode paiement</label>
                <select className="input-field mt-1" value={movement.paymentMethod} onChange={(e) => setMovement({ ...movement, paymentMethod: e.target.value })}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Statut paiement</label>
                <select className="input-field mt-1" value={movement.paymentStatus} onChange={(e) => setMovement({ ...movement, paymentStatus: e.target.value })}>
                  {PAYMENT_STATUS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <Field label="Responsable" value={movement.responsible} onChange={(v) => setMovement({ ...movement, responsible: v })} />
            </div>
            <div>
              <label className="text-sm font-medium">Observation</label>
              <textarea className="input-field mt-1" rows={2} value={movement.observation} onChange={(e) => setMovement({ ...movement, observation: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setMovement(null)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Valider le mouvement'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text' }) {
  return (
    <div>
      <label className="text-sm font-medium flex items-center gap-1">
        {label}{required && <span className="text-nfc-red">*</span>}
      </label>
      <input type={type} className="input-field mt-1" required={required} value={value}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
