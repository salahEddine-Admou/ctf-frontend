import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, UserCog, LogOut, Mail, KeyRound, User as UserIcon } from 'lucide-react';
import { logout, updateProfile } from '../../store/slices/authSlice';
import { ROLE_LABELS } from '../../utils/constants';
import { useDialog } from '../../context/DialogContext';
import api from '../../api/axios';
import Modal from '../ui/Modal';

export default function ProfileMenu() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alert } = useDialog();
  const { user } = useSelector((s) => s.auth);

  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('info');
  const menuRef = useRef(null);

  const [info, setInfo] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openProfile = (initialTab = 'info') => {
    setInfo({
      firstName: user?.firstName || '', lastName: user?.lastName || '',
      email: user?.email || '', phone: user?.phone || '',
    });
    setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    setTab(initialTab);
    setShowModal(true);
    setOpen(false);
  };

  const saveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      const res = await dispatch(updateProfile(info));
      if (updateProfile.fulfilled.match(res)) {
        await alert({ title: 'Profil mis à jour', message: 'Vos informations ont été enregistrées.', variant: 'success' });
        setShowModal(false);
      } else {
        await alert({ title: 'Erreur', message: res.payload || 'Échec de la mise à jour', variant: 'danger' });
      }
    } finally {
      setSavingInfo(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwd.newPassword.length < 6) {
      return alert({ title: 'Mot de passe trop court', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.', variant: 'danger' });
    }
    if (pwd.newPassword !== pwd.confirm) {
      return alert({ title: 'Confirmation invalide', message: 'Les mots de passe ne correspondent pas.', variant: 'danger' });
    }
    setSavingPwd(true);
    try {
      await api.put('/auth/update-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      await alert({ title: 'Mot de passe mis à jour', message: 'Votre mot de passe a été changé.', variant: 'success' });
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
      setShowModal(false);
    } catch (err) {
      await alert({ title: 'Erreur', message: err.response?.data?.message || 'Échec du changement de mot de passe', variant: 'danger' });
    } finally {
      setSavingPwd(false);
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <div className="relative pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-600" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div className="w-8 h-8 bg-nfc-red rounded-full flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium leading-tight">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-gray-500 leading-tight">{ROLE_LABELS[user?.role]}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-nfc-red rounded-full flex items-center justify-center text-white font-medium">{initials}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <p className="text-[11px] text-nfc-red font-medium">{ROLE_LABELS[user?.role]}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <button type="button" onClick={() => openProfile('info')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
              <UserCog className="w-4 h-4 text-gray-500" /> Mon profil
            </button>
            <button type="button" onClick={() => openProfile('password')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
              <KeyRound className="w-4 h-4 text-gray-500" /> Changer le mot de passe
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button type="button" onClick={() => { dispatch(logout()); navigate('/login'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-nfc-red hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="w-4 h-4" /> {t('nav.logout')}
            </button>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Mon profil" wide>
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => setTab('info')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${tab === 'info' ? 'bg-nfc-red text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <UserIcon className="w-4 h-4" /> Informations
          </button>
          <button type="button" onClick={() => setTab('password')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${tab === 'password' ? 'bg-nfc-red text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <KeyRound className="w-4 h-4" /> Mot de passe
          </button>
        </div>

        {tab === 'info' ? (
          <form onSubmit={saveInfo} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <input className="input-field mt-1" required value={info.firstName} onChange={(e) => setInfo({ ...info, firstName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Nom</label>
                <input className="input-field mt-1" required value={info.lastName} onChange={(e) => setInfo({ ...info, lastName: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</label>
                <input type="email" className="input-field mt-1" required value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Téléphone</label>
                <input className="input-field mt-1" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={savingInfo} className="btn-primary">{savingInfo ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={savePassword} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Mot de passe actuel</label>
              <input type="password" className="input-field mt-1" required autoComplete="current-password" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <input type="password" className="input-field mt-1" required autoComplete="new-password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Confirmer le nouveau mot de passe</label>
              <input type="password" className="input-field mt-1" required autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={savingPwd} className="btn-primary">{savingPwd ? 'Modification...' : 'Changer le mot de passe'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
