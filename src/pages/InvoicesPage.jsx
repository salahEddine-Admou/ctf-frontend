import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Plus, Download, FileText } from 'lucide-react';
import api from '../api/axios';
import { apiGet } from '../api/safeApi';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../utils/constants';
import { downloadExport, openPdf } from '../utils/exportDownload';
import { isOwner, isClient } from '../utils/roles';

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
    type: 'quotation', client: '', items: [{ description: '', quantity: 1, unitPrice: 0 }], dueDate: '',
  });

  const [pdfLoading, setPdfLoading] = useState(null);

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
    setIsSubmitting(true);
    try {
      const amountHT = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      await api.post('/invoices', { ...form, amountHT, vatRate: 20 });
      setShowForm(false);
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

  const columns = [
    { key: 'number', label: 'Numéro' },
    { key: 'type', label: 'Type', render: (r) => (r.type === 'quotation' ? 'Devis' : 'Facture') },
    ...(owner ? [{ key: 'client', label: 'Client', render: (r) => (
      <div>
        <p>{r.client?.companyName}</p>
        {r.client?.customerId && <p className="text-xs text-gray-500 font-mono">{r.client.customerId}</p>}
      </div>
    ) }] : []),
    { key: 'amountTTC', label: 'Montant TTC', render: (r) => formatCurrency(r.amountTTC) },
    { key: 'dueDate', label: 'Échéance', render: (r) => formatDate(r.dueDate) },
    { key: 'paymentStatus', label: 'Paiement', render: (r) => <StatusBadge status={r.paymentStatus} /> },
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

      <DataTable columns={columns} data={invoices} loading={loading} />

      {owner && (
        <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau devis / facture" wide>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="quotation">Devis</option>
                <option value="invoice">Facture</option>
              </select>
              <select className="input-field" required value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })}>
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
              </select>
              <input type="date" className="input-field" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-sm">Lignes de facturation</h3>
                <button 
                  type="button" 
                  onClick={() => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unitPrice: 0 }] })}
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
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
