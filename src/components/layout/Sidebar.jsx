import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import {
  LayoutDashboard, Users, Wrench, ClipboardList, FileText,
  Receipt, Calendar, HardHat, Settings, GraduationCap, History, Building2, Package, BarChart3
} from 'lucide-react';
import Logo from '../ui/Logo';

const isOwner = (role) => role === 'super_admin' || role === 'admin';
const isClient = (role) => role === 'viewer';
const isTech = (role) => role === 'technician';

const navItems = [
  { to: '/', icon: LayoutDashboard, key: 'dashboard', show: () => true },
  { to: '/clients', icon: Users, key: 'clients', show: (r) => isOwner(r) },
  { to: '/clients', icon: Building2, key: 'myCompany', show: (r) => isClient(r) },
  { to: '/equipment', icon: Wrench, key: 'equipment', show: (r) => isOwner(r) || isClient(r) || isTech(r) },
  { to: '/interventions', icon: ClipboardList, key: 'interventions', show: (r) => isOwner(r) || isClient(r) || isTech(r) },
  { to: '/contracts', icon: FileText, key: 'contracts', show: (r) => isOwner(r) || isClient(r) },
  { to: '/invoices', icon: Receipt, key: 'invoices', show: (r) => isOwner(r) || isClient(r) },
  { to: '/reports', icon: BarChart3, key: 'reports', show: (r) => isOwner(r) },
  { to: '/inventory', icon: Package, key: 'inventory', show: (r) => isOwner(r) },
  { to: '/calendar', icon: Calendar, key: 'calendar', show: (r) => isOwner(r) || isTech(r) },
  { to: '/trainings', icon: GraduationCap, key: 'trainings', show: (r) => isOwner(r) },
  { to: '/technician', icon: HardHat, key: 'technician', show: (r) => isTech(r) || isOwner(r) },
  { to: '/users', icon: Settings, key: 'users', show: (r) => isOwner(r) },
  { to: '/activity', icon: History, key: 'activity', show: (r) => isOwner(r) },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation();
  const { user } = useSelector((s) => s.auth);

  const filtered = navItems.filter((item) => item.show(user?.role));

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 w-64 max-w-[85vw] bg-nfc-dark text-white flex flex-col min-h-screen transform transition-transform duration-200 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between gap-2">
        <NavLink to="/" className="block bg-white rounded-lg p-3 flex-1" onClick={onClose}>
          <Logo variant="md" className="mx-auto" />
        </NavLink>
        <button type="button" onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-300" aria-label="Fermer">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center px-4 -mt-2 mb-2">{t('app.subtitle')}</p>
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {filtered.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={`${to}-${key}`}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                isActive ? 'bg-nfc-red text-white' : 'text-gray-300 hover:bg-gray-700'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="truncate">{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">NFC Incendie © 2025</div>
    </aside>
  );
}
