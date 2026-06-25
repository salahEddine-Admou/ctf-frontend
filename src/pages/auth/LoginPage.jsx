import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame, UserCircle, Wrench, Building2 } from 'lucide-react';
import { login, clearError } from '../../store/slices/authSlice';
import Logo from '../../components/ui/Logo';
const DEMO_ACCOUNTS = [
  { key: 'admin', label: 'Admin', email: 'admin@nfc-crm.ma', password: 'admin123', icon: UserCircle, color: 'bg-red-50 border-red-200 text-nfc-red', hint: 'Propriétaire plateforme' },
  { key: 'client', label: 'Client', email: 'client@nfc-crm.ma', password: 'client123', icon: Building2, color: 'bg-blue-50 border-blue-200 text-blue-700', hint: 'Maroc Telecom' },
  { key: 'technician', label: 'Technicien', email: 'technicien@nfc-crm.ma', password: 'tech123', icon: Wrench, color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) navigate('/');
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    dispatch(clearError());
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-nfc-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-nfc-red/20 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-8 xl:p-12 text-white">
          <div className="mb-8">
            <Logo variant="hero" className="max-w-sm" />
          </div>
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Protection incendie<br />& maintenance
          </h2>
          <p className="text-gray-400 text-base xl:text-lg max-w-md">
            Plateforme CRM pour NFC — gestion clients, équipements, interventions et contrats.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
            {['Extincteurs', 'RIA', 'Détection', 'Sprinklers', 'Plans sécurité', 'Conseil HSE'].map((s) => (
              <div key={s} className="flex items-center gap-2 text-gray-300">
                <Flame className="w-4 h-4 text-nfc-red shrink-0" /> {s}
              </div>
            ))}
          </div>
          <div className="mt-12">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-3">
              Certifications &amp; audit
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg p-2 flex items-center justify-center h-16 w-32">
                <img src="/cert-imanor.png" alt="Certification IMANOR - Institut Marocain de Normalisation" className="max-h-12 max-w-full object-contain" />
              </div>
              <div className="bg-white rounded-lg p-2 flex items-center justify-center h-16 w-16">
                <img src="/cert-nm.png" alt="Certification NM Services" className="max-h-12 max-w-full object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <Logo variant="lg" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1">{t('auth.welcome')}</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base">{t('auth.login')}</p>

          {error && (
            <button
              type="button"
              className="mb-4 w-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-left"
              onClick={() => dispatch(clearError())}
            >
              {error}
              {(error.includes('503') || error.includes('502') || error.includes('Database')) && (
                <span className="block mt-1 text-xs opacity-90">
                  Vérifiez MONGODB_URI et les variables d&apos;environnement du serveur API.
                </span>
              )}
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.email')}</label>
              <input type="email" required className="input-field" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('auth.password')}</label>
              <input type="password" required className="input-field" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="current-password" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t('common.loading') : t('auth.loginButton')}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('auth.demoAccounts')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const active = form.email === acc.email;
                return (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className={`text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                      active ? 'ring-2 ring-nfc-red border-nfc-red' : acc.color
                    } dark:bg-gray-800 dark:border-gray-600`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-semibold text-sm">{acc.label}</span>
                    </div>
                    <p className="text-[10px] font-mono truncate">{acc.email}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{acc.password}</p>
                    {acc.hint && <p className="text-[10px] text-gray-400 mt-0.5">{acc.hint}</p>}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-gray-400 text-center">{t('auth.demoHint')}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 text-center mb-3">
              Entreprise certifiée
            </p>
            <div className="flex items-center justify-center gap-6">
              <img src="/cert-imanor.png" alt="Certification IMANOR - Institut Marocain de Normalisation" className="h-10 w-auto object-contain" />
              <img src="/cert-nm.png" alt="Certification NM Services" className="h-12 w-auto object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
