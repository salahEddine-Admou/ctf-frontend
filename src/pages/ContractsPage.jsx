import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Plus, Settings2, Send } from 'lucide-react';
import api from '../api/axios';
import { uploadFile } from '../api/upload';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { PendingRequestsPanel, MyRequestsList } from '../components/ui/RequestPanel';
import { formatCurrency, formatDate, CONTRACT_STATUS_OPTIONS } from '../utils/constants';
import { useDialog } from '../context/DialogContext';
import { isOwner, isClient } from '../utils/roles';

export default function ContractsPage() {
  const { t } = useTranslation();
  const { alert, confirm } = useDialog();
  const { user } = useSelector((s) => s.auth);
  const owner = isOwner(user?.role);
  const clientUser = isClient(user?.role);

  const [contracts, setContracts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [manageContract, setManageContract] = useState(null);
  const [approveReq, setApproveReq] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'active', notes: '' });
  const [approveForm, setApproveForm] = useState({ startDate: '', endDate: '', amount: '', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    client: '', title: '', startDate: '', endDate: '', amount: '', status: 'active',
    services: [{ name: 'Maintenance extincteurs', category: 'extinguisher', frequency: 'annual' }],
    file: null,
  });
  const [requestForm, setRequestForm] = useState({
    requestType: 'new', title: '', description: '', desiredStartDate: '', desiredEndDate: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = filter === 'expiring' ? { expiring: 'true' } : filter ? { status: filter } : {};
      const { data } = await api.get('/contracts', { params });
      setContracts(data.data);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = () => {
    api.get('/contract-requests', { params: owner ? { status: 'pending' } : {} })
      .then(({ data }) => setRequests(data.data || []));
  };

  useEffect(() => {
    if (owner) {
      api.get('/clients', { params: { limit: 100 } }).then(({ data }) => setClients(data.data)).catch(() => {});
    }
  }, [owner]);

  useEffect(() => {
    load();
    loadRequests();
  }, [filter]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/contract-requests', requestForm);
      setShowRequestForm(false);
      setRequestForm({ requestType: 'new', title: '', description: '', desiredStartDate: '', desiredEndDate: '' });
      loadRequests();
      await alert({ title: 'Demande envoyée', message: data.message, variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur', variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.put(`/contract-requests/${approveReq._id}/approve`, {
        ...approveForm,
        amount: Number(approveForm.amount) || 0,
        title: approveReq.title,
      });
      setApproveReq(null);
      loadRequests();
      load();
      await alert({ title: 'Contrat créé', message: 'Le client a été notifié.', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur', variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (req) => {
    const ok = await confirm({ title: 'Refuser', message: `Refuser ${req.reference} ?`, variant: 'danger', confirmText: 'Refuser' });
    if (!ok) return;
    await api.put(`/contract-requests/${req._id}/reject`, {});
    loadRequests();
  };

  const updateStatus = async (contractId, status, extra = {}) => {
    try {
      await api.put(`/contracts/${contractId}`, { status, ...extra });
      await load();
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur', variant: 'danger' });
    }
  };

  const handleStatusChange = async (contract, newStatus) => {
    if (!owner) return;
    if (newStatus === 'cancelled') {
      const ok = await confirm({ title: 'Annuler', message: `Annuler ${contract.contractNumber} ?`, variant: 'danger', confirmText: 'Annuler' });
      if (!ok) return;
    }
    await updateStatus(contract._id, newStatus);
  };

  const openManage = (contract) => {
    setManageContract(contract);
    setStatusForm({ status: contract.status, notes: contract.notes || '', file: null });
  };

  const saveManage = async () => {
    if (!owner || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let signedPdf = manageContract.signedPdf;
      if (statusForm.file) {
        const result = await uploadFile(statusForm.file, 'nfc-crm/contracts');
        signedPdf = result.url;
      }
      await api.put(`/contracts/${manageContract._id}`, { status: statusForm.status, notes: statusForm.notes, signedPdf });
      setManageContract(null);
      await load();
      await alert({ title: 'Succès', message: 'Contrat mis à jour', variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur', variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let signedPdf = '';
      if (form.file) {
        const result = await uploadFile(form.file, 'nfc-crm/contracts');
        signedPdf = result.url;
      }
      await api.post('/contracts', { ...form, amount: Number(form.amount), signedPdf });
      setShowForm(false);
      setForm({
        client: '', title: '', startDate: '', endDate: '', amount: '', status: 'active',
        services: [{ name: 'Maintenance extincteurs', category: 'extinguisher', frequency: 'annual' }],
        file: null,
      });
      await load();
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Erreur', variant: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: 'contractNumber', label: 'N° contrat' },
    ...(owner ? [{ key: 'client', label: 'Client', render: (r) => (
      <div>
        <p>{r.client?.companyName}</p>
        {r.client?.customerId && <p className="text-xs text-gray-500 font-mono">{r.client.customerId}</p>}
      </div>
    ) }] : []),
    { key: 'title', label: 'Titre' },
    { key: 'startDate', label: 'Début', render: (r) => formatDate(r.startDate) },
    { key: 'endDate', label: 'Fin', render: (r) => formatDate(r.endDate) },
    { key: 'amount', label: 'Montant', render: (r) => formatCurrency(r.amount) },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => owner ? (
        <select value={r.status} onClick={(e) => e.stopPropagation()} onChange={(e) => handleStatusChange(r, e.target.value)}
          className="text-xs rounded-lg border px-2 py-1 min-w-[100px]">
          {CONTRACT_STATUS_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      ) : <StatusBadge status={r.status} />,
    },
    ...(owner ? [{
      key: 'actions', label: '', render: (r) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); openManage(r); }} className="p-1.5 rounded-lg hover:bg-gray-100">
          <Settings2 className="w-4 h-4" />
        </button>
      ),
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{clientUser ? t('contracts.titleClient') : t('contracts.title')}</h1>
        <div className="flex flex-wrap gap-2">
          {clientUser && (
            <button type="button" onClick={() => setShowRequestForm(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> {t('contracts.requestContract')}
            </button>
          )}
          {owner && (
            <button type="button" onClick={() => setShowForm(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> {t('contracts.addContract')}
            </button>
          )}
        </div>
      </div>

      {owner && (
        <PendingRequestsPanel
          title={t('contracts.pendingRequests')}
          requests={requests}
          onApprove={(req) => {
            setApproveReq(req);
            setApproveForm({
              startDate: req.desiredStartDate ? new Date(req.desiredStartDate).toISOString().slice(0, 10) : '',
              endDate: req.desiredEndDate ? new Date(req.desiredEndDate).toISOString().slice(0, 10) : '',
              amount: '',
              status: 'active',
            });
          }}
          onReject={handleReject}
          renderDetails={(req) => (
            <>
              <p className="font-medium">{req.reference} — {req.client?.companyName}</p>
              <p className="text-gray-500">{req.title} ({req.requestType})</p>
              {req.description && <p className="text-gray-600">{req.description}</p>}
            </>
          )}
        />
      )}

      {clientUser && (
        <MyRequestsList
          title={t('contracts.myRequests')}
          requests={requests}
          renderLine={(req) => (
            <>
              <p className="font-medium">{req.reference} — {req.title}</p>
              <p className="text-gray-500 text-xs">{req.requestType}</p>
            </>
          )}
        />
      )}

      <div className="flex gap-2 flex-wrap">
        {[{ v: '', l: t('common.all') }, { v: 'active', l: 'Actifs' }, { v: 'expiring', l: 'Expiration proche' }, { v: 'expired', l: 'Expirés' }].map(({ v, l }) => (
          <button key={v} type="button" onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === v ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{l}</button>
        ))}
      </div>

      <DataTable columns={columns} data={contracts} loading={loading} onRowClick={clientUser || owner ? openManage : undefined} />

      <Modal open={showRequestForm} onClose={() => setShowRequestForm(false)} title={t('contracts.requestContract')} wide>
        <form onSubmit={handleRequest} className="space-y-3">
          <p className="text-sm text-gray-500">{t('contracts.requestHint')}</p>
          <select className="input-field" value={requestForm.requestType} onChange={(e) => setRequestForm({ ...requestForm, requestType: e.target.value })}>
            <option value="new">Nouveau contrat</option>
            <option value="renewal">Renouvellement</option>
            <option value="amendment">Modification</option>
          </select>
          <input className="input-field" required placeholder="Titre / objet du contrat" value={requestForm.title}
            onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} />
          <textarea className="input-field min-h-[80px]" placeholder="Détails, prestations souhaitées..."
            value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="date" lang="fr-FR" className="input-field" value={requestForm.desiredStartDate}
              onChange={(e) => setRequestForm({ ...requestForm, desiredStartDate: e.target.value })} />
            <input type="date" lang="fr-FR" className="input-field" value={requestForm.desiredEndDate}
              onChange={(e) => setRequestForm({ ...requestForm, desiredEndDate: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">{t('contracts.submitRequest')}</button>
        </form>
      </Modal>

      {owner && (
        <>
          <Modal open={showForm} onClose={() => setShowForm(false)} title={t('contracts.addContract')} wide>
            <form onSubmit={handleCreate} className="space-y-3">
              <select className="input-field" required value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
                <option value="">Client</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
              </select>
              <input className="input-field" required placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" lang="fr-FR" className="input-field" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                <input type="date" lang="fr-FR" className="input-field" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <input type="number" className="input-field" required placeholder="Montant MAD" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contrat signé (PDF)</label>
                <input 
                  type="file" 
                  accept=".pdf"
                  className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-nfc-red hover:file:bg-red-100" 
                  onChange={(e) => setForm({ ...form, file: e.target.files[0] })} 
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
                {isSubmitting ? 'Création...' : 'Créer'}
              </button>
            </form>
          </Modal>

          <Modal open={!!approveReq} onClose={() => setApproveReq(null)} title={`Créer contrat — ${approveReq?.reference}`} wide>
            <div className="space-y-3 text-sm">
              <p><strong>{approveReq?.title}</strong> — {approveReq?.client?.companyName}</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" lang="fr-FR" className="input-field" value={approveForm.startDate} onChange={(e) => setApproveForm({ ...approveForm, startDate: e.target.value })} />
                <input type="date" lang="fr-FR" className="input-field" value={approveForm.endDate} onChange={(e) => setApproveForm({ ...approveForm, endDate: e.target.value })} />
              </div>
              <input type="number" className="input-field" placeholder="Montant MAD" value={approveForm.amount} onChange={(e) => setApproveForm({ ...approveForm, amount: e.target.value })} />
              <button type="button" onClick={submitApprove} className="btn-primary w-full">Créer le contrat et notifier le client</button>
            </div>
          </Modal>
        </>
      )}

      <Modal open={!!manageContract} onClose={() => setManageContract(null)} title={manageContract?.contractNumber} wide>
        {manageContract && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Client</span><p className="font-medium">{manageContract.client?.companyName}</p></div>
              <div><span className="text-gray-500">Montant</span><p className="font-medium">{formatCurrency(manageContract.amount)}</p></div>
              <div><span className="text-gray-500">Début</span><p>{formatDate(manageContract.startDate)}</p></div>
              <div><span className="text-gray-500">Fin</span><p>{formatDate(manageContract.endDate)}</p></div>
            </div>
            <p className="font-medium">{manageContract.title}</p>
            <StatusBadge status={manageContract.status} />
            {manageContract.signedPdf && (
              <a href={manageContract.signedPdf} target="_blank" rel="noreferrer" className="text-nfc-red hover:underline block mb-2">Voir PDF signé</a>
            )}
            {owner && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contrat signé (PDF)</label>
                  <input 
                    type="file" 
                    accept=".pdf"
                    className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-nfc-red hover:file:bg-red-100" 
                    onChange={(e) => setStatusForm({ ...statusForm, file: e.target.files[0] })} 
                  />
                </div>
                <textarea className="input-field" rows={2} value={statusForm.notes} onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })} placeholder="Notes" />
                <button type="button" onClick={saveManage} disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
