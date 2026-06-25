import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useSystemEvents,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
} from "../hooks/useSystemEvents";
import type { SystemEvent } from "../types/systemEvent";
import { SystemEventItem } from "./SystemEventItem";
import styles from "./NotificationPanel.module.css";

interface NotificationPanelProps {
  onClose: () => void;
}

const SCROLL_THRESHOLD = 8;

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useSystemEvents("warnings-errors");
  const { data: unread = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [newCount, setNewCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const allItems: SystemEvent[] = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );

  const visibleItems = useMemo(
    () => allItems.filter((e) => !dismissedIds.has(e.id)),
    [allItems, dismissedIds],
  );

  // Prepend-while-open (AC-7): detect newly arrived ids by diffing against a
  // previously-seen ref (useEventsHub already invalidates ["events"], so the
  // infinite query re-fetches and surfaces new items at the top).
  useEffect(() => {
    const seen = seenIdsRef.current;
    if (seen.size === 0) {
      // First population — record without showing the pill.
      allItems.forEach((e) => seen.add(e.id));
      return;
    }
    const fresh = allItems.filter((e) => !seen.has(e.id));
    if (fresh.length > 0) {
      fresh.forEach((e) => seen.add(e.id));
      const atTop = (scrollRef.current?.scrollTop ?? 0) <= SCROLL_THRESHOLD;
      if (!atTop) setNewCount((n) => n + fresh.length);
    }
  }, [allItems]);

  function handleScroll() {
    if ((scrollRef.current?.scrollTop ?? 0) <= SCROLL_THRESHOLD) {
      setNewCount(0);
    }
  }

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setNewCount(0);
  }

  function handleMarkRead(id: string) {
    markRead.mutate(id);
  }

  function handleDismiss(id: string) {
    // View-only removal; underlying event is marked read server-side.
    setDismissedIds((prev) => new Set(prev).add(id));
    markRead.mutate(id);
  }

  return (
    <div
      className={styles.panel}
      role="dialog"
      aria-label="Notifications"
      data-testid="topbar-panel-notifications"
    >
      <div className={styles.header}>
        <span className={styles.title}>Notifications — warnings and errors</span>
        {unread > 0 && (
          <button
            type="button"
            className={styles.markAll}
            data-testid="topbar-btn-notification-mark-all-read"
            aria-label="Mark all notifications as read"
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.bodyWrapper}>
        {newCount > 0 && (
          <button
            type="button"
            className={styles.newPill}
            data-testid="topbar-btn-notification-new-pill"
            onClick={scrollToTop}
          >
            {newCount} new
          </button>
        )}

        <div className={styles.body} ref={scrollRef} onScroll={handleScroll}>
          {visibleItems.length === 0 ? (
            <div className={styles.empty} data-testid="topbar-panel-empty">
              <i className="bi bi-bell-slash" aria-hidden="true" />
              <p>No warnings or errors — all caught up.</p>
            </div>
          ) : (
            <>
              {visibleItems.map((event) => (
                <SystemEventItem
                  key={event.id}
                  event={event}
                  variant="panel"
                  onMarkRead={handleMarkRead}
                  onDismiss={handleDismiss}
                />
              ))}
              {hasNextPage && (
                <button
                  type="button"
                  className={styles.loadMore}
                  data-testid="topbar-btn-notification-load-more"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              )}
            </>
          )}
          {isLoading && visibleItems.length === 0 && (
            <div className={styles.empty}>
              <p>Loading…</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <Link
          to="/events"
          className={styles.footerLink}
          data-testid="topbar-link-notification-panel-footer"
          onClick={onClose}
        >
          See all events in System Events →
        </Link>
      </div>
    </div>
  );
}
