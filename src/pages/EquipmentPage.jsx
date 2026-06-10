import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { QrCode, Plus, Download, Send, Check, X, Edit2, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/constants';
import { downloadExport } from '../utils/exportDownload';
import { useDialog } from '../context/DialogContext';
import { isOwner, isClient } from '../utils/roles';

const CATEGORIES = ['extinguisher', 'ria', 'smoke_detector', 'fire_alarm_panel', 'sprinkler', 'emergency_lighting', 'safety_signage', 'fire_door', 'hydrant', 'other'];

const emptyForm = {
  client: '',
  site: '',
  category: 'extinguisher',
  brand: '',
  model: '',
  equipmentNumber: '',
  serialNumber: '',
  product: '',
  salePrice: '',
  quantity: 1,
  location: '',
  installationDate: '',
  expirationDate: '',
};

const emptyRequest = {
  site: '',
  category: 'extinguisher',
  quantity: 1,
  location: '',
  brand: '',
  model: '',
  description: '',
};

export default function EquipmentPage() {
  const { t } = useTranslation();
  const { alert, confirm } = useDialog();
  const { user } = useSelector((s) => s.auth);
  const owner = isOwner(user?.role);
  const clientUser = isClient(user?.role);
  // technician uses add equipment via admin only

  const [equipments, setEquipments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [sites, setSites] = useState([]);
  const [products, setProducts] = useState([]);
  const [myClientId, setMyClientId] = useState('');
  const [loadingSites, setLoadingSites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [savingRequest, setSavingRequest] = useState(false);

  const loadEquipments = async () => {
    const params = {};
    if (filter === 'expired') params.expired = 'true';
    if (filter === 'upcoming') params.upcoming = 'true';
    setLoading(true);
    try {
      const { data } = await apiGet('/equipment', { params });
      setEquipments(data.data || []);
    } catch {
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    const params = owner ? { status: 'pending' } : {};
    try {
      const { data } = await apiGet('/equipment-requests', { params });
      setRequests(data.data || []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadEquipments();
      if (cancelled) return;
      await loadRequests();
      if (cancelled) return;
      if (owner) {
        try {
          const [{ data: clientsData }, { data: productsData }] = await Promise.all([
            apiGet('/clients', { params: { limit: 100 } }),
            apiGet('/inventory', { params: { limit: 100 } })
          ]);
          if (!cancelled) {
            setClients(clientsData.data || []);
            setProducts(productsData.data || []);
          }
        } catch {
          if (!cancelled) {
            setClients([]);
            setProducts([]);
          }
        }
      } else if (clientUser) {
        try {
          const { data } = await apiGet('/clients');
          const c = data.data?.[0];
          if (!cancelled && c) {
            setMyClientId(c._id);
            loadSitesFor(c._id);
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [filter, owner, clientUser]);

  const loadSitesFor = async (clientId) => {
    if (!clientId) { setSites([]); return; }
    setLoadingSites(true);
    try {
      const { data } = await api.get('/sites', { params: { client: clientId } });
      setSites(data.data || []);
    } finally {
      setLoadingSites(false);
    }
  };

  const onClientChange = (clientId) => {
    setForm((f) => ({ ...f, client: clientId, site: '' }));
    loadSitesFor(clientId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      site: form.site || undefined,
      product: form.product || undefined,
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      quantity: Number(form.quantity) || 1,
    };
    try {
      if (editingId) {
        await api.put(`/equipment/${editingId}`, payload);
      } else {
        const { data } = await api.post('/equipment', payload);
        if (data.qrImage) {
          setQrModal({
            qrImage: data.qrImage,
            qrCode: data.data?.qrCode,
            message: data.created > 1 ? `${data.created} équipements créés` : null,
          });
        }
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      setSites([]);
      loadEquipments();
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur lors de l\'enregistrement', variant: 'danger' });
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Supprimer',
      message: 'Voulez-vous vraiment supprimer cet équipement ?',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/equipment/${id}`);
      loadEquipments();
    } catch (err) {
      await alert({ title: 'Erreur', message: 'Impossible de supprimer l\'équipement', variant: 'danger' });
    }
  };

  const openEdit = (eq) => {
    setEditingId(eq._id);
    setForm({
      client: eq.client?._id || eq.client || '',
      site: eq.site?._id || eq.site || '',
      category: eq.category || 'extinguisher',
      brand: eq.brand || '',
      model: eq.model || '',
      equipmentNumber: eq.equipmentNumber || '',
      serialNumber: eq.serialNumber || '',
      product: eq.product?._id || eq.product || '',
      salePrice: eq.salePrice || '',
      quantity: 1,
      location: eq.location || '',
      installationDate: eq.installationDate ? new Date(eq.installationDate).toISOString().split('T')[0] : '',
      status: eq.status || 'operational',
    });
    if (eq.client) loadSitesFor(eq.client?._id || eq.client);
    setShowForm(true);
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setSavingRequest(true);
    try {
      const { data } = await api.post('/equipment-requests', {
        ...requestForm,
        site: requestForm.site || undefined,
        quantity: Number(requestForm.quantity) || 1,
      });
      setShowRequestForm(false);
      setRequestForm(emptyRequest);
      loadRequests();
      await alert({
        title: 'Demande envoyée',
        message: data.message || `Référence ${data.data?.reference}. L'administrateur a été notifié.`,
        variant: 'success',
      });
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible d\'envoyer la demande',
        variant: 'danger',
      });
    } finally {
      setSavingRequest(false);
    }
  };

  const handleApprove = async (req) => {
    const ok = await confirm({
      title: 'Approuver la demande',
      message: `Créer ${req.quantity} équipement(s) pour ${req.client?.companyName} ?`,
      confirmText: 'Approuver',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await api.put(`/equipment-requests/${req._id}/approve`, {});
      loadRequests();
      loadEquipments();
      await alert({ title: 'Approuvé', message: 'Équipement(s) créé(s).', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const handleReject = async (req) => {
    const ok = await confirm({
      title: 'Refuser la demande',
      message: `Refuser la demande ${req.reference} de ${req.client?.companyName} ?`,
      confirmText: 'Refuser',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await api.put(`/equipment-requests/${req._id}/reject`, { adminNote: 'Demande refusée par l\'administrateur' });
      loadRequests();
      await alert({ title: 'Refusé', message: 'Le client a été notifié.', variant: 'info' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const openForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSites([]);
    setShowForm(true);
  };

  const showQr = async (id) => {
    const { data } = await api.get(`/equipment/${id}/qr`);
    setQrModal(data.data);
  };

  const columns = [
    { key: 'category', label: 'Catégorie', render: (r) => t(`equipment.categories.${r.category}`) || r.category },
    { key: 'equipmentNumber', label: 'N° équip.', render: (r) => r.equipmentNumber || '-' },
    { key: 'serialNumber', label: 'N° série', render: (r) => r.serialNumber || '-' },
    ...(owner ? [{ key: 'client', label: 'Client', render: (r) => r.client?.companyName }] : []),
    { key: 'site', label: 'Site', render: (r) => r.site?.name || '-' },
    { key: 'location', label: 'Emplacement' },
    { key: 'qrCode', label: 'QR', render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); showQr(r._id); }} className="flex items-center gap-1 text-xs text-nfc-red font-mono">
        <QrCode className="w-3 h-3" />{r.qrCode}
      </button>
    )},
    { key: 'installationDate', label: "Date d'installation", render: (r) => formatDate(r.installationDate) },
    { key: 'nextInspection', label: 'Prochaine inspection', render: (r) => {
      if (r.nextInspection) return formatDate(r.nextInspection);
      if (r.installationDate) {
        const d = new Date(r.installationDate);
        d.setFullYear(d.getFullYear() + 1);
        return formatDate(d.toISOString());
      }
      return '-';
    }},
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    ...(owner ? [{ key: 'actions', label: '', render: (r) => (
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1 text-gray-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
        <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}] : []),
  ];

  const pendingForAdmin = requests.filter((r) => r.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{t('equipment.title')}</h1>
        <div className="flex flex-wrap gap-2">
          {owner && (
            <button type="button" onClick={() => downloadExport('equipment', 'equipements.xlsx')} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> {t('common.export')}
            </button>
          )}
          {clientUser ? (
            <button type="button" onClick={() => setShowRequestForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> {t('equipment.requestEquipment')}
            </button>
          ) : (
            <button type="button" onClick={openForm} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('equipment.addEquipment')}
            </button>
          )}
        </div>
      </div>

      {owner && pendingForAdmin.length > 0 && (
        <div className="card border-l-4 border-l-nfc-red">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Send className="w-5 h-5 text-nfc-red" />
            {t('equipment.pendingRequests')} ({pendingForAdmin.length})
          </h3>
          <div className="space-y-3">
            {pendingForAdmin.map((req) => (
              <div key={req._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
                <div>
                  <p className="font-medium">{req.reference} — {req.client?.companyName}</p>
                  <p className="text-gray-500">
                    {req.quantity}x {t(`equipment.categories.${req.category}`) || req.category}
                    {req.location ? ` · ${req.location}` : ''}
                    {req.site?.name ? ` · ${req.site.name}` : ''}
                  </p>
                  {req.description && <p className="text-gray-600 mt-1">{req.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(req.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => handleApprove(req)} className="btn-primary text-xs flex items-center gap-1 py-2">
                    <Check className="w-4 h-4" /> Approuver
                  </button>
                  <button type="button" onClick={() => handleReject(req)} className="btn-secondary text-xs flex items-center gap-1 py-2">
                    <X className="w-4 h-4" /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clientUser && requests.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">{t('equipment.myRequests')}</h3>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req._id} className="flex justify-between items-center text-sm border-b py-2">
                <div>
                  <p className="font-medium">{req.reference}</p>
                  <p className="text-gray-500">{req.quantity}x {t(`equipment.categories.${req.category}`) || req.category}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {['', 'expired', 'upcoming'].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {f === '' ? t('common.all') : f === 'expired' ? 'Expirés' : 'Inspections à venir'}
          </button>
        ))}
      </div>
      <DataTable columns={columns} data={equipments} loading={loading} />

      <Modal open={showRequestForm} onClose={() => setShowRequestForm(false)} title={t('equipment.requestEquipment')} wide>
        <form onSubmit={handleRequest} className="space-y-3">
          <p className="text-sm text-gray-500">{t('equipment.requestHint')}</p>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Site / Bâtiment</label>
            <select
              className="input-field"
              value={requestForm.site}
              onChange={(e) => setRequestForm({ ...requestForm, site: e.target.value })}
              disabled={loadingSites}
            >
              <option value="">{loadingSites ? 'Chargement...' : sites.length ? 'Sélectionner un site' : 'Aucun site enregistré'}</option>
              {sites.map((s) => (
                <option key={s._id} value={s._id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Type d&apos;équipement *</label>
            <select className="input-field" required value={requestForm.category} onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`equipment.categories.${c}`) || c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantité</label>
              <input type="number" min={1} max={100} className="input-field" value={requestForm.quantity}
                onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Emplacement</label>
              <input className="input-field" placeholder="Hall, Étage 2…" value={requestForm.location}
                onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="input-field" placeholder="Marque (optionnel)" value={requestForm.brand}
              onChange={(e) => setRequestForm({ ...requestForm, brand: e.target.value })} />
            <input className="input-field" placeholder="Modèle (optionnel)" value={requestForm.model}
              onChange={(e) => setRequestForm({ ...requestForm, model: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description / besoin</label>
            <textarea className="input-field min-h-[80px]" value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              placeholder="Précisez le besoin (norme, capacité, urgence…)" />
          </div>
          <button type="submit" disabled={savingRequest} className="btn-primary w-full flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> {savingRequest ? t('common.loading') : t('equipment.submitRequest')}
          </button>
        </form>
      </Modal>

      {!clientUser && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier l\'équipement' : t('equipment.addEquipment')} wide>
          <form onSubmit={handleSubmit} className="space-y-3">
            {owner && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Client *</label>
                <select className="input-field" required value={form.client} onChange={(e) => onClientChange(e.target.value)}>
                  <option value="">Sélectionner un client</option>
                  {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Site / Bâtiment</label>
              <select className="input-field" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} disabled={!form.client || loadingSites}>
                <option value="">{!form.client ? 'Choisir un client' : loadingSites ? 'Chargement...' : 'Site (optionnel)'}</option>
                {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.filter((c) => c !== 'other').map((c) => (
                  <option key={c} value={c}>{t(`equipment.categories.${c}`) || c}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Produit (Inventaire)</label>
                <select className="input-field" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                  <option value="">Lier à un produit...</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.stockQuantity} en stock)</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Prix de vente unitaire {form.product ? '*' : '(Optionnel sans produit)'}
                </label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Prix (DH)" 
                  required={!!form.product}
                  value={form.salePrice} 
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })} 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className="input-field" placeholder="Marque" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              <input className="input-field" placeholder="Modèle" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className="input-field" placeholder="N° équipement" value={form.equipmentNumber} onChange={(e) => setForm({ ...form, equipmentNumber: e.target.value })} />
              <input className="input-field" placeholder="N° série" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Date d'installation</label>
                <input type="date" className="input-field" value={form.installationDate} onChange={(e) => setForm({ ...form, installationDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Quantité</label>
                <input type="number" min={1} max={100} className="input-field" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <input className="input-field" placeholder="Emplacement" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <button type="submit" className="btn-primary w-full">{editingId ? 'Mettre à jour' : t('equipment.addEquipment')}</button>
          </form>
        </Modal>
      )}

      <Modal open={!!qrModal} onClose={() => setQrModal(null)} title={`QR Code ${qrModal?.qrCode || ''}`}>
        {qrModal?.message && <p className="text-sm text-green-600 mb-3">{qrModal.message}</p>}
        {qrModal?.qrImage && <img src={qrModal.qrImage} alt="QR" className="mx-auto w-48 h-48" />}
      </Modal>
    </div>
  );
}
