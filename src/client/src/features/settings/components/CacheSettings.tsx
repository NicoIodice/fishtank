import { useState } from "react";
import {
  useServiceCaches,
  useClearCache,
  useClearAllCaches,
} from "../hooks/useServiceCache";
import { formatBytes } from "../types/cache";

export function CacheSettings() {
  const { data, isLoading } = useServiceCaches();
  const clearCache = useClearCache();
  const clearAllCaches = useClearAllCaches();
  // null = closed; "__all__" = clear-all confirm open; "{slug}" = per-service confirm open
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        style={{ color: "var(--content-muted)", padding: "var(--section-gap)" }}
      >
        Loading caches…
      </div>
    );
  }

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          padding: "var(--section-gap)",
          color: "var(--content-muted)",
        }}
      >
        <i className="bi bi-database" style={{ fontSize: "32px" }} />
        <p style={{ margin: 0, fontWeight: 500 }}>No service caches yet.</p>
        <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center" }}>
          Caches appear here once services are created and receive requests.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Clear All row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0",
          borderBottom: "1px solid var(--border)",
          marginBottom: "8px",
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 500 }}>All service caches</p>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--content-muted)",
            }}
          >
            Clear in-memory mappings for all running services
          </p>
        </div>
        <button
          data-testid="settings-btn-clear-all-caches"
          onClick={() => setConfirmSlug("__all__")}
          disabled={clearAllCaches.isPending}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--content-fg)",
            cursor: clearAllCaches.isPending ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {clearAllCaches.isPending && (
            <span
              className="bi bi-arrow-clockwise"
              style={{ animation: "spin 1s linear infinite" }}
            />
          )}
          Clear All
        </button>
      </div>

      {/* Per-service rows */}
      {entries.map((entry) => (
        <div
          key={entry.serviceId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 500 }}>{entry.serviceName}</p>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--content-muted)",
              }}
            >
              {entry.entryCount} {entry.entryCount === 1 ? "entry" : "entries"}{" "}
              · {formatBytes(entry.estimatedBytes)}
            </p>
          </div>
          <button
            data-testid={`settings-btn-clear-cache-${entry.slug}`}
            onClick={() => setConfirmSlug(entry.slug)}
            disabled={
              clearCache.isPending && clearCache.variables === entry.serviceId
            }
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--content-fg)",
              cursor:
                clearCache.isPending && clearCache.variables === entry.serviceId
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {clearCache.isPending &&
              clearCache.variables === entry.serviceId && (
                <span
                  className="bi bi-arrow-clockwise"
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
            Clear
          </button>
        </div>
      ))}

      {/* Clear All confirmation dialog */}
      {confirmSlug === "__all__" && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setConfirmSlug(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            data-testid="settings-modal-clear-all-caches-confirm"
            style={{
              background: "var(--content-bg)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--section-gap)",
              maxWidth: "420px",
              width: "100%",
              margin: "0 16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 600 }}
            >
              Clear all caches?
            </h3>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "0.875rem",
                color: "var(--content-muted)",
              }}
            >
              Clear all service caches? Cached mappings will be cleared for all
              services and reloaded from disk on the next request. This cannot
              be undone.
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                data-testid="settings-btn-clear-all-caches-cancel"
                onClick={() => setConfirmSlug(null)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--content-fg)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                data-testid="settings-btn-clear-all-caches-confirm"
                onClick={() => {
                  setConfirmSlug(null);
                  clearAllCaches.mutate();
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--brand)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Clear all caches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-service confirmation dialogs */}
      {confirmSlug !== null &&
        confirmSlug !== "__all__" &&
        (() => {
          const entry = entries.find((e) => e.slug === confirmSlug);
          if (!entry) return null;
          return (
            <div
              role="presentation"
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setConfirmSlug(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                data-testid={`settings-modal-clear-cache-confirm-${entry.slug}`}
                style={{
                  background: "var(--content-bg)",
                  borderRadius: "var(--radius-lg)",
                  padding: "var(--section-gap)",
                  maxWidth: "420px",
                  width: "100%",
                  margin: "0 16px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p
                  style={{
                    margin: "0 0 20px",
                    fontSize: "0.875rem",
                    color: "var(--content-muted)",
                  }}
                >
                  Clear cache for {entry.serviceName}? Cached mappings will be
                  cleared and reloaded from disk on the next request.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    data-testid={`settings-btn-clear-cache-cancel-${entry.slug}`}
                    onClick={() => setConfirmSlug(null)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--content-fg)",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    data-testid={`settings-btn-clear-cache-confirm-${entry.slug}`}
                    onClick={() => {
                      const id = entry.serviceId;
                      setConfirmSlug(null);
                      clearCache.mutate(id);
                    }}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--brand)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Clear cache
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
