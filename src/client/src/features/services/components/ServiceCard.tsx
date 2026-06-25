import type { Service } from "../types/service";
import { useToggleService } from "../hooks/useServices";
import styles from "./ServiceCard.module.css";

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
}

export function ServiceCard({ service, onEdit }: ServiceCardProps) {
  const toggleMutation = useToggleService();
  const isLive = service.status === "live";
  const toggleId = `toggle-${service.id}`;

  function handleToggle() {
    toggleMutation.mutate({
      id: service.id,
      action: service.isActive ? "stop" : "start",
    });
  }

  return (
    <article
      className={`${styles.card} ${!isLive ? styles.stopped : ""}`}
      data-testid={`service-card-${service.id}`}
      aria-label={`${service.name} service card`}
    >
      {/* Header row: name + description + port badge */}
      <div className={styles.header}>
        <div className={styles.nameSection}>
          <div className={styles.name}>{service.name}</div>
          {service.description && (
            <div className={styles.description}>{service.description}</div>
          )}
        </div>
        <span className={styles.portBadge} title={`Port ${service.port}`}>
          :{service.port}
        </span>
      </div>

      {/* Meta: External URL, mock file count, mocks root */}
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <i className="bi bi-link-45deg" aria-hidden="true" />
          <span className={styles.metaValue} title={service.externalUrl}>
            {service.externalUrl}
          </span>
        </div>
        <div className={styles.metaRow}>
          <i className="bi bi-file-earmark-code" aria-hidden="true" />
          <span className={styles.metaValue}>
            {service.mockFileCount === 0
              ? "No mapping files"
              : `${service.mockFileCount} mapping ${service.mockFileCount === 1 ? "file" : "files"}`}
          </span>
        </div>
        <div className={styles.metaRow}>
          <i className="bi bi-folder2" aria-hidden="true" />
          <span
            className={styles.metaValue}
            title={service.mocksRoot}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.6875rem",
            }}
          >
            {service.mocksRoot}
          </span>
        </div>
      </div>

      {/* Tags */}
      {service.tags.length > 0 && (
        <div className={styles.tags} aria-label="Service tags">
          {service.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: status pill + toggle + edit link */}
      <div className={styles.footer}>
        <div className={styles.statusPill} aria-live="polite" data-testid="status-pill">
          <span
            className={`${styles.dot} ${isLive ? styles.live : styles.stopped}`}
            aria-hidden="true"
          />
          <span className="status-label">{isLive ? "Live" : "Stopped"}</span>
        </div>
        <div className={styles.actions}>
          <label
            className={styles.toggle}
            htmlFor={toggleId}
            aria-label={`${isLive ? "Stop" : "Start"} ${service.name}`}
            data-testid={`service-toggle-${service.id}`}
          >
            <input
              id={toggleId}
              type="checkbox"
              checked={service.isActive}
              onChange={handleToggle}
              disabled={toggleMutation.isPending}
              aria-label={`${service.isActive ? "Stop" : "Start"} ${service.name}`}
            />
            <span className={styles.toggleTrack} />
            <span className={styles.toggleThumb} />
          </label>

          <button
            className={styles.editLink}
            onClick={() => onEdit(service)}
            aria-label={`Edit ${service.name}`}
            data-testid={`edit-service-${service.id}`}
          >
            Edit
          </button>
        </div>
      </div>
    </article>
  );
}
