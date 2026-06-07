import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Bell, Moon, Sun, Search, LogOut, Globe, Menu } from 'lucide-react';
import { logout } from '../../store/slices/authSlice';
import { toggleDarkMode, setLanguage } from '../../store/slices/themeSlice';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../../api/axios';
import { ROLE_LABELS } from '../../utils/constants';
import NotificationPanel from './NotificationPanel';

const searchRoutes = {
  clients: (id) => `/clients/${id}`,
  equipments: () => '/equipment',
  contracts: () => '/contracts',
  invoices: () => '/invoices',
  interventions: () => '/interventions',
  users: () => '/users',
};

export default function Header({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);
  const showSearch = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'technician';
  const { darkMode, language } = useSelector((s) => s.theme);
  const { unreadCount } = useSelector((s) => s.notifications);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults(null); return; }
    const { data } = await api.get(`/search?q=${q}`);
    setResults(data.data);
  };

  const go = (type, item) => {
    const route = searchRoutes[type];
    if (route) navigate(typeof route === 'function' ? route(item._id) : route());
    setResults(null);
    setSearch('');
  };

  const sections = results ? [
    { key: 'clients', label: 'Clients', items: results.clients, render: (c) => c.companyName },
    { key: 'equipments', label: 'Équipements', items: results.equipments, render: (e) => `${e.serialNumber} - ${e.client?.companyName}` },
    { key: 'contracts', label: 'Contrats', items: results.contracts, render: (c) => c.contractNumber },
    { key: 'invoices', label: 'Factures', items: results.invoices, render: (i) => i.number },
    { key: 'interventions', label: 'Interventions', items: results.interventions, render: (i) => i.reference },
    { key: 'users', label: 'Utilisateurs', items: results.users, render: (u) => `${u.firstName} ${u.lastName}` },
  ] : [];

  return (
    <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 px-3 sm:px-6 shrink-0">
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      {showSearch ? (
        <div className="relative flex-1 max-w-md min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input-field pl-10 py-2 text-sm"
          />
          {results && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
              {sections.map(({ key, label, items, render }) => items?.length > 0 && (
                <div key={key}>
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">{label}</p>
                  {items.map((item) => (
                    <button key={item._id} type="button" onClick={() => go(key, item)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                      {render(item)}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-w-0" />
      )}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <button onClick={() => { const next = language === 'fr' ? 'ar' : 'fr'; dispatch(setLanguage(next)); i18n.changeLanguage(next); document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'; }}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title={t('common.language')}>
          <Globe className="w-5 h-5" /><span className="text-xs ml-1">{language.toUpperCase()}</span>
        </button>
        <button onClick={() => dispatch(toggleDarkMode())} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-nfc-red text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-600">
          <div className="w-8 h-8 bg-nfc-red rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>
          </div>
          <button onClick={() => { dispatch(logout()); navigate('/login'); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title={t('nav.logout')}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
