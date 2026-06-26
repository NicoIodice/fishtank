import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useSystemEvents,
  useMarkAllRead,
  useClearAll,
  useUnreadCount,
  type EventGroup,
} from "../hooks/useSystemEvents";
import type { SystemEvent } from "../types/systemEvent";
import { SystemEventItem } from "../components/SystemEventItem";
import styles from "./EventsPage.module.css";

function usePrefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function EventList({
  group,
  highlightId,
}: {
  group: EventGroup;
  highlightId: string | null;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSystemEvents(group);

  const items: SystemEvent[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const [highlightActive, setHighlightActive] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Deep-link (AC-10): scroll the matching item into view + 1s amber highlight.
  useEffect(() => {
    if (!highlightId) return;
    const el = listRef.current?.querySelector(
      `[data-event-id="${highlightId}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    if (reducedMotion) return;
    const tStart = window.setTimeout(() => setHighlightActive(highlightId), 0);
    const tEnd = window.setTimeout(() => setHighlightActive(null), 1000);
    return () => {
      window.clearTimeout(tStart);
      window.clearTimeout(tEnd);
    };
  }, [highlightId, items, reducedMotion]);

  if (isLoading) {
    return (
      <div className={styles.stateBox} data-testid="events-loading">
        <i
          className="bi bi-arrow-clockwise"
          aria-hidden="true"
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span>Loading events…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="events-empty">
        <i
          className="bi bi-journal-text"
          aria-hidden="true"
          style={{ fontSize: "48px", color: "var(--content-muted)" }}
        />
        <p className={styles.emptyTitle}>No events yet</p>
        <p className={styles.emptySub}>
          System events will appear here as services start and stop.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list} ref={listRef}>
      {items.map((event) => (
        <SystemEventItem
          key={event.id}
          event={event}
          variant="screen"
          highlight={highlightActive === event.id}
        />
      ))}
      {hasNextPage && (
        <button
          type="button"
          className={styles.loadMore}
          data-testid="events-btn-load-more"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}

function TabCount({ group }: { group: EventGroup }) {
  const { data } = useSystemEvents(group);
  const total = data?.pages[0]?.total ?? 0;
  return <span className={styles.tabCount}>{total}</span>;
}

export function EventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: EventGroup = tabParam === "info" ? "info" : "warnings-errors";
  const highlightId = searchParams.get("id");

  const markAllRead = useMarkAllRead();
  const clearAll = useClearAll();
  const { data: unread = 0 } = useUnreadCount();

  const [clearConfirm, setClearConfirm] = useState<EventGroup | null>(null);

  function selectTab(tab: EventGroup) {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    next.delete("id");
    setSearchParams(next, { replace: true });
  }

  function confirmClear() {
    if (clearConfirm) clearAll.mutate(clearConfirm);
    setClearConfirm(null);
  }

  return (
    <main data-testid="page-events">
      <div className={styles.headerRow}>
        <h1 className="page-title">System Events</h1>
        <div className={styles.actions}>
          {activeTab === "warnings-errors" && unread > 0 && (
            <button
              type="button"
              className={styles.actionBtn}
              data-testid="events-btn-mark-all-read"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
          {activeTab === "warnings-errors" ? (
            <button
              type="button"
              className={styles.actionBtnDanger}
              data-testid="events-btn-clear-all-warnings"
              onClick={() => setClearConfirm("warnings-errors")}
            >
              Clear all
            </button>
          ) : (
            <button
              type="button"
              className={styles.actionBtnDanger}
              data-testid="events-btn-clear-all-info"
              onClick={() => setClearConfirm("info")}
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="System event groups">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "warnings-errors"}
          className={`${styles.tab} ${activeTab === "warnings-errors" ? styles.tabActive : ""}`}
          data-testid="events-tab-warnings"
          onClick={() => selectTab("warnings-errors")}
        >
          Warnings &amp; Errors <TabCount group="warnings-errors" />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "info"}
          className={`${styles.tab} ${activeTab === "info" ? styles.tabActive : ""}`}
          data-testid="events-tab-info"
          onClick={() => selectTab("info")}
        >
          Info <TabCount group="info" />
        </button>
      </div>

      <EventList
        group={activeTab}
        highlightId={activeTab === "warnings-errors" ? highlightId : null}
      />

      {clearConfirm && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setClearConfirm(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            data-testid={
              clearConfirm === "info"
                ? "events-modal-clear-all-info-confirm"
                : "events-modal-clear-all-warnings-confirm"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Clear all events?</h2>
            <p className={styles.modalBody}>
              This permanently deletes all{" "}
              {clearConfirm === "info" ? "info" : "warning and error"} events.
              This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setClearConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.actionBtnDanger}
                data-testid={
                  clearConfirm === "info"
                    ? "events-btn-clear-all-info-confirm"
                    : "events-btn-clear-all-warnings-confirm"
                }
                onClick={confirmClear}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
