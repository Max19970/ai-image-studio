import type { ReactNode } from 'react';
import { Button } from '../Button';
import { Dialog } from './Dialog';

export interface ConfirmationDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  closeLabel: string;
  tone?: 'neutral' | 'danger';
  testId?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  closeLabel,
  tone = 'neutral',
  testId,
  onConfirm,
  onClose
}: ConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      closeLabel={closeLabel}
      tone={tone}
      size="compact"
      testId={testId}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" data-dialog-initial-focus="true" onClick={onClose}>{cancelLabel}</Button>
          <Button variant="primary" tone={tone === 'danger' ? 'danger' : 'neutral'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      {children}
    </Dialog>
  );
}
