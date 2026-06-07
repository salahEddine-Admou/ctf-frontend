import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { QrCode, Camera, CheckCircle, Play } from 'lucide-react';
import api from '../api/axios';
import { uploadFile } from '../api/upload';
import { addToQueue, getQueue, syncQueue } from '../utils/offlineQueue';
import SignaturePad from '../components/ui/SignaturePad';
import StatusBadge from '../components/ui/StatusBadge';
import { formatDate } from '../utils/constants';

export default function TechnicianPage() {
  const { user } = useSelector((s) => s.auth);
  const [interventions, setInterventions] = useState([]);
  const [qrInput, setQrInput] = useState('');
  const [scanned, setScanned] = useState(null);
  const [pending, setPending] = useState(0);
  const [signId, setSignId] = useState(null);
  const [techStats, setTechStats] = useState(null);

  const load = () => {
    api.get('/interventions', { params: { technician: user?._id, limit: 20 } })
      .then(({ data }) => setInterventions(data.data));
    api.get(`/users/${user?._id}`)
      .then(({ data }) => setTechStats(data.data?.stats));
  };

  useEffect(() => {
    if (user) load();
    setPending(getQueue().length);
    const sync = async () => {
      if (navigator.onLine && getQueue().length) {
        const r = await syncQueue(api);
        if (r.synced) load();
        setPending(getQueue().length);
      }
    };
    sync();
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, [user]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/interventions/${id}`, { status });
      load();
    } catch {
      addToQueue({ method: 'PUT', url: `/interventions/${id}`, data: { status } });
      setPending(getQueue().length);
    }
  };

  const saveSignature = async (dataUrl) => {
    try {
      await api.put(`/interventions/${signId}`, { signature: dataUrl, signedBy: 'Client', signedAt: new Date().toISOString() });
      setSignId(null);
      load();
    } catch {
      addToQueue({ method: 'PUT', url: `/interventions/${signId}`, data: { signature: dataUrl, signedBy: 'Client' } });
      setSignId(null);
      setPending(getQueue().length);
    }
  };

  const scanQR = async () => {
    if (!qrInput) return;
    const { data } = await api.get(`/equipment/scan/${qrInput}`);
    setScanned(data.data);
  };

  const handlePhoto = async (interventionId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const uploaded = await uploadFile(file, 'nfc-crm/interventions');
      const intervention = interventions.find((i) => i._id === interventionId);
      const photos = [...(intervention?.photos || []), uploaded.url];
      await api.put(`/interventions/${interventionId}`, { photos });
      load();
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto lg:max-w-none">
      <h1 className="text-2xl font-bold">Espace Technicien</h1>
      <p className="text-gray-500">Bonjour {user?.firstName}, voici vos interventions du jour.</p>
      {pending > 0 && (
        <div className="card !p-3 bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-800">
          {pending} action(s) en attente de synchronisation (mode hors ligne)
        </div>
      )}

      {techStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card !p-4 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm text-blue-600 font-medium">Interventions terminées</p>
            <p className="text-2xl font-bold">{techStats.interventionsCompleted}</p>
          </div>
          <div className="card !p-4 bg-green-50 dark:bg-green-900/20">
            <p className="text-sm text-green-600 font-medium">Note moyenne</p>
            <p className="text-2xl font-bold">{techStats.averageRating || 'N/A'} / 5</p>
          </div>
          <div className="card !p-4 bg-purple-50 dark:bg-purple-900/20">
            <p className="text-sm text-purple-600 font-medium">Score de ponctualité</p>
            <p className="text-2xl font-bold">{techStats.punctualityScore || 100}%</p>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><QrCode className="w-5 h-5 text-nfc-red" /> Scanner QR Code</h3>
        <div className="flex gap-2">
          <input className="input-field flex-1" placeholder="NFC-EXT001" value={qrInput} onChange={(e) => setQrInput(e.target.value)} />
          <button onClick={scanQR} className="btn-primary">Scanner</button>
        </div>
        {scanned && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
            <p className="font-medium">{scanned.category} - {scanned.serialNumber}</p>
            <p className="text-gray-500">{scanned.client?.companyName} | {scanned.location}</p>
            <StatusBadge status={scanned.status} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">Mes interventions</h3>
        {interventions.map((i) => (
          <div key={i._id} className="card !p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold">{i.reference}</p>
                <p className="text-sm text-gray-500">{i.client?.companyName}</p>
                <p className="text-xs text-gray-400">{formatDate(i.scheduledDate)} - {i.type}</p>
              </div>
              <StatusBadge status={i.status} />
            </div>
            <p className="text-sm mb-3">{i.description}</p>
            <div className="flex gap-2">
              {i.status === 'planned' && (
                <button onClick={() => updateStatus(i._id, 'in_progress')} className="btn-primary text-sm flex items-center gap-1 py-1.5">
                  <Play className="w-4 h-4" /> Démarrer
                </button>
              )}
              {i.status === 'in_progress' && (
                <button onClick={() => updateStatus(i._id, 'completed')} className="btn-primary text-sm flex items-center gap-1 py-1.5">
                  <CheckCircle className="w-4 h-4" /> Terminer
                </button>
              )}
              <button onClick={() => handlePhoto(i._id)} className="btn-secondary text-sm flex items-center gap-1 py-1.5">
                <Camera className="w-4 h-4" /> Photo
              </button>
              <button onClick={() => setSignId(i._id)} className="btn-secondary text-sm py-1.5">Signature</button>
            </div>
          </div>
        ))}
      </div>
      {signId && (
        <div className="card fixed bottom-4 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-40 shadow-xl">
          <p className="font-medium mb-2">Signature client</p>
          <SignaturePad onSave={saveSignature} />
          <button onClick={() => setSignId(null)} className="btn-secondary w-full mt-2 text-sm">Annuler</button>
        </div>
      )}
    </div>
  );
}
