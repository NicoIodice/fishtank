import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, ApiError } from "@/lib/api";
import { useRegistrationStatus } from "../hooks/useRegistrationStatus";
import styles from "./AuthPage.module.css";

const MIN_PASSWORD_LENGTH = 12;

async function registerUser(username: string, password: string): Promise<void> {
  await apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    redirectOn401: false,
  });
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { data: regStatus, isLoading } = useRegistrationStatus();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);
    try {
      await registerUser(username, password);
      navigate("/services", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page} data-testid="page-register">
        <div className={styles.card}>Loading…</div>
      </div>
    );
  }

  if (!regStatus?.enabled) {
    return (
      <div className={styles.page} data-testid="page-register">
        <div className={styles.card}>
          <div className={styles.logoRow}>
            <i
              className="bi bi-droplet-half"
              aria-hidden="true"
              style={{ fontSize: "1.5rem", color: "var(--brand)" }}
            />
            <span className={styles.wordmark}>Fishtank</span>
          </div>
          <p style={{ marginBottom: "1rem" }}>
            Self-registration is not available for this instance.
          </p>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} data-testid="page-register">
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <i
            className="bi bi-droplet-half"
            aria-hidden="true"
            style={{ fontSize: "1.5rem", color: "var(--brand)" }}
          />
          <span className={styles.wordmark}>Fishtank</span>
        </div>
        <h1 className={styles.title}>Create account</h1>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="register-username">Username</label>
            <input
              id="register-username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="input-register-username"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-register-password"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="register-confirm-password">Confirm Password</label>
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-register-confirm-password"
            />
          </div>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitButton}
            data-testid="btn-register-submit"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p
          style={{
            marginTop: "1rem",
            textAlign: "center",
            fontSize: "0.875rem",
          }}
        >
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
