import { useEffect } from "react";
import styles from "./SignOutConfirmDialog.module.css";

interface SignOutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  onConfirm: () => void;
}

export function SignOutConfirmDialog({
  open,
  onOpenChange,
  message,
  onConfirm,
}: SignOutConfirmDialogProps) {
  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return;
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-dialog-title"
        data-testid="dialog-signout-confirm"
      >
        <div className={styles.header}>
          <h2 id="signout-dialog-title" className={styles.title}>
            Sign out?
          </h2>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button
            data-testid="dialog-signout-cancel"
            onClick={() => onOpenChange(false)}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            data-testid="dialog-signout-confirm-btn"
            onClick={onConfirm}
            className={styles.confirmBtn}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
