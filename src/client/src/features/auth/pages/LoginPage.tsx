import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";
import { ApiError } from "@/lib/api";
import styles from "./AuthPage.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutateAsync: login, isPending } = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login({ username, password });
      // Redirect back to the page that triggered the login (redirect-back pattern)
      const from =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? "/services";
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setPassword("");
    }
  }

  return (
    <div className={styles.page} data-testid="login-page">
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <i
            className="bi bi-droplet-half"
            aria-hidden="true"
            style={{ fontSize: "1.5rem", color: "var(--brand)" }}
          />
          <span className={styles.wordmark}>Fishtank</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          noValidate
        >
          <div className={styles.field}>
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              data-testid="login-username-input"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input"
            />
          </div>
          {error && (
            <p
              className={styles.error}
              role="alert"
              data-testid="login-error-message"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className={styles.submitButton}
            data-testid="login-submit-button"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
