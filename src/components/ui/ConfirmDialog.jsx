import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-nfc-red',
    confirmClass: 'btn-primary bg-nfc-red hover:bg-nfc-red-dark',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600',
    confirmClass: 'btn-primary',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600',
    confirmClass: 'btn-primary',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600',
    confirmClass: 'btn-primary',
  },
};

export default function ConfirmDialog({
  open,
  type = 'confirm',
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  okText = 'OK',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;
  const isAlert = type === 'alert';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="dialog-animate bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${v.iconBg}`}>
              <Icon className={`w-6 h-6 ${v.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 id="dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white pr-6">
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 -mt-1 -mr-1"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
          {!isAlert && (
            <button type="button" onClick={onCancel} className="btn-secondary flex-1 sm:flex-none sm:min-w-[100px]">
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`${v.confirmClass} flex-1 sm:flex-none sm:min-w-[100px] ${isAlert ? 'w-full sm:w-auto sm:ml-auto' : ''}`}
          >
            {isAlert ? okText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
