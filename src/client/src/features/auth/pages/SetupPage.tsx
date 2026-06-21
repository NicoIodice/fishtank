import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSetup } from "../hooks/useSetup";
import { ApiError } from "@/lib/api";
import styles from "./AuthPage.module.css";

const MIN_PASSWORD_LENGTH = 12;

export function SetupPage() {
  const navigate = useNavigate();
  const { mutateAsync: setup, isPending } = useSetup();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    try {
      await setup({ username, password });
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
    <div className={styles.page} data-testid="setup-page">
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <i
            className="bi bi-droplet-half"
            aria-hidden="true"
            style={{ fontSize: "1.5rem", color: "var(--brand)" }}
          />
          <span className={styles.wordmark}>Fishtank</span>
        </div>
        <h1 className={styles.title}>Set up administrator account</h1>
        <p className={styles.subtitle}>
          Create the first admin account for this Fishtank instance.
        </p>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="setup-username">Username</label>
            <input
              id="setup-username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="setup-username-input"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="setup-password">Password</label>
            <input
              id="setup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="setup-password-input"
            />
            <span className={styles.fieldHint}>
              Minimum {MIN_PASSWORD_LENGTH} characters
            </span>
          </div>
          {error && (
            <p
              className={styles.error}
              role="alert"
              data-testid="setup-error-message"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitButton}
            data-testid="setup-submit-button"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
