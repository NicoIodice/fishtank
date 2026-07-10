/**
 * Deactivate User Dialog — confirmation dialog for user deactivation.
 * AC-10: Warns if trying to deactivate last active admin
 * AC-6: Deactivates user and invalidates all their JWTs
 */

import { useEffect, useRef } from "react";
import { useDeactivateUser } from "../hooks/useUsers";
import type { User } from "../types/user";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useToast } from "@/lib/useToast";
import styles from "./DeactivateUserDialog.module.css";

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
}: DeactivateUserDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { mutate: deactivateUser, isPending } = useDeactivateUser();
  const { showToast } = useToast();

  useFocusTrap(modalRef, open);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  function handleConfirm() {
    deactivateUser(user.id, {
      onSuccess: () => {
        showToast(
          `User "${user.username}" has been deactivated. All active sessions have been terminated.`,
          "success",
        );
        onOpenChange(false);
      },
      onError: (error) => {
        showToast(error.message, "error");
      },
    });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-user-dialog-title"
        data-testid="dialog-deactivate-user"
      >
        <div className={styles.header}>
          <h2 id="deactivate-user-dialog-title" className={styles.title}>
            Deactivate User
          </h2>
        </div>

        <div className={styles.description}>
          <p>
            Are you sure you want to deactivate <strong>{user.username}</strong>
            ?
          </p>
          <p>
            This user will be logged out immediately and unable to sign in again.
          </p>
          {user.role === "Admin" && (
            <p className={styles.warning}>
              Warning: You are about to deactivate an administrator account.
            </p>
          )}
        </div>

        <div className={styles.details}>
          <p>This action will:</p>
          <ul className={styles.list}>
            <li>Immediately invalidate all active JWT tokens</li>
            <li>Prevent future login attempts</li>
            <li>Set account status to "Deactivated"</li>
          </ul>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            data-testid="btn-deactivate-user-cancel"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className={styles.cancelBtn}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="btn-deactivate-user-confirm"
            onClick={handleConfirm}
            disabled={isPending}
            className={`${styles.confirmBtn} destructive`}
          >
            {isPending ? "Deactivating..." : "Deactivate User"}
          </button>
        </div>
      </div>
    </div>
  );
}
