import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { QrCode, Camera, CheckCircle, Play, Users, Star, Clock, Pencil } from 'lucide-react';
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
  const [allTechnicians, setAllTechnicians] = useState([]);

  const load = () => {
    api.get('/interventions', { params: { technician: user?._id, limit: 20 } })
      .then(({ data }) => setInterventions(data.data));
    api.get(`/users/${user?._id}`)
      .then(({ data }) => setTechStats(data.data?.stats));
  };

  const [ratingModal, setRatingModal] = useState(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [punctModal, setPunctModal] = useState(null);
  const [punctValue, setPunctValue] = useState(100);

  const loadAdminData = () => {
    api.get('/users', { params: { role: 'technician' } })
      .then(({ data }) => setAllTechnicians(data.data));
  };

  const openPunctuality = (tech) => {
    setPunctModal(tech._id);
    setPunctValue(tech.stats?.punctualityScore ?? 100);
  };

  const submitPunctuality = async () => {
    if (!punctModal) return;
    try {
      await api.put(`/users/${punctModal}/punctuality`, { punctualityScore: Number(punctValue) });
      setPunctModal(null);
      loadAdminData();
    } catch (err) {
      console.error('Failed to update punctuality', err);
    }
  };

  const submitRating = async () => {
    if (!ratingModal) return;
    try {
      await api.post(`/users/${ratingModal}/rate`, { score: Number(ratingScore), feedback: ratingFeedback });
      setRatingModal(null);
      setRatingScore(5);
      setRatingFeedback('');
      loadAdminData();
    } catch (err) {
      console.error("Failed to submit rating", err);
    }
  };

  useEffect(() => {
    if (user?.role === 'technician') {
      load();
    } else if (user) {
      loadAdminData();
    }
    setPending(getQueue().length);
    const sync = async () => {
      if (navigator.onLine && getQueue().length) {
        const r = await syncQueue(api);
        if (r.synced && user?.role === 'technician') load();
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

  if (user?.role !== 'technician') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-nfc-red" /> Équipe Technique
            </h1>
            <p className="text-gray-500">Vue d'ensemble des performances de vos techniciens.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTechnicians.map(tech => (
            <div key={tech._id} className="card p-5 border-t-4 border-t-nfc-red shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-nfc-red/10 flex items-center justify-center text-nfc-red font-bold text-xl">
                  {tech.firstName?.[0]?.toUpperCase()}{tech.lastName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800">{tech.firstName} {tech.lastName}</h3>
                  <p className="text-sm text-gray-500">{tech.email}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <span className="text-sm text-blue-700 font-medium">Interventions terminées</span>
                  <span className="font-bold text-blue-800 text-lg">{tech.stats?.interventionsCompleted || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-green-50/50 p-3 rounded-lg border border-green-100">
                  <span className="text-sm text-green-700 font-medium flex items-center gap-1.5">
                    <Star className="w-4 h-4" /> Note moyenne
                  </span>
                  <span className="font-bold text-green-800 text-lg">{tech.stats?.averageRating || 'N/A'} <span className="text-xs text-green-600 font-normal">/ 5</span></span>
                </div>
                <div className="flex justify-between items-center bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                  <span className="text-sm text-purple-700 font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Ponctualité
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-purple-800 text-lg">{tech.stats?.punctualityScore ?? 100}%</span>
                    <button
                      type="button"
                      onClick={() => openPunctuality(tech)}
                      className="p-1 rounded-md text-purple-500 hover:bg-purple-100 hover:text-purple-700"
                      title="Modifier la ponctualité"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setRatingModal(tech._id)}
                className="mt-5 w-full btn-secondary text-sm py-2"
              >
                Évaluer ce technicien
              </button>
            </div>
          ))}
          {allTechnicians.length === 0 && (
            <div className="col-span-full text-center p-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Aucun technicien trouvé dans le système.
            </div>
          )}
        </div>

        {ratingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> Évaluer le technicien
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (1 à 5)</label>
                  <input 
                    type="number" min="1" max="5" 
                    className="input-field w-full"
                    value={ratingScore} 
                    onChange={e => setRatingScore(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire (optionnel)</label>
                  <textarea 
                    className="input-field w-full resize-none" rows="3"
                    placeholder="Très bon travail, ponctuel..."
                    value={ratingFeedback}
                    onChange={e => setRatingFeedback(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setRatingModal(null)} className="btn-secondary flex-1 py-2">Annuler</button>
                  <button onClick={submitRating} className="btn-primary flex-1 py-2">Enregistrer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {punctModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" /> Score de ponctualité
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ponctualité (0 à 100 %)</label>
                  <input
                    type="number" min="0" max="100"
                    className="input-field w-full"
                    value={punctValue}
                    onChange={(e) => setPunctValue(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Défini manuellement par l&apos;administrateur.</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setPunctModal(null)} className="btn-secondary flex-1 py-2">Annuler</button>
                  <button onClick={submitPunctuality} className="btn-primary flex-1 py-2">Enregistrer</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

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
