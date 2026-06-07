import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Plus, FileText, Send } from 'lucide-react';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import SignaturePad from '../components/ui/SignaturePad';
import StatusBadge from '../components/ui/StatusBadge';
import { PendingRequestsPanel, MyRequestsList } from '../components/ui/RequestPanel';
import { formatDate } from '../utils/constants';
import { openPdf } from '../utils/exportDownload';
import { useDialog } from '../context/DialogContext';
import { isOwner, isClient, isTechnician } from '../utils/roles';

const INT_TYPES = ['maintenance', 'inspection', 'installation', 'repair', 'audit', 'emergency', 'hse'];

export default function InterventionsPage() {
  const { t } = useTranslation();
  const { alert, confirm } = useDialog();
  const { user } = useSelector((s) => s.auth);
  const owner = isOwner(user?.role);
  const clientUser = isClient(user?.role);
  const techUser = isTechnician(user?.role);

  const [interventions, setInterventions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [approveReq, setApproveReq] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    client: '', technician: '', type: 'maintenance', scheduledDate: '', description: '', status: 'planned',
  });
  const [requestForm, setRequestForm] = useState({
    site: '', type: 'maintenance', priority: 'normal', preferredDate: '', description: '',
  });
  const [approveForm, setApproveForm] = useState({ technician: '', scheduledDate: '', adminNote: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiGet('/interventions', { params: statusFilter ? { status: statusFilter } : {} });
      setInterventions(data.data || []);
    } catch {
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const { data } = await apiGet('/intervention-requests', { params: owner ? { status: 'pending' } : {} });
      setRequests(data.data || []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
      await loadRequests();
      if (cancelled) return;
      if (owner) {
        try {
          const [cRes, uRes] = await Promise.all([
            apiGet('/clients', { params: { limit: 100 } }),
            apiGet('/users', { params: { role: 'technician' } }),
          ]);
          if (!cancelled) {
            setClients(cRes.data.data || []);
            setTechnicians(uRes.data.data || []);
          }
        } catch {
          if (!cancelled) { setClients([]); setTechnicians([]); }
        }
      }
      if (clientUser && !cancelled) {
        try {
          const { data } = await apiGet('/clients');
          const c = data.data?.[0];
          if (c?._id) {
            const r = await apiGet('/sites', { params: { client: c._id } });
            if (!cancelled) setSites(r.data.data || []);
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [statusFilter, owner, clientUser]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/interventions', form);
    setShowForm(false);
    load();
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/intervention-requests', requestForm);
      setShowRequestForm(false);
      setRequestForm({ site: '', type: 'maintenance', priority: 'normal', preferredDate: '', description: '' });
      loadRequests();
      await alert({ title: 'Demande envoyée', message: data.message, variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const submitApprove = async () => {
    try {
      await api.put(`/intervention-requests/${approveReq._id}/approve`, approveForm);
      setApproveReq(null);
      loadRequests();
      load();
      await alert({ title: 'Intervention planifiée', message: 'Le client a été notifié.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const handleReject = async (req) => {
    const ok = await confirm({ title: 'Refuser', message: `Refuser ${req.reference} ?`, confirmText: 'Refuser', variant: 'danger' });
    if (!ok) return;
    await api.put(`/intervention-requests/${req._id}/reject`, {});
    loadRequests();
  };

  const generatePdf = async (id) => {
    const { data } = await api.post(`/interventions/${id}/report`);
    if (data.data.reportPdf) openPdf(data.data.reportPdf);
    load();
  };

  const saveSignature = async (dataUrl) => {
    await api.put(`/interventions/${detail._id}`, {
      signature: dataUrl,
      signedBy: clientUser ? 'Client' : 'Responsable',
      signedAt: new Date().toISOString(),
    });
    const res = await api.get(`/interventions/${detail._id}`);
    setDetail(res.data.data);
  };

  const updateStatus = async (status) => {
    await api.put(`/interventions/${detail._id}`, { status });
    const res = await api.get(`/interventions/${detail._id}`);
    setDetail(res.data.data);
    load();
  };

  const techAction = async (action) => {
    try {
      await api.put(`/interventions/${detail._id}/${action}`);
      const res = await api.get(`/interventions/${detail._id}`);
      setDetail(res.data.data);
      load();
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const submitFieldReport = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/interventions/${detail._id}/submit`, detail);
      const res = await api.get(`/interventions/${detail._id}`);
      setDetail(res.data.data);
      load();
      await alert({ title: 'Rapport soumis', message: 'Le rapport est en attente d\'approbation.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const approveFieldReport = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/interventions/${detail._id}/approve`, {
        adminSignature: detail.adminSignature,
        adminNote: detail.adminNote,
      });
      const res = await api.get(`/interventions/${detail._id}`);
      setDetail(res.data.data);
      load();
      await alert({ title: 'Rapport approuvé', message: 'Intervention clôturée.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message, variant: 'danger' });
    }
  };

  const columns = [
    { key: 'reference', label: 'Référence' },
    ...(owner ? [{ key: 'client', label: 'Client', render: (r) => (
      <div>
        <p>{r.client?.companyName}</p>
        {r.client?.customerId && <p className="text-xs text-gray-500 font-mono">{r.client.customerId}</p>}
      </div>
    ) }] : []),
    { key: 'type', label: 'Type', render: (r) => t(`interventions.types.${r.type}`) || r.type },
    ...(!clientUser ? [{ key: 'technician', label: 'Technicien', render: (r) => `${r.technician?.firstName || '—'} ${r.technician?.lastName || ''}` }] : []),
    { key: 'scheduledDate', label: 'Date', render: (r) => formatDate(r.scheduledDate) },
    { key: 'status', label: 'Statut', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', label: '', render: (r) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); generatePdf(r._id); }} className="text-nfc-red text-xs flex items-center gap-1">
          <FileText className="w-3 h-3" /> PDF
        </button>
      ),
    },
  ];

  const pageTitle = clientUser ? t('interventions.titleClient') : techUser ? t('interventions.titleTech') : t('interventions.title');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
        <div className="flex flex-wrap gap-2">
          {clientUser && (
            <button type="button" onClick={() => setShowRequestForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> {t('interventions.requestIntervention')}
            </button>
          )}
          {owner && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('interventions.addIntervention')}
            </button>
          )}
        </div>
      </div>

      {owner && (
        <PendingRequestsPanel
          title={t('interventions.pendingRequests')}
          requests={requests}
          onApprove={(req) => {
            setApproveReq(req);
            setApproveForm({
              technician: '',
              scheduledDate: req.preferredDate ? new Date(req.preferredDate).toISOString().slice(0, 16) : '',
              adminNote: '',
            });
          }}
          onReject={handleReject}
          renderDetails={(req) => (
            <>
              <p className="font-medium">{req.reference} — {req.client?.companyName}</p>
              <p className="text-gray-500">{req.type} {req.priority === 'urgent' && <span className="text-red-600 font-medium">URGENT</span>}</p>
              <p className="text-gray-600">{req.description}</p>
            </>
          )}
        />
      )}

      {clientUser && (
        <MyRequestsList
          title={t('interventions.myRequests')}
          requests={requests}
          renderLine={(req) => (
            <>
              <p className="font-medium">{req.reference}</p>
              <p className="text-gray-500 text-xs truncate">{req.description}</p>
            </>
          )}
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'planned', 'in_progress', 'completed', 'urgent'].map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {s ? t(`interventions.status.${s}`) : t('common.all')}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={interventions} loading={loading}
        onRowClick={async (r) => { const { data } = await api.get(`/interventions/${r._id}`); setDetail(data.data); }} />

      <Modal open={showRequestForm} onClose={() => setShowRequestForm(false)} title={t('interventions.requestIntervention')} wide>
        <form onSubmit={handleRequest} className="space-y-3">
          <p className="text-sm text-gray-500">{t('interventions.requestHint')}</p>
          <select className="input-field" value={requestForm.site} onChange={(e) => setRequestForm({ ...requestForm, site: e.target.value })}>
            <option value="">Site (optionnel)</option>
            {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="input-field" required value={requestForm.type} onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })}>
            {INT_TYPES.map((x) => <option key={x} value={x}>{t(`interventions.types.${x}`) || x}</option>)}
          </select>
          <select className="input-field" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}>
            <option value="normal">Priorité normale</option>
            <option value="urgent">Urgent</option>
          </select>
          <input type="datetime-local" className="input-field" value={requestForm.preferredDate}
            onChange={(e) => setRequestForm({ ...requestForm, preferredDate: e.target.value })} />
          <textarea className="input-field min-h-[100px]" required placeholder="Décrivez le besoin..."
            value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
          <button type="submit" className="btn-primary w-full">{t('interventions.submitRequest')}</button>
        </form>
      </Modal>

      {owner && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title={t('interventions.addIntervention')} wide>
          <form onSubmit={handleCreate} className="space-y-3">
            <select className="input-field" required value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
              <option value="">Client</option>
              {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select>
            <select className="input-field" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}>
              <option value="">Technicien (optionnel)</option>
              {technicians.map((u) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
            </select>
            <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {INT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input type="datetime-local" className="input-field" required value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <button type="submit" className="btn-primary w-full">Créer</button>
          </form>
        </Modal>
      )}

      <Modal open={!!approveReq} onClose={() => setApproveReq(null)} title={`Approuver ${approveReq?.reference}`}>
        <div className="space-y-3">
          <select className="input-field" value={approveForm.technician} onChange={(e) => setApproveForm({ ...approveForm, technician: e.target.value })}>
            <option value="">Assigner un technicien</option>
            {technicians.map((u) => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
          </select>
          <input type="datetime-local" className="input-field" value={approveForm.scheduledDate}
            onChange={(e) => setApproveForm({ ...approveForm, scheduledDate: e.target.value })} />
          <button type="button" onClick={submitApprove} className="btn-primary w-full">Planifier l&apos;intervention</button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.reference} wide>
        {detail && (
          <div className="space-y-4 text-sm">
            {!clientUser && <p><strong>Client:</strong> {detail.client?.companyName}</p>}
            <p><strong>Date:</strong> {formatDate(detail.scheduledDate)} | <StatusBadge status={detail.status} /></p>
            {detail.description && <p><strong>Description:</strong> {detail.description}</p>}
            
            {techUser && (detail.status === 'planned' || detail.status === 'pending') && (
              <div className="flex gap-2">
                <button type="button" onClick={() => techAction('accept')} className="btn-primary text-xs bg-green-600 hover:bg-green-700">Accepter</button>
                <button type="button" onClick={() => techAction('reject')} className="btn-secondary text-xs bg-red-100 text-red-600 border-red-200 hover:bg-red-200">Refuser</button>
              </div>
            )}

            {techUser && (detail.status === 'accepted' || detail.status === 'in_progress') && (
              <form onSubmit={submitFieldReport} className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-lg">Rapport de terrain</h3>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Constats et observations</label>
                  <textarea className="input-field" rows={3} required value={detail.findings || ''} onChange={(e) => setDetail({ ...detail, findings: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Recommandations</label>
                  <textarea className="input-field" rows={2} value={detail.recommendations || ''} onChange={(e) => setDetail({ ...detail, recommendations: e.target.value })} />
                </div>
                <div>
                  <p className="font-medium mb-2">Signature du Technicien</p>
                  {detail.signature ? <img src={detail.signature} alt="Signature" className="border rounded max-h-24" /> : <SignaturePad onSave={(s) => setDetail({ ...detail, signature: s })} />}
                </div>
                <button type="submit" className="btn-primary w-full" disabled={!detail.signature}>Soumettre le rapport pour approbation</button>
              </form>
            )}

            {owner && detail.status === 'awaiting_approval' && (
              <form onSubmit={approveFieldReport} className="space-y-4 border-t pt-4 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg">
                <h3 className="font-semibold text-lg text-yellow-800 dark:text-yellow-500">Approbation Administrateur</h3>
                <p><strong>Constats du technicien:</strong> {detail.findings}</p>
                <p><strong>Recommandations:</strong> {detail.recommendations}</p>
                {detail.signature && <img src={detail.signature} alt="Signature Tech" className="border rounded max-h-24 bg-white" />}
                
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Note de l'administrateur (interne)</label>
                  <textarea className="input-field" rows={2} value={detail.adminNote || ''} onChange={(e) => setDetail({ ...detail, adminNote: e.target.value })} />
                </div>
                <div>
                  <p className="font-medium mb-2">Signature de l'Administrateur</p>
                  {detail.adminSignature ? <img src={detail.adminSignature} alt="Admin Signature" className="border rounded max-h-24" /> : <SignaturePad onSave={(s) => setDetail({ ...detail, adminSignature: s })} />}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1 bg-green-600 hover:bg-green-700" disabled={!detail.adminSignature}>Approuver le rapport</button>
                </div>
              </form>
            )}

            {(detail.status === 'completed' || detail.status === 'awaiting_approval') && (
              <div className="space-y-4 mt-4 border-t pt-4">
                <h3 className="font-semibold">Résumé</h3>
                {detail.findings && <p><strong>Constats:</strong> {detail.findings}</p>}
                {detail.adminNote && owner && <p><strong>Note Admin:</strong> {detail.adminNote}</p>}
                <div className="flex gap-4">
                  {detail.signature && <div><p className="text-xs text-gray-500">Tech</p><img src={detail.signature} className="max-h-16" /></div>}
                  {detail.adminSignature && <div><p className="text-xs text-gray-500">Admin</p><img src={detail.adminSignature} className="max-h-16" /></div>}
                </div>
                <button type="button" onClick={() => generatePdf(detail._id)} className="btn-primary flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Rapport PDF
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
