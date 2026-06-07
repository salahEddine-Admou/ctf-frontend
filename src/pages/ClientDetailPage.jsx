import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, Plus, Eye, FileText, Trash2, Mail, Save } from 'lucide-react';
import DocumentPreview from '../components/ui/DocumentPreview';
import api from '../api/axios';
import { uploadFile } from '../api/upload';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/constants';
import { useDialog } from '../context/DialogContext';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const isViewer = user?.role === 'viewer';
  const { alert, confirm } = useDialog();
  const [data, setData] = useState(null);

  const [siteForm, setSiteForm] = useState({ name: '', address: '', city: '' });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [emailForm, setEmailForm] = useState('');
  const [resetPassword, setResetPassword] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [sendingCreds, setSendingCreds] = useState(false);

  const reload = () => api.get(`/clients/${id}`).then(({ data }) => setData(data.data));

  useEffect(() => { reload(); }, [id]);

  useEffect(() => {
    if (data?.client?.email !== undefined) {
      setEmailForm(data.client.email || '');
    }
  }, [data?.client?.email]);

  useEffect(() => {
    const docs = data?.client?.documents;
    if (docs?.length) {
      setPreviewDoc((current) => {
        if (current && docs.some((d) => d.url === current.url)) return current;
        return docs[docs.length - 1];
      });
    }
  }, [data?.client?.documents]);

  const uploadDoc = async (file) => {
    try {
      const uploaded = await uploadFile(file, 'nfc-crm/clients');
      await api.post(`/clients/${id}/documents`, { name: file.name, url: uploaded.url });
      const res = await api.get(`/clients/${id}`);
      setData(res.data.data);
      setPreviewDoc({ name: file.name, url: uploaded.url });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Échec du téléversement';
      await alert({ title: 'Erreur', message: msg, variant: 'danger' });
    }
  };

  const deleteDoc = async (doc) => {
    const ok = await confirm({
      title: 'Supprimer le document',
      message: `Voulez-vous supprimer « ${doc.name} » ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;
    if (!doc._id) {
      await alert({
        title: 'Erreur',
        message: 'Identifiant du document manquant. Rechargez la page.',
        variant: 'warning',
      });
      return;
    }
    try {
      await api.delete(`/clients/${id}/documents/${doc._id}`);
      const res = await api.get(`/clients/${id}`);
      setData(res.data.data);
      if (previewDoc?.url === doc.url) {
        const remaining = res.data.data.client.documents;
        setPreviewDoc(remaining?.length ? remaining[0] : null);
      }
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible de supprimer le document',
        variant: 'danger',
      });
    }
  };

  const addSite = async (e) => {
    e.preventDefault();
    await api.post('/sites', { ...siteForm, client: id });
    setSiteForm({ name: '', address: '', city: '' });
    reload();
  };

  const saveEmail = async () => {
    if (!emailForm.trim()) {
      await alert({ title: 'Email requis', message: 'Saisissez l\'adresse email du client.', variant: 'warning' });
      return;
    }
    setSavingEmail(true);
    try {
      await api.put(`/clients/${id}`, { email: emailForm.trim() });
      await reload();
      await alert({ title: 'Email enregistré', message: `Email mis à jour : ${emailForm.trim()}`, variant: 'success' });
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Impossible d\'enregistrer l\'email', variant: 'danger' });
    } finally {
      setSavingEmail(false);
    }
  };

  const sendCredentials = async () => {
    if (!emailForm.trim()) {
      await alert({ title: 'Email requis', message: 'Saisissez l\'email avant d\'envoyer les identifiants.', variant: 'warning' });
      return;
    }
    const ok = await confirm({
      title: 'Envoyer les identifiants',
      message: resetPassword
        ? `Créer ou réinitialiser l'accès portail et envoyer un email à ${emailForm.trim()} ?`
        : `Envoyer un email de bienvenue à ${emailForm.trim()} ? (aucun nouveau mot de passe si le compte existe déjà)`,
      confirmText: 'Envoyer',
      cancelText: 'Annuler',
      variant: 'primary',
    });
    if (!ok) return;
    setSendingCreds(true);
    try {
      const { data } = await api.post(`/clients/${id}/send-credentials`, {
        email: emailForm.trim(),
        createPortalAccess: true,
        resetPassword,
      });
      await reload();
      if (data.emailSent) {
        const detail = data.credentialsIncluded
          ? data.portalCreated
            ? 'Compte portail créé avec nouveau mot de passe.'
            : 'Mot de passe réinitialisé.'
          : 'Email envoyé sans identifiants.';
        await alert({
          title: data.credentialsIncluded ? 'Identifiants envoyés' : 'Email envoyé',
          message: `${detail} Vérifiez la boîte de ${emailForm.trim()} (objet : « Vos identifiants portail client »).`,
          variant: 'success',
        });
      } else {
        await alert({
          title: 'Échec email',
          message: data.emailError || 'Accès créé mais l\'email n\'a pas pu être envoyé (vérifiez SMTP).',
          variant: 'warning',
        });
      }
    } catch (err) {
      await alert({
        title: 'Erreur',
        message: err.response?.data?.message || 'Impossible d\'envoyer les identifiants',
        variant: 'danger',
      });
    } finally {
      setSendingCreds(false);
    }
  };

  if (!data) return <div className="text-center py-20">Chargement...</div>;
  const { client, sites, contracts, equipments, interventions } = data;

  return (
    <div className="space-y-6">
      <Link to={isViewer ? '/' : '/clients'} className="text-nfc-red text-sm hover:underline">
        {isViewer ? '← Tableau de bord' : '← Retour aux clients'}
      </Link>
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.companyName}</h1>
              {client.customerId && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-mono rounded-md border border-gray-200 dark:border-gray-700">
                  {client.customerId}
                </span>
              )}
            </div>
            <p className="text-gray-500">ICE: {client.ice} | {client.city}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
          <div><span className="text-gray-500">Contact</span><p className="font-medium">{client.contactPerson}</p></div>
          <div><span className="text-gray-500">Téléphone</span><p className="font-medium">{client.phone}</p></div>
          <div><span className="text-gray-500">Secteur</span><p className="font-medium">{client.sector || '—'}</p></div>
        </div>

        {!isViewer ? (
          <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-nfc-red" /> Accès portail & email
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Pour un client créé sans email : ajoutez son adresse puis envoyez ses identifiants de connexion.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                className="input-field flex-1"
                placeholder="contact@entreprise.ma"
                value={emailForm}
                onChange={(e) => setEmailForm(e.target.value)}
              />
              <button type="button" onClick={saveEmail} disabled={savingEmail} className="btn-secondary flex items-center justify-center gap-1 shrink-0">
                <Save className="w-4 h-4" /> {savingEmail ? '...' : 'Enregistrer'}
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetPassword}
                onChange={(e) => setResetPassword(e.target.checked)}
                className="rounded text-nfc-red"
              />
              Créer ou réinitialiser le mot de passe portail avant l&apos;envoi
            </label>
            <button
              type="button"
              onClick={sendCredentials}
              disabled={sendingCreds}
              className="btn-primary mt-3 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {sendingCreds ? 'Envoi...' : 'Créer accès & envoyer identifiants'}
            </button>
          </div>
        ) : (
          <div className="mt-6 text-sm">
            <span className="text-gray-500">Email</span>
            <p className="font-medium">{client.email || '—'}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4">Sites / Bâtiments ({sites?.length})</h3>
          {sites?.map((s) => (
            <div key={s._id} className="border-b py-2 text-sm">
              <p className="font-medium">{s.name}</p>
              <p className="text-gray-500">{s.address}, {s.city}</p>
            </div>
          ))}
          {!isViewer && (
            <form onSubmit={addSite} className="mt-4 space-y-2">
              <input className="input-field text-sm" placeholder="Nom du site" required value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} />
              <input className="input-field text-sm" placeholder="Adresse" value={siteForm.address} onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })} />
              <button type="submit" className="btn-secondary text-sm flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter site</button>
            </form>
          )}
        </div>
        <div className="card lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Documents ({client.documents?.length || 0})</h3>
            {!isViewer && (
              <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1">
                <Upload className="w-4 h-4" /> Upload
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => e.target.files[0] && uploadDoc(e.target.files[0])} />
              </label>
            )}
          </div>

          {client.documents?.length > 0 ? (
            <>
              <ul className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg divide-y dark:divide-gray-700">
                {client.documents.map((d, i) => (
                  <li key={d._id || i} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(d)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                        previewDoc?.url === d.url
                          ? 'bg-red-50 dark:bg-red-900/20 text-nfc-red font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate flex-1">{d.name}</span>
                      <Eye className={`w-4 h-4 shrink-0 ${previewDoc?.url === d.url ? 'text-nfc-red' : 'text-gray-400'}`} />
                    </button>
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => deleteDoc(d)}
                        className="p-2 mr-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <DocumentPreview document={previewDoc} />
            </>
          ) : (
            <DocumentPreview document={null} />
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Contrats ({contracts?.length})</h3>
          {contracts?.map((c) => (
            <div key={c._id} className="border-b py-2 text-sm flex justify-between">
              <div>
                <p className="font-medium">{c.contractNumber}</p>
                <p className="text-gray-500">{c.title}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Équipements ({equipments?.length})</h3>
          {equipments?.map((e) => (
            <div key={e._id} className="border-b py-2 text-sm flex justify-between">
              <div>
                <p className="font-medium">{e.category} - {e.serialNumber}</p>
                <p className="text-gray-500">{e.location}</p>
              </div>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold mb-4">Interventions récentes</h3>
          {interventions?.map((i) => (
            <div key={i._id} className="border-b py-2 text-sm flex justify-between">
              <div>
                <p className="font-medium">{i.reference}</p>
                <p className="text-gray-500">{i.type} - {formatDate(i.scheduledDate)}</p>
              </div>
              <StatusBadge status={i.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
