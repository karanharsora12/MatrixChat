import { AlertOptions, ConfirmOptions, ModalState } from './types';

type ModalHandler = (state: Omit<ModalState, 'isOpen'>) => Promise<boolean>;

let currentHandler: ModalHandler | null = null;

export function registerModalHandler(handler: ModalHandler | null) {
  currentHandler = handler;
}

export const modal = {
  alert(messageOrOptions: string | AlertOptions, optionalTitle?: string): Promise<void> {
    const opts: AlertOptions =
      typeof messageOrOptions === 'string'
        ? { message: messageOrOptions, title: optionalTitle || 'Alert', type: 'info' }
        : {
            title: messageOrOptions.title || 'Alert',
            message: messageOrOptions.message,
            type: messageOrOptions.type || 'info',
            confirmText: messageOrOptions.confirmText || 'OK',
          };

    if (!currentHandler) {
      console.warn('Modal handler not mounted, falling back to log:', opts.message);
      return Promise.resolve();
    }

    return currentHandler({
      isConfirm: false,
      title: opts.title || 'Alert',
      message: opts.message,
      type: opts.type || 'info',
      confirmText: opts.confirmText || 'OK',
      cancelText: 'Cancel',
      variant: opts.type === 'error' ? 'destructive' : 'matrix',
      resolve: () => {},
    }).then(() => undefined);
  },

  confirm(messageOrOptions: string | ConfirmOptions, optionalTitle?: string): Promise<boolean> {
    const opts: ConfirmOptions =
      typeof messageOrOptions === 'string'
        ? {
            message: messageOrOptions,
            title: optionalTitle || 'Confirm',
            type: 'question',
            variant: 'matrix',
          }
        : {
            title: messageOrOptions.title || 'Confirm',
            message: messageOrOptions.message,
            type: messageOrOptions.type || 'question',
            confirmText: messageOrOptions.confirmText || 'Confirm',
            cancelText: messageOrOptions.cancelText || 'Cancel',
            variant: messageOrOptions.variant || 'matrix',
          };

    if (!currentHandler) {
      console.warn('Modal handler not mounted, falling back to false');
      return Promise.resolve(false);
    }

    return currentHandler({
      isConfirm: true,
      title: opts.title || 'Confirm',
      message: opts.message,
      type: opts.type || 'question',
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      variant: opts.variant || 'matrix',
      resolve: () => {},
    });
  },

  success(message: string, title: string = 'Success'): Promise<void> {
    return modal.alert({ title, message, type: 'success' });
  },

  error(message: string, title: string = 'Error'): Promise<void> {
    return modal.alert({ title, message, type: 'error' });
  },

  warning(message: string, title: string = 'Warning'): Promise<void> {
    return modal.alert({ title, message, type: 'warning' });
  },

  info(message: string, title: string = 'Information'): Promise<void> {
    return modal.alert({ title, message, type: 'info' });
  },
};
