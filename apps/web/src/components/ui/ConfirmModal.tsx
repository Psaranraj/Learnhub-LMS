import { Button } from './Button';
import { Modal, ModalActions } from './Modal';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ open, title, message, confirmLabel, danger, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-xs leading-relaxed">{message}</p>
      <ModalActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'pri'} disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
