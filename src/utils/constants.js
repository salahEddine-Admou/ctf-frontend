export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  prospect: 'bg-blue-100 text-blue-800',
  inactive: 'bg-gray-100 text-gray-800',
  suspended: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  accepted: 'bg-cyan-100 text-cyan-800',
  awaiting_approval: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  completed: 'bg-green-100 text-green-800',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  operational: 'bg-green-100 text-green-800',
  needs_maintenance: 'bg-orange-100 text-orange-800',
  expired: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-blue-100 text-blue-800',
  overdue: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  renewed: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200',
  cancelled: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const STATUS_LABELS = {
  active: 'Actif',
  prospect: 'Prospect',
  inactive: 'Inactif',
  suspended: 'Suspendu',
  pending: 'En attente',
  planned: 'Planifié',
  in_progress: 'En cours',
  accepted: 'Acceptée',
  awaiting_approval: 'En attente d\'approbation',
  completed: 'Terminé',
  urgent: 'Urgent',
  operational: 'Opérationnel',
  needs_maintenance: 'Nécessite maintenance',
  expired: 'Expiré',
  paid: 'Payé',
  partial: 'Paiement partiel',
  sent: 'Envoyé',
  overdue: 'En retard',
  draft: 'Brouillon',
  renewed: 'Renouvelé',
  cancelled: 'Annulé',
  approved: 'Approuvé',
  rejected: 'Rejeté',
};

export const CONTRACT_STATUS = {
  draft: 'Brouillon',
  active: 'Actif',
  expired: 'Expiré',
  renewed: 'Renouvelé',
  cancelled: 'Annulé',
};

export const CONTRACT_STATUS_OPTIONS = Object.entries(CONTRACT_STATUS).map(([value, label]) => ({ value, label }));

export const ROLE_LABELS = {
  super_admin: 'Admin',
  admin: 'Admin',
  technician: 'Technicien',
  viewer: 'Client',
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'technician', label: 'Technicien' },
  { value: 'viewer', label: 'Client' },
];

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);

export const formatDate = (date) =>
  date ? new Intl.DateTimeFormat('fr-MA').format(new Date(date)) : '-';
