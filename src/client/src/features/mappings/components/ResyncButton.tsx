import React, { useCallback, useRef, useEffect } from "react";
import { useResync } from "../hooks/useResync";
import { useToast } from "@/lib/useToast";
import { formatDuration } from "../utils/formatDuration";
import { ApiError } from "@/lib/api";
import type { ResyncResultDto } from "../types/mappings";

// ─── Toast list ───────────────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  message: string;
  variant: string;
}

function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 2100,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          data-testid={
            t.variant === "error"
              ? "toast-resync-error"
              : t.variant === "success"
                ? "toast-resync-success"
                : "toast-resync-progress"
          }
          role={
            t.variant === "error"
              ? "alert"
              : t.variant === "success"
                ? "status"
                : undefined
          }
          aria-live={t.variant === "error" ? "assertive" : "polite"}
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            background:
              t.variant === "error"
                ? "var(--danger, #ef4444)"
                : t.variant === "success"
                  ? "var(--success, #22c55e)"
                  : "var(--brand, #3b82f6)",
            color: "#fff",
            fontSize: "0.875rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            maxWidth: "400px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "0 4px",
              fontSize: "1rem",
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Spinner keyframes injection ─────────────────────────────────────────────

function useSpinnerStyles() {
  useEffect(() => {
    const id = "resync-spinner-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes resync-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .resync-spinner-icon {
        display: inline-block;
        animation: resync-spin 1s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .resync-spinner-icon { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }, []);
}

// ─── ResyncButton ─────────────────────────────────────────────────────────────

interface ResyncButtonProps {
  onResyncComplete?: (result: ResyncResultDto) => void;
  onPendingChange?: (pending: boolean) => void;
}

/**
 * Resync button with spinner, in-progress/success/failure/partial-success toasts.
 *
 * ACs: 1, 2, 3, 4, 5, 6, 7, 15, 16
 */
export function ResyncButton({
  onResyncComplete,
  onPendingChange,
}: ResyncButtonProps) {
  useSpinnerStyles();

  const { toasts, showToast, dismissToast } = useToast();
  const progressToastIdRef = useRef<string | null>(null);
  const mutation = useResync();

  // Notify parent when pending state changes (AC-12: hide save button during resync)
  useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  const handleClick = useCallback(() => {
    // Show in-progress toast (info, auto-dismiss off via default info behaviour,
    // but we'll dismiss it programmatically in onSuccess/onError)
    const progressId = showToast("Resyncing…", "info");
    progressToastIdRef.current = progressId;

    mutation.mutate(undefined, {
      onSuccess: (result) => {
        // Dismiss in-progress toast
        if (progressToastIdRef.current) {
          dismissToast(progressToastIdRef.current);
          progressToastIdRef.current = null;
        }

        const { mappingsLoaded, responsesLoaded, elapsedMs, failures } = result;
        const duration = formatDuration(elapsedMs);

        // AC-4: zero-files toast
        if (
          mappingsLoaded === 0 &&
          responsesLoaded === 0 &&
          failures.length === 0
        ) {
          showToast(
            `0 files loaded in ${duration} — check your Mocks Root path and volume configuration.`,
            "success",
          );
        } else {
          // AC-3: normal success toast
          showToast(
            `${mappingsLoaded} mappings and ${responsesLoaded} responses loaded in ${duration}`,
            "success",
          );
        }

        // AC-7: individual error toasts for each failure
        for (const failure of failures) {
          const filename = failure.path.split("/").pop() ?? failure.path;
          showToast(`Failed to load ${filename} — ${failure.reason}`, "error");
        }

        // Notify parent (for conflict/deleted detection)
        onResyncComplete?.(result);
      },
      onError: (err) => {
        // Dismiss in-progress toast
        if (progressToastIdRef.current) {
          dismissToast(progressToastIdRef.current);
          progressToastIdRef.current = null;
        }

        // AC-6, AC-15: persistent error toast
        if (err instanceof ApiError) {
          if (err.code === "RESYNC_IN_PROGRESS") {
            showToast(
              "Resync failed — A resync operation is already in progress. Please wait.",
              "error",
            );
          } else {
            showToast(`Resync failed — ${err.message}`, "error");
          }
        } else {
          showToast("Resync failed — Unknown error.", "error");
        }
      },
    });
  }, [showToast, dismissToast, mutation, onResyncComplete]);

  const isPending = mutation.isPending;

  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    border: "1px solid var(--input-border, #e5e7eb)",
    borderRadius: "4px",
    background: "var(--surface, #fff)",
    color: isPending
      ? "var(--content-muted, #6b7280)"
      : "var(--content-fg, #374151)",
    fontSize: "0.8125rem",
    cursor: isPending ? "not-allowed" : "pointer",
    opacity: isPending ? 0.7 : 1,
  };

  return (
    <>
      <button
        data-testid="mappings-btn-resync"
        aria-label="Resync files from disk"
        disabled={isPending}
        onClick={handleClick}
        style={btnStyle}
      >
        {isPending ? (
          <span
            role="status"
            data-testid="resync-spinner"
            aria-label="Syncing"
            className="resync-spinner-icon"
          >
            <i className="bi bi-arrow-repeat" aria-hidden="true" />
          </span>
        ) : (
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
        )}
        Resync
      </button>

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
