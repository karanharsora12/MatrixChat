import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../dialog';
import { Button } from '../button';
import { ModalState } from './types';
import { registerModalHandler, modal } from './modalService';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const ModalContext = createContext(modal);

export const useModal = () => useContext(ModalContext);

const DEFAULT_STATE: ModalState = {
  isOpen: false,
  isConfirm: false,
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK',
  cancelText: 'Cancel',
  variant: 'matrix',
  resolve: () => {},
};

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>(DEFAULT_STATE);

  const openModal = useCallback((config: Omit<ModalState, 'isOpen'>): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        ...config,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    registerModalHandler(openModal);
    return () => registerModalHandler(null);
  }, [openModal]);

  const handleClose = (result: boolean) => {
    modalState.resolve(result);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'success':
        return (
          <div className="w-11 h-11 rounded-2xl bg-[#00a884]/15 text-[#00a884] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
        );
      case 'error':
        return (
          <div className="w-11 h-11 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
        );
      case 'question':
        return (
          <div className="w-11 h-11 rounded-2xl bg-[#00a884]/15 text-[#00a884] flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <ModalContext.Provider value={modal}>
      {children}

      <Dialog open={modalState.isOpen} onOpenChange={(open) => !open && handleClose(false)}>
        <DialogContent className="max-w-md p-6 bg-white dark:bg-[#1f2c34] border border-border/80 shadow-2xl rounded-2xl">
          <div className="flex items-start gap-4">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-base sm:text-lg font-semibold text-foreground">
                  {modalState.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {modalState.message}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2.5 sm:gap-2">
            {modalState.isConfirm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                className="rounded-xl border-border hover:bg-muted font-medium text-foreground text-xs sm:text-sm px-4"
              >
                {modalState.cancelText}
              </Button>
            )}

            <Button
              type="button"
              variant={modalState.variant}
              onClick={() => handleClose(true)}
              autoFocus
              className={`rounded-xl font-semibold text-xs sm:text-sm px-5 ${
                modalState.variant === 'matrix'
                  ? 'bg-[#00a884] text-[#111b21] hover:bg-[#008069]'
                  : modalState.variant === 'destructive'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : ''
              }`}
            >
              {modalState.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

export { modal };
