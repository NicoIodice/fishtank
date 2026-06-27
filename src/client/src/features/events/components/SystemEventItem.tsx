import { Link } from "react-router-dom";
import {
  SEVERITY_ICON,
  SEVERITY_COLOR,
  type SystemEvent,
} from "../types/systemEvent";
import styles from "./SystemEventItem.module.css";

interface SystemEventItemProps {
  event: SystemEvent;
  variant: "panel" | "screen";
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  /** Optional id used by the events screen for deep-link scroll/highlight. */
  highlight?: boolean;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SystemEventItem({
  event,
  variant,
  onMarkRead,
  onDismiss,
  highlight = false,
}: SystemEventItemProps) {
  const isPanel = variant === "panel";
  const testId = isPanel
    ? `topbar-notification-item-${event.id}`
    : `events-item-${event.id}`;

  function handleBodyClick() {
    if (isPanel && !event.isRead) onMarkRead?.(event.id);
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    onDismiss?.(event.id);
  }

  const containerClass = [
    styles.item,
    isPanel ? styles.panelItem : styles.screenItem,
    !event.isRead && isPanel ? styles.unread : "",
    highlight ? "amber-highlight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={containerClass}
      data-testid={testId}
      data-event-id={event.id}
      onClick={isPanel ? handleBodyClick : undefined}
      role={isPanel ? "button" : undefined}
      tabIndex={isPanel ? 0 : undefined}
      onKeyDown={
        isPanel
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleBodyClick();
              }
            }
          : undefined
      }
    >
      <i
        className={`bi ${SEVERITY_ICON[event.severity]} ${styles.icon}`}
        aria-hidden="true"
        style={{
          color: SEVERITY_COLOR[event.severity],
          opacity: event.isRead ? 0.6 : 1,
        }}
      />

      <div className={styles.content}>
        <div className={styles.message}>
          {isPanel ? (
            <Link
              to={`/events?tab=warnings-errors&id=${event.id}`}
              className={styles.messageLink}
              onClick={(e) => e.stopPropagation()}
            >
              {event.message}
            </Link>
          ) : (
            <span>{event.message}</span>
          )}
        </div>

        <div className={styles.meta}>
          <time className={styles.timestamp} dateTime={event.createdAt}>
            {formatTimestamp(event.createdAt)}
          </time>
          {event.serviceName && (
            <span className={styles.serviceTag}>{event.serviceName}</span>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          data-testid={
            isPanel
              ? `topbar-notification-item-dismiss-${event.id}`
              : `events-item-dismiss-${event.id}`
          }
          aria-label="Dismiss — removes from this panel; event remains in System Events and is marked read."
          title="Dismiss — removes from this panel; event remains in System Events and is marked read."
          onClick={handleDismiss}
        >
          <i className="bi bi-x" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
