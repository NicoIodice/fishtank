import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useChangePassword } from "../hooks/useChangePassword";
import { ApiError } from "@/lib/api";
import styles from "./AuthPage.module.css";

const MIN_PASSWORD_LENGTH = 12;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { mutateAsync: changePassword, isPending } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      navigate("/services", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  }

  return (
    <div className={styles.page} data-testid="change-password-page">
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <i
            className="bi bi-droplet-half"
            aria-hidden="true"
            style={{ fontSize: "1.5rem", color: "var(--brand)" }}
          />
          <span className={styles.wordmark}>Fishtank</span>
        </div>
        <h1 className={styles.title}>Change your password</h1>
        <p className={styles.subtitle}>
          You must set a new password before continuing.
        </p>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="change-password-current-input"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="change-password-new-input"
            />
            <span className={styles.fieldHint}>
              Minimum {MIN_PASSWORD_LENGTH} characters
            </span>
          </div>
          {error && (
            <p
              className={styles.error}
              role="alert"
              data-testid="change-password-error-message"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitButton}
            data-testid="change-password-submit-button"
          >
            {isPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
