import styles from "./AboutModal.module.css";

interface AboutModalProps {
  onClose: () => void;
}

// Env vars injected by Vite at build time via VITE_* prefix
const VERSION = import.meta.env.VITE_FISHTANK_VERSION as string | undefined;
const DOCKER_TAG = import.meta.env.VITE_FISHTANK_DOCKER_TAG as
  | string
  | undefined;
const BUILD_HASH = import.meta.env.VITE_FISHTANK_BUILD_HASH as
  | string
  | undefined;
const DOCS_URL = import.meta.env.VITE_FISHTANK_DOCS_URL as string | undefined;
const CHANGELOG_URL = import.meta.env.VITE_FISHTANK_CHANGELOG_URL as
  | string
  | undefined;

export function AboutModal({ onClose }: AboutModalProps) {
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        data-testid="about-modal"
      >
        <div className={styles.header}>
          <h2 id="about-modal-title" className={styles.title}>
            <i
              className="bi bi-droplet-half"
              aria-hidden="true"
              style={{ color: "var(--brand)" }}
            />
            Fishtank
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close About modal"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <dl className={styles.list}>
          {VERSION && (
            <div className={styles.row}>
              <dt>Version</dt>
              <dd data-testid="about-version">{VERSION}</dd>
            </div>
          )}
          {DOCKER_TAG && (
            <div className={styles.row}>
              <dt>Docker tag</dt>
              <dd>{DOCKER_TAG}</dd>
            </div>
          )}
          {BUILD_HASH && (
            <div className={styles.row}>
              <dt>Build</dt>
              <dd>
                <code>{BUILD_HASH}</code>
              </dd>
            </div>
          )}
          {DOCS_URL && (
            <div className={styles.row}>
              <dt>Docs</dt>
              <dd>
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="about-docs-link"
                >
                  {DOCS_URL}
                </a>
              </dd>
            </div>
          )}
          {CHANGELOG_URL && (
            <div className={styles.row}>
              <dt>Changelog</dt>
              <dd>
                <a
                  href={CHANGELOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {CHANGELOG_URL}
                </a>
              </dd>
            </div>
          )}
          {!VERSION &&
            !DOCKER_TAG &&
            !BUILD_HASH &&
            !DOCS_URL &&
            !CHANGELOG_URL && (
              <div className={styles.row}>
                <dt>Build info</dt>
                <dd className={styles.muted}>Not configured</dd>
              </div>
            )}
        </dl>
      </div>
    </div>
  );
}
