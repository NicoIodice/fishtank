import styles from "./NotificationBadge.module.css";

interface NotificationBadgeProps {
  count: number;
}

/**
 * Unread warnings+errors badge for the notification bell.
 * The ONE sanctioned hardcoded-color element (#ef4444 / white) per DESIGN.md line 219.
 */
export function NotificationBadge({ count }: NotificationBadgeProps) {
  if (count <= 0) return null;

  const display = count > 99 ? "99+" : String(count);
  const label =
    count > 99
      ? "More than 99 unread warnings and errors"
      : `${count} unread warnings and errors`;

  return (
    <span
      className={styles.badge}
      data-testid="topbar-badge-bell"
      aria-live="polite"
      aria-label={label}
    >
      {display}
    </span>
  );
}
