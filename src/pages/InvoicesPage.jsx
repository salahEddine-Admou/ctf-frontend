import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Plus, Download, FileText, Send, Check, X, ShoppingCart, ReceiptText } from 'lucide-react';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../utils/constants';
import { downloadExport, openPdf } from '../utils/exportDownload';
import { isOwner, isClient } from '../utils/roles';

const emptyItem = () => ({ description: '', quantity: 1, unitPrice: 0 });

export default function InvoicesPage() {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const owner = isOwner(user?.role);
  const clientUser = isClient(user?.role);

  const [invoices, setInvoices] = useState([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    type: 'quotation', client: '', clientName: '', items: [emptyItem()], dueDate: '',
  });

  const [pdfLoading, setPdfLoading] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [convert, setConvert] = useState(null); // { id, items, dueDate, vatRate }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiGet('/invoices', { params: type ? { type } : {} });
      setInvoices(data.data || []);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled || !owner) return;
      try {
        const { data } = await apiGet('/clients', { params: { limit: 100 } });
        if (!cancelled) setClients(data.data || []);
      } catch {
        if (!cancelled) setClients([]);
      }
    })();
    return () => { cancelled = true; };
  }, [type, owner]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const isPassager = !form.client;
    if (!form.client && !form.clientName) {
      alert('Sélectionnez un client ou choisissez « Passager ».');
      return;
    }
    setIsSubmitting(true);
    try {
      const amountHT = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      const payload = {
        ...form,
        client: isPassager ? undefined : form.client,
        clientName: isPassager ? (form.clientName || 'Passager') : undefined,
        amountHT,
        vatRate: 20,
      };
      await api.post('/invoices', payload);
      setShowForm(false);
      setForm({ type: 'quotation', client: '', clientName: '', items: [emptyItem()], dueDate: '' });
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePdf = async (id) => {
    if (pdfLoading) return;
    setPdfLoading(id);
    try {
      const { data } = await api.post(`/invoices/${id}/pdf`);
      if (data.data?.pdfUrl) openPdf(data.data.pdfUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setPdfLoading(null);
    }
  };

  // Actions de workflow (send / accept / reject / order)
  const runAction = async (id, action) => {
    setActionLoading(true);
    try {
      const { data } = await api.put(`/invoices/${id}/${action}`);
      // Conserver le client populé de la vue détail
      setDetail((prev) => ({ ...prev, ...data.data, client: prev?.client ?? data.data.client }));
      await load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const openConvert = (inv) => {
    setConvert({
      id: inv._id,
      vatRate: inv.vatRate ?? 20,
      dueDate: '',
      items: (inv.items || []).map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  };

  const submitConvert = async (e) => {
    e.preventDefault();
    if (!convert) return;
    setActionLoading(true);
    try {
      await api.post(`/invoices/${convert.id}/convert`, {
        items: convert.items,
        dueDate: convert.dueDate || undefined,
        vatRate: convert.vatRate,
      });
      setConvert(null);
      setDetail(null);
      setType('');
      await load();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setActionLoading(false);
    }
  };

  const docLabel = (r) => (r.type === 'quotation'
    ? (r.quoteStatus === 'order' ? 'Bon de commande' : 'Devis')
    : 'Facture');

  const columns = [
    { key: 'number', label: 'Numéro' },
    { key: 'type', label: 'Type', render: (r) => docLabel(r) },
    ...(owner ? [{ key: 'client', label: 'Client', render: (r) => (
      <div>
        <p>{r.client?.companyName || r.clientName || '-'}</p>
        {r.client?.customerId
          ? <p className="text-xs text-gray-500 font-mono">{r.client.customerId}</p>
          : (!r.client && r.clientName) ? <p className="text-xs text-gray-400">Passager</p> : null}
      </div>
    ) }] : []),
    { key: 'amountTTC', label: 'Montant TTC', render: (r) => formatCurrency(r.amountTTC) },
    { key: 'dueDate', label: 'Échéance', render: (r) => formatDate(r.dueDate) },
    {
      key: 'status', label: 'Statut', render: (r) => (
        r.type === 'quotation'
          ? <StatusBadge status={r.quoteStatus || 'draft'} />
          : <StatusBadge status={r.paymentStatus} />
      ),
    },
    {
      key: 'pdf', label: '', render: (r) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); generatePdf(r._id); }}
          className="text-nfc-red text-xs flex items-center gap-1 disabled:opacity-50"
          disabled={pdfLoading === r._id}
        >
          {pdfLoading === r._id ? (
            <span className="w-3 h-3 border-2 border-nfc-red border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <FileText className="w-3 h-3" />
          )}
          {pdfLoading === r._id ? 'Génération...' : 'PDF'}
        </button>
      ),
    },
  ];

  // Étapes du workflow devis -> bon de commande -> facture
  const QUOTE_STEPS = [
    { key: 'sent', label: 'Devis envoyé' },
    { key: 'accepted', label: 'Accepté client' },
    { key: 'order', label: 'Bon de commande' },
    { key: 'invoiced', label: 'Facturé' },
  ];
  const stepIndex = (s) => QUOTE_STEPS.findIndex((x) => x.key === s);

  const renderActions = (inv) => {
    if (inv.type !== 'quotation') {
      return <p className="text-sm text-gray-500">Document de type facture.</p>;
    }
    const qs = inv.quoteStatus || 'draft';
    if (qs === 'rejected') return <p className="text-sm text-red-600">Devis refusé par le client.</p>;
    if (qs === 'invoiced') return <p className="text-sm text-green-600">Facture déjà générée depuis ce bon de commande.</p>;

    if (owner) {
      if (qs === 'draft') {
        return (
          <button type="button" disabled={actionLoading} onClick={() => runAction(inv._id, 'send')} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <Send className="w-4 h-4" /> Envoyer le devis au client
          </button>
        );
      }
      if (qs === 'sent') {
        return <p className="text-sm text-gray-500">En attente de l'acceptation du client...</p>;
      }
      if (qs === 'accepted') {
        return (
          <button type="button" disabled={actionLoading} onClick={() => runAction(inv._id, 'order')} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <ShoppingCart className="w-4 h-4" /> Convertir en bon de commande
          </button>
        );
      }
      if (qs === 'order') {
        return (
          <button type="button" disabled={actionLoading} onClick={() => openConvert(inv)} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <ReceiptText className="w-4 h-4" /> Générer la facture
          </button>
        );
      }
    }

    if (clientUser && qs === 'sent') {
      return (
        <div className="flex gap-2">
          <button type="button" disabled={actionLoading} onClick={() => runAction(inv._id, 'accept')} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
            <Check className="w-4 h-4" /> Accepter le devis
          </button>
          <button type="button" disabled={actionLoading} onClick={() => runAction(inv._id, 'reject')} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
            <X className="w-4 h-4" /> Refuser
          </button>
        </div>
      );
    }
    return <p className="text-sm text-gray-500">Aucune action disponible pour le moment.</p>;
  };

  const convertHT = convert ? convert.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{clientUser ? t('invoices.titleClient') : t('invoices.title')}</h1>
        <div className="flex flex-wrap gap-2">
          {owner && (
            <>
              <button type="button" onClick={() => downloadExport('invoices', 'factures.xlsx')} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> {t('common.export')}
              </button>
              <button type="button" onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> {t('invoices.add')}
              </button>
            </>
          )}
        </div>
      </div>

      {clientUser && (
        <p className="text-sm text-gray-500">{t('invoices.clientHint')}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {['', 'quotation', 'invoice'].map((f) => (
          <button key={f} type="button" onClick={() => setType(f)}
            className={`px-3 py-1.5 rounded-lg text-sm ${type === f ? 'bg-nfc-red text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
            {f === '' ? t('common.all') : f === 'quotation' ? 'Devis' : 'Factures'}
          </button>
        ))}
      </div>

      <DataTable columns={columns} data={invoices} loading={loading} onRowClick={(r) => setDetail(r)} />

      {/* Détail document + workflow */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `${docLabel(detail)} ${detail.number}` : ''} wide>
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={detail.type === 'quotation' ? (detail.quoteStatus || 'draft') : detail.paymentStatus} />
              {(detail.client?.companyName || detail.clientName) && <span className="text-sm text-gray-500">{detail.client?.companyName || `${detail.clientName} (passager)`}</span>}
              <span className="text-sm text-gray-500">Échéance : {formatDate(detail.dueDate)}</span>
            </div>

            {/* Frise du workflow devis */}
            {detail.type === 'quotation' && detail.quoteStatus !== 'rejected' && (
              <div className="flex items-center">
                {QUOTE_STEPS.map((s, idx) => {
                  const done = stepIndex(detail.quoteStatus) >= idx;
                  return (
                    <div key={s.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${done ? 'bg-nfc-red text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                          {idx + 1}
                        </div>
                        <span className="text-[10px] mt-1 text-center w-20">{s.label}</span>
                      </div>
                      {idx < QUOTE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 ${stepIndex(detail.quoteStatus) > idx ? 'bg-nfc-red' : 'bg-gray-200 dark:bg-gray-700'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Désignation</th>
                    <th className="px-3 py-2 text-right w-16">Qté</th>
                    <th className="px-3 py-2 text-right w-28">PU</th>
                    <th className="px-3 py-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(detail.items || []).map((i, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{i.description}</td>
                      <td className="px-3 py-2 text-right">{i.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(i.unitPrice)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(i.quantity * i.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between font-bold">
                <span>Total TTC</span>
                <span>{formatCurrency(detail.amountTTC)}</span>
              </div>
            </div>

            {detail.acceptedBy && (
              <p className="text-xs text-gray-500">Accepté par {detail.acceptedBy} le {formatDate(detail.acceptedAt)}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              {renderActions(detail)}
              <button
                type="button"
                onClick={() => generatePdf(detail._id)}
                disabled={pdfLoading === detail._id}
                className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <FileText className="w-4 h-4" /> {pdfLoading === detail._id ? 'Génération...' : 'Télécharger PDF'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Génération de facture depuis le bon de commande (désignations / prix modifiables) */}
      <Modal open={!!convert} onClose={() => setConvert(null)} title="Générer la facture" wide>
        {convert && (
          <form onSubmit={submitConvert} className="space-y-4">
            <p className="text-sm text-gray-500">Vous pouvez ajuster les désignations et les prix avant de générer la facture.</p>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm">Lignes de la facture</h3>
                <button type="button" onClick={() => setConvert({ ...convert, items: [...convert.items, emptyItem()] })} className="btn-secondary text-xs flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Ajouter une ligne
                </button>
              </div>
              <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
                {convert.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <input type="text" placeholder="Désignation" required className="input-field flex-1" value={item.description}
                      onChange={(e) => { const items = [...convert.items]; items[index] = { ...items[index], description: e.target.value }; setConvert({ ...convert, items }); }} />
                    <input type="number" min="1" placeholder="Qté" required className="input-field w-24" value={item.quantity}
                      onChange={(e) => { const items = [...convert.items]; items[index] = { ...items[index], quantity: Number(e.target.value) }; setConvert({ ...convert, items }); }} />
                    <input type="number" min="0" step="0.01" placeholder="PU" required className="input-field w-32" value={item.unitPrice}
                      onChange={(e) => { const items = [...convert.items]; items[index] = { ...items[index], unitPrice: Number(e.target.value) }; setConvert({ ...convert, items }); }} />
                    <button type="button" onClick={() => setConvert({ ...convert, items: convert.items.filter((_, i) => i !== index) })}
                      className="p-2 mt-1 text-gray-400 hover:text-nfc-red rounded" disabled={convert.items.length === 1}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-56 text-gray-600 dark:text-gray-400"><span>Sous-total HT :</span><span>{formatCurrency(convertHT)}</span></div>
                <div className="flex justify-between w-56 text-gray-600 dark:text-gray-400"><span>TVA ({convert.vatRate}%) :</span><span>{formatCurrency(convertHT * convert.vatRate / 100)}</span></div>
                <div className="flex justify-between w-56 font-bold text-lg mt-1"><span>Total TTC :</span><span>{formatCurrency(convertHT * (1 + convert.vatRate / 100))}</span></div>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Date d'échéance</label>
              <input type="date" lang="fr-FR" className="input-field" value={convert.dueDate} onChange={(e) => setConvert({ ...convert, dueDate: e.target.value })} />
            </div>
            <button type="submit" disabled={actionLoading} className="btn-primary w-full disabled:opacity-50">
              {actionLoading ? 'Génération...' : 'Générer la facture'}
            </button>
          </form>
        )}
      </Modal>

      {owner && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau devis / facture" wide>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="quotation">Devis</option>
                <option value="invoice">Facture</option>
              </select>
              <select
                className="input-field"
                value={form.clientName ? '__passager__' : form.client}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__passager__') setForm({ ...form, client: '', clientName: form.clientName || 'Passager' });
                  else setForm({ ...form, client: v, clientName: '' });
                }}
              >
                <option value="">Sélectionner un client...</option>
                <option value="__passager__">Passager (client occasionnel)</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
              </select>
              <input type="date" lang="fr-FR" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>

            {form.clientName ? (
              <div className="sm:max-w-xs">
                <label className="block text-sm mb-1">Nom du client passager</label>
                <input type="text" className="input-field" placeholder="Nom / société du passager" value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              </div>
            ) : null}

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm">Lignes de facturation</h3>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Ajouter une ligne
                </button>
              </div>

              <div className="p-3 space-y-3 max-h-[300px] overflow-y-auto">
                {form.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Description"
                        required
                        className="input-field"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].description = e.target.value;
                          setForm({ ...form, items: newItems });
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qté"
                        required
                        className="input-field"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].quantity = Number(e.target.value);
                          setForm({ ...form, items: newItems });
                        }}
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Prix Unitaire"
                        required
                        className="input-field"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const newItems = [...form.items];
                          newItems[index].unitPrice = Number(e.target.value);
                          setForm({ ...form, items: newItems });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = form.items.filter((_, i) => i !== index);
                        setForm({ ...form, items: newItems });
                      }}
                      className="p-2 mt-1 text-gray-400 hover:text-nfc-red hover:bg-red-50 rounded"
                      disabled={form.items.length === 1}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-end gap-1 text-sm">
                <div className="flex justify-between w-48 text-gray-600 dark:text-gray-400">
                  <span>Sous-total HT:</span>
                  <span>{formatCurrency(form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}</span>
                </div>
                <div className="flex justify-between w-48 text-gray-600 dark:text-gray-400">
                  <span>TVA (20%):</span>
                  <span>{formatCurrency(form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 0.2)}</span>
                </div>
                <div className="flex justify-between w-48 font-bold text-lg mt-1">
                  <span>Total TTC:</span>
                  <span>{formatCurrency(form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 1.2)}</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
              {isSubmitting ? 'Création en cours...' : 'Créer le document'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
