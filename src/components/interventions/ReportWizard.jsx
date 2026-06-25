import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, CheckCircle2, ClipboardCheck, Wrench, FileSpreadsheet } from 'lucide-react';
import api from '../../api/axios';
import SignaturePad from '../ui/SignaturePad';
import { useDialog } from '../../context/DialogContext';

const OK_NOK = ['', 'OK', 'NOK'];
const CONCLUSION = ['', 'Conforme', 'Non Conforme'];

// Column configs mirror the V14 / C14 / Q4 standard tables.
const STEPS = [
  {
    key: 'v14',
    code: 'V14',
    title: 'Vérification — Fiche de visite terrain',
    icon: ClipboardCheck,
    fields: [
      { key: 'dateVisite', label: 'Date visite', type: 'date', w: 'w-36' },
      { key: 'clientSite', label: 'Client/Site', type: 'text', w: 'w-44' },
      { key: 'technicien', label: 'Technicien', type: 'text', w: 'w-36' },
      { key: 'serial', label: 'N° série', type: 'text', w: 'w-28' },
      { key: 'extinguisherType', label: 'Type extincteur', type: 'text', w: 'w-40' },
      { key: 'constat', label: 'Constat terrain', type: 'text', w: 'w-52' },
      { key: 'nature', label: 'Nature intervention', type: 'text', w: 'w-44' },
      { key: 'actionRecommandee', label: 'Action recommandée', type: 'text', w: 'w-48' },
      { key: 'delai', label: 'Délai', type: 'text', w: 'w-28' },
      { key: 'observationClient', label: 'Observation client', type: 'text', w: 'w-48' },
      { key: 'conclusion', label: 'Conclusion', type: 'select', options: CONCLUSION, w: 'w-36' },
    ],
  },
  {
    key: 'c14',
    code: 'C14',
    title: 'Maintenance — Certificat de conformité',
    icon: Wrench,
    fields: [
      { key: 'serial', label: 'N° série', type: 'text', w: 'w-28' },
      { key: 'clientSite', label: 'Client/Site', type: 'text', w: 'w-44' },
      { key: 'extinguisherType', label: 'Type extincteur', type: 'text', w: 'w-40' },
      { key: 'nature', label: 'Nature intervention', type: 'text', w: 'w-44' },
      { key: 'travauxRealises', label: 'Travaux réalisés', type: 'text', w: 'w-56' },
      { key: 'pieceRemplacee', label: 'Pièce remplacée', type: 'text', w: 'w-40' },
      { key: 'essaiEtancheite', label: 'Essai étanchéité', type: 'select', options: OK_NOK, w: 'w-32' },
      { key: 'scellePose', label: 'Scellé posé', type: 'select', options: OK_NOK, w: 'w-28' },
      { key: 'etiquetteMAJ', label: 'Etiquette MAJ', type: 'select', options: OK_NOK, w: 'w-28' },
      { key: 'observation', label: 'Observation', type: 'text', w: 'w-48' },
      { key: 'conclusion', label: 'Conclusion', type: 'select', options: CONCLUSION, w: 'w-36' },
    ],
  },
  {
    key: 'q4',
    code: 'Q4',
    title: 'Compte rendu — Vérification périodique',
    icon: FileSpreadsheet,
    fields: [
      { key: 'serial', label: 'N° série', type: 'text', w: 'w-28' },
      { key: 'localisation', label: 'Localisation', type: 'text', w: 'w-44' },
      { key: 'extinguisherType', label: 'Type extincteur', type: 'text', w: 'w-40' },
      { key: 'derniereMaintenance', label: 'Dernière maintenance', type: 'date', w: 'w-36' },
      { key: 'prochaineEcheance', label: 'Prochaine échéance', type: 'date', w: 'w-36' },
      { key: 'pression', label: 'Pression', type: 'select', options: OK_NOK, w: 'w-24' },
      { key: 'goupille', label: 'Goupille', type: 'select', options: OK_NOK, w: 'w-24' },
      { key: 'scelle', label: 'Scellé', type: 'select', options: OK_NOK, w: 'w-24' },
      { key: 'signalisation', label: 'Signalisation', type: 'select', options: OK_NOK, w: 'w-24' },
      { key: 'accessibilite', label: 'Accessibilité', type: 'select', options: OK_NOK, w: 'w-24' },
      { key: 'etatGeneral', label: 'Etat général', type: 'select', options: OK_NOK, w: 'w-28' },
      { key: 'actionRecommandee', label: 'Action recommandée', type: 'text', w: 'w-48' },
      { key: 'observation', label: 'Observation', type: 'text', w: 'w-44' },
      { key: 'conclusion', label: 'Conclusion', type: 'select', options: CONCLUSION, w: 'w-36' },
    ],
  },
];

