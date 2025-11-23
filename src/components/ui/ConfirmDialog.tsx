"use client"

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  isDestructive = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 ${isDestructive ? 'text-red-500' : 'text-yellow-500'}`} />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} data-testid="confirm-cancel-button">
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}
            data-testid="confirm-action-button"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
