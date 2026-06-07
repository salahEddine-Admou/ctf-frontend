import { createContext, useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DialogContext = createContext(null);

const normalize = (input) => {
  if (typeof input === 'string') return { message: input };
  return input || {};
};

export function DialogProvider({ children }) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(null);

  const close = (result) => {
    const resolve = dialog?.resolve;
    setDialog(null);
    resolve?.(result);
  };

  const alert = useCallback((options) => {
    const opts = normalize(options);
    return new Promise((resolve) => {
      setDialog({
        type: 'alert',
        title: opts.title || t('dialog.alertTitle'),
        message: opts.message,
        variant: opts.variant || 'info',
        okText: opts.okText || t('dialog.ok'),
        resolve: () => resolve(true),
      });
    });
  }, [t]);

  const confirm = useCallback((options) => {
    const opts = normalize(options);
    return new Promise((resolve) => {
      setDialog({
        type: 'confirm',
        title: opts.title || t('dialog.confirmTitle'),
        message: opts.message,
        variant: opts.variant || 'danger',
        confirmText: opts.confirmText || t('dialog.confirm'),
        cancelText: opts.cancelText || t('dialog.cancel'),
        resolve: (ok) => resolve(ok),
      });
    });
  }, [t]);

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog && (
        <ConfirmDialog
          open
          type={dialog.type}
          title={dialog.title}
          message={dialog.message}
          variant={dialog.variant}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          okText={dialog.okText}
          onConfirm={() => close(dialog.type === 'confirm')}
          onCancel={() => close(false)}
        />
      )}
    </DialogContext.Provider>
  );
}

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
};
