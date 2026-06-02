// Confirm dialog component

import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "削除",
  danger = true,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn--secondary" onClick={onClose}>
            キャンセル
          </button>
          <button
            className={`btn ${danger ? "btn--danger" : "btn--primary"}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="confirm-dialog">
        <p className={`confirm-dialog__message ${danger ? "confirm-dialog__warning" : ""}`}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
