import { useState, useRef, useEffect } from "react";
import type { ActivityRow } from "./types";

interface ProxyCounterPillProps {
  rows: ActivityRow[];
}

export function ProxyCounterPill({ rows }: ProxyCounterPillProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const pillRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Derive proxy count and per-service breakdown
  const proxiedRows = rows.filter((r) => r.type === "Proxied");
  const totalProxied = proxiedRows.length;

  // Check if any proxied row has 5xx status
  const hasError = proxiedRows.some((r) => r.statusCode >= 500);

  // Per-service breakdown
  const serviceMap = new Map<string, { name: string; count: number }>();
  proxiedRows.forEach((row) => {
    const existing = serviceMap.get(row.serviceId);
    if (existing) {
      existing.count++;
    } else {
      serviceMap.set(row.serviceId, {
        name: row.serviceName,
        count: 1,
      });
    }
  });

  const servicesWithProxied = Array.from(serviceMap.values()).filter(
    (s) => s.count > 0,
  );

  // Close on Esc or click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPopoverOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        pillRef.current &&
        popoverRef.current &&
        !pillRef.current.contains(e.target as Node) &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }

    if (popoverOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverOpen]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={pillRef}
        data-testid="activity-pill-proxy-count"
        role="button"
        aria-label={`Proxied request count — ${totalProxied} total`}
        aria-live="polite"
        aria-expanded={popoverOpen}
        onClick={() => setPopoverOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 12px",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: hasError ? "#ef4444" : "#374151",
          cursor: "pointer",
        }}
      >
        <i className="bi bi-arrow-repeat" aria-hidden="true" />
        <span>Proxied: {totalProxied}</span>
      </button>

      {popoverOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "240px",
            maxHeight: "300px",
            overflowY: "auto",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "12px",
            zIndex: 1000,
          }}
        >
          {servicesWithProxied.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#9ca3af",
                padding: "16px 0",
              }}
            >
              <i
                className="bi bi-arrow-repeat"
                style={{ fontSize: "1.5rem", display: "block", marginBottom: "8px" }}
                aria-hidden="true"
              />
              <p style={{ fontSize: "0.875rem", margin: 0 }}>
                No proxied requests recorded.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {servicesWithProxied.map((service) => (
                <li
                  key={service.name}
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid #f3f4f6",
                    fontSize: "0.875rem",
                  }}
                >
                  <strong>{service.name}</strong> — {service.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
