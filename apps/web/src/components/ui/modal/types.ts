export type ModalType = 'info' | 'success' | 'warning' | 'error' | 'question';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  variant?: 'matrix' | 'destructive' | 'default';
}

export interface ModalState {
  isOpen: boolean;
  isConfirm: boolean;
  title: string;
  message: string;
  type: ModalType;
  confirmText: string;
  cancelText: string;
  variant: 'matrix' | 'destructive' | 'default';
  resolve: (value: boolean) => void;
}
