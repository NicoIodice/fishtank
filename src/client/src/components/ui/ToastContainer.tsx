import type { ToastMessage } from "@/lib/useToast";
import styles from "./ToastContainer.module.css";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className={styles.container} data-testid="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.variant]}`}
          role={toast.variant === "error" ? "alert" : "status"}
          data-testid={`toast-${toast.variant}`}
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.dismiss}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            data-testid="toast-dismiss"
          >
            <i className="bi bi-x" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