const emptyRow = (fields, defaults = {}) => {
  const row = {};
  fields.forEach((f) => { row[f.key] = ''; });
  return { ...row, ...defaults };
};

export default function ReportWizard({ intervention, onUpdated }) {
  const { alert } = useDialog();
  const reports = intervention.reports || {};
  const clientName = intervention.client?.companyName || '';
  const siteName = intervention.site?.name || intervention.client?.city || '';
  const techName = `${intervention.technician?.firstName || ''} ${intervention.technician?.lastName || ''}`.trim();
  const today = new Date().toISOString().slice(0, 10);

  const defaultsFor = (key) => {
    const base = { clientSite: `${clientName}${siteName ? ' / ' + siteName : ''}` };
    if (key === 'v14') return { ...base, technicien: techName, dateVisite: today };
    return base;
  };

  const initState = () => {
    const st = {};
    STEPS.forEach((step) => {
      const existing = reports[step.key]?.items;
      st[step.key] = {
        items: existing && existing.length
          ? existing.map((it) => ({ ...emptyRow(step.fields), ...normalizeDates(it, step.fields) }))
          : [emptyRow(step.fields, defaultsFor(step.key))],
        activity: reports[step.key]?.activity || intervention.client?.sector || '',
        riskLevel: reports[step.key]?.riskLevel || '',
      };
    });
    return st;
  };

  const [data, setData] = useState(initState);
  const startStep = Math.min(intervention.reportStep || 0, 2);
  const [current, setCurrent] = useState(startStep);
  const [signature, setSignature] = useState(intervention.signature || '');
  const [saving, setSaving] = useState(false);

  const step = STEPS[current];
  const stepData = data[step.key];

  const synthesis = useMemo(() => {
    const filled = stepData.items.filter((i) => i.conclusion);
    const conformes = filled.filter((i) => i.conclusion === 'Conforme').length;
    const nonConformes = filled.filter((i) => i.conclusion === 'Non Conforme').length;
    const total = filled.length;
    return {
      total,
      conformes,
      nonConformes,
      taux: total ? Math.round((conformes / total) * 100) : 0,
      conclusionGlobale: total === 0 ? '—' : nonConformes > 0 ? 'NON CONFORME' : 'CONFORME',
    };
  }, [stepData.items]);

  const setCell = (rowIdx, key, value) => {
    setData((prev) => {
      const items = prev[step.key].items.map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row));
      return { ...prev, [step.key]: { ...prev[step.key], items } };
    });
  };

  const setMeta = (key, value) => {
    setData((prev) => ({ ...prev, [step.key]: { ...prev[step.key], [key]: value } }));
  };

  const addRow = () => {
    setData((prev) => ({
      ...prev,
      [step.key]: { ...prev[step.key], items: [...prev[step.key].items, emptyRow(step.fields, defaultsFor(step.key))] },
    }));
  };

  const removeRow = (idx) => {
    setData((prev) => {
      const items = prev[step.key].items.filter((_, i) => i !== idx);
      return { ...prev, [step.key]: { ...prev[step.key], items: items.length ? items : [emptyRow(step.fields, defaultsFor(step.key))] } };
    });
  };

  const persist = async ({ finalize = false } = {}) => {
    setSaving(true);
    try {
      const payload = {
        step: step.key,
        data: {
          items: stepData.items,
          activity: stepData.activity,
          riskLevel: stepData.riskLevel,
          technicianName: techName,
          technicianSignature: finalize ? signature : undefined,
        },
        finalize,
        signature: finalize ? signature : undefined,
        signedBy: 'Technicien',
      };
      const { data: res } = await api.put(`/interventions/${intervention._id}/report-step`, payload);
      onUpdated?.(res.data);
      return true;
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Échec de l\'enregistrement', variant: 'danger' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const ok = await persist();
    if (ok && current < STEPS.length - 1) setCurrent(current + 1);
  };

  const handleFinalize = async () => {
    if (!signature) {
      await alert({ title: 'Signature requise', message: 'Veuillez signer avant de soumettre le rapport.', variant: 'danger' });
      return;
    }
    const ok = await persist({ finalize: true });
    if (ok) {
      await alert({ title: 'Rapport soumis', message: 'Les rapports V14 / C14 / Q4 ont été soumis pour approbation.', variant: 'success' });
      window.location.reload();
    }
  };

  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="font-semibold text-lg">Rapport d&apos;intervention — 3 étapes</h3>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = (intervention.reportStep || 0) > i || i < current;
          const active = i === current;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setCurrent(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                active ? 'bg-nfc-red text-white border-nfc-red'
                  : done ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20'
                  : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800'
              }`}
            >
              {done && !active ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.code}</span>
              <span className="hidden md:inline">— {i === 0 ? 'Vérification' : i === 1 ? 'Maintenance' : 'Compte rendu'}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-lg p-3">
        <p className="font-semibold text-sm mb-1">{step.code} — {step.title}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          <input
            className="input-field text-sm" placeholder="Activité / Projet"
            value={stepData.activity} onChange={(e) => setMeta('activity', e.target.value)}
          />
          <input
            className="input-field text-sm" placeholder="Niveau de risque (Faible / Moyen / Élevé)"
            value={stepData.riskLevel} onChange={(e) => setMeta('riskLevel', e.target.value)}
          />
        </div>

        {/* Editable table */}
        <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-900">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-nfc-red text-white">
                <th className="px-2 py-1.5 font-medium sticky left-0 bg-nfc-red">#</th>
                {step.fields.map((f) => (
                  <th key={f.key} className="px-2 py-1.5 font-medium whitespace-nowrap text-left">{f.label}</th>
                ))}
                <th className="px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {stepData.items.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-2 py-1 text-center text-gray-400 sticky left-0 bg-white dark:bg-gray-900">{idx + 1}</td>
                  {step.fields.map((f) => (
                    <td key={f.key} className="px-1 py-1">
                      {f.type === 'select' ? (
                        <select
                          className={`input-field text-xs py-1 ${f.w} ${row[f.key] === 'Non Conforme' || row[f.key] === 'NOK' ? 'text-nfc-red font-semibold' : row[f.key] === 'Conforme' || row[f.key] === 'OK' ? 'text-green-700 font-semibold' : ''}`}
                          value={row[f.key] || ''}
                          onChange={(e) => setCell(idx, f.key, e.target.value)}
                        >
                          {f.options.map((o) => <option key={o} value={o}>{o || '—'}</option>)}
                        </select>
                      ) : (
                        <input
                          type={f.type === 'date' ? 'date' : 'text'}
                          className={`input-field text-xs py-1 ${f.w}`}
                          value={row[f.key] || ''}
                          onChange={(e) => setCell(idx, f.key, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeRow(idx)} className="text-gray-400 hover:text-nfc-red">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addRow} className="btn-secondary text-xs flex items-center gap-1 mt-2">
          <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
        </button>

        {/* Live synthesis */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span>Total: <strong>{synthesis.total}</strong></span>
          <span className="text-green-700">Conformes: <strong>{synthesis.conformes}</strong></span>
          <span className="text-nfc-red">Non conformes: <strong>{synthesis.nonConformes}</strong></span>
          <span>Taux: <strong>{synthesis.taux}%</strong></span>
          <span>Conclusion: <strong className={synthesis.conclusionGlobale === 'NON CONFORME' ? 'text-nfc-red' : 'text-green-700'}>{synthesis.conclusionGlobale}</strong></span>
        </div>
      </div>

      {/* Final step: signature */}
      {current === STEPS.length - 1 && (
        <div>
          <p className="font-medium mb-2 text-sm">Signature du technicien</p>
          {signature ? (
            <div className="flex items-center gap-3">
              <img src={signature} alt="Signature" className="border rounded max-h-20 bg-white" />
              <button type="button" onClick={() => setSignature('')} className="text-xs text-nfc-red">Re-signer</button>
            </div>
          ) : (
            <SignaturePad onSave={(s) => setSignature(s)} />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button" disabled={current === 0 || saving}
          onClick={() => setCurrent(current - 1)}
          className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </button>

        <div className="flex gap-2">
          {current < STEPS.length - 1 ? (
            <button type="button" onClick={handleNext} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? 'Enregistrement...' : <>Enregistrer &amp; continuer <ChevronRight className="w-4 h-4" /></>}
            </button>
          ) : (
            <>
              <button type="button" onClick={() => persist()} disabled={saving} className="btn-secondary text-sm">
                {saving ? '...' : 'Enregistrer le brouillon'}
              </button>
              <button type="button" onClick={handleFinalize} disabled={saving} className="btn-primary text-sm bg-green-600 hover:bg-green-700 border-green-600">
                Soumettre pour approbation
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// HTML date inputs need yyyy-mm-dd strings.
function normalizeDates(item, fields) {
  const out = { ...item };
  fields.forEach((f) => {
    if (f.type === 'date' && out[f.key]) {
      const d = new Date(out[f.key]);
      if (!isNaN(d.getTime())) out[f.key] = d.toISOString().slice(0, 10);
    }
  });
  return out;
}
