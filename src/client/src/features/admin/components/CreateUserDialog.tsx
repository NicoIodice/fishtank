/**
 * Create User Dialog — form to create a new Standard User account.
 * AC-3: Creates Standard User with ForcePasswordChange=true
 * AC-4: Password must be ≥12 characters
 * AC-5: Duplicate username returns 409 error
 * AC-9: Dialog with username + password + confirm password fields
 */

import { useState, useEffect, useRef } from "react";
import { useCreateUser } from "../hooks/useUsers";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useToast } from "@/lib/useToast";
import styles from "./CreateUserDialog.module.css";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const { mutate: createUser, isPending } = useCreateUser();
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

  function resetForm() {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setValidationError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    if (!username.trim()) {
      setValidationError("Username is required");
      return;
    }

    if (password.length < 12) {
      setValidationError("Password must be at least 12 characters");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    createUser(
      { username: username.trim(), password },
      {
        onSuccess: (user) => {
          showToast(`User "${user.username}" created successfully.`, "success");
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          setValidationError(error.message);
        },
      },
    );
  }

  function handleCancel() {
    resetForm();
    onOpenChange(false);
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
        aria-labelledby="create-user-dialog-title"
        data-testid="dialog-create-user"
      >
        <div className={styles.header}>
          <h2 id="create-user-dialog-title" className={styles.title}>
            Create User Account
          </h2>
        </div>

        <p className={styles.description}>
          Create a new Standard User account. The user will be required to
          change their password on first login.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              id="username"
              type="text"
              data-testid="input-create-user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={isPending}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              data-testid="input-create-user-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 12 characters"
              disabled={isPending}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              data-testid="input-create-user-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={isPending}
              className={styles.input}
            />
          </div>

          {validationError && (
            <div className={styles.error}>{validationError}</div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              data-testid="dialog-create-user-cancel"
              onClick={handleCancel}
              disabled={isPending}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="dialog-create-user-submit"
              disabled={isPending}
              className={styles.submitBtn}
            >
              {isPending ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
