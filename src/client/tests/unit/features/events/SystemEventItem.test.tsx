/**
 * Component tests for Story 2.4 — SystemEventItem (shared panel/screen renderer).
 *
 * Fills the AC-5 read-state visual-cue gap not covered by NotificationPanel.test:
 *   - unread panel item → severity icon at full opacity;
 *   - read panel item   → severity icon dropped to opacity 0.6 (the non-color
 *     secondary cue, DESIGN.md line 466), and clicking the body does NOT re-fire
 *     onMarkRead;
 *   - clicking an unread body fires onMarkRead once;
 *   - clicking the inline deep-link or the ✕ button does NOT bubble to onMarkRead
 *     (stopPropagation), and the link targets /events?tab=warnings-errors&id={id};
 *   - the screen variant uses the events-item-{id} testid and renders the message
 *     verbatim (no deep-link wrapper), with the service tag omitted when null.
 *
 * Plain DOM assertions (the project does not install @testing-library/jest-dom).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SystemEventItem } from "@/features/events/components/SystemEventItem";
import type { SystemEvent } from "@/features/events/types/systemEvent";

function makeEvent(overrides: Partial<SystemEvent> = {}): SystemEvent {
  return {
    id: "evt-1",
    severity: "error",
    message: "Engine failed to start: bind 0.0.0.0:30100 in use",
    serviceId: "svc-1",
    serviceName: "Weather API",
    createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)).toISOString(),
    isRead: false,
    ...overrides,
  };
}

function renderItem(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

function iconOf(container: HTMLElement): HTMLElement {
  // The severity icon is the <i class="bi ..."> rendered first inside the item.
  const icon = container.querySelector("i.bi");
  if (!icon) throw new Error("severity icon not found");
  return icon as HTMLElement;
}

describe("SystemEventItem — AC-5 read-state cues (panel variant)", () => {
  it("unread item renders the severity icon at full opacity", () => {
    renderItem(<SystemEventItem event={makeEvent({ isRead: false })} variant="panel" />);
    const item = screen.getByTestId("topbar-notification-item-evt-1");
    expect(iconOf(item).style.opacity).toBe("1");
  });

  it("read item drops the severity icon to opacity 0.6 and does not re-fire onMarkRead on body click", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    renderItem(
      <SystemEventItem
        event={makeEvent({ isRead: true })}
        variant="panel"
        onMarkRead={onMarkRead}
      />,
    );
    const item = screen.getByTestId("topbar-notification-item-evt-1");
    expect(iconOf(item).style.opacity).toBe("0.6");

    await user.click(item);
    expect(onMarkRead).not.toHaveBeenCalled(); // already read → no-op
  });

  it("clicking an unread body fires onMarkRead exactly once with the event id", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    renderItem(
      <SystemEventItem
        event={makeEvent({ isRead: false })}
        variant="panel"
        onMarkRead={onMarkRead}
      />,
    );

    await user.click(screen.getByTestId("topbar-notification-item-evt-1"));
    expect(onMarkRead).toHaveBeenCalledTimes(1);
    expect(onMarkRead).toHaveBeenCalledWith("evt-1");
  });

  it("clicking the inline deep-link does not bubble to onMarkRead and targets the events screen", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    renderItem(
      <SystemEventItem
        event={makeEvent({ isRead: false })}
        variant="panel"
        onMarkRead={onMarkRead}
      />,
    );

    const link = within(
      screen.getByTestId("topbar-notification-item-evt-1"),
    ).getByRole("link");
    expect(link.getAttribute("href")).toBe(
      "/events?tab=warnings-errors&id=evt-1",
    );

    await user.click(link);
    expect(onMarkRead).not.toHaveBeenCalled(); // stopPropagation guards the body handler
  });

  it("clicking the ✕ dismiss button fires onDismiss but not onMarkRead", async () => {
    const user = userEvent.setup();
    const onMarkRead = vi.fn();
    const onDismiss = vi.fn();
    renderItem(
      <SystemEventItem
        event={makeEvent({ isRead: false })}
        variant="panel"
        onMarkRead={onMarkRead}
        onDismiss={onDismiss}
      />,
    );

    await user.click(
      screen.getByTestId("topbar-notification-item-dismiss-evt-1"),
    );
    expect(onDismiss).toHaveBeenCalledWith("evt-1");
    expect(onMarkRead).not.toHaveBeenCalled();
  });
});

describe("SystemEventItem — screen variant", () => {
  it("uses the events-item-{id} testid and renders the message verbatim (no deep-link wrapper)", () => {
    const msg = "C:/mocks/weather/__files/x.json missing — write failed";
    renderItem(<SystemEventItem event={makeEvent({ message: msg })} variant="screen" />);
    const item = screen.getByTestId("events-item-evt-1");
    expect(within(item).queryByRole("link")).toBeNull(); // screen variant = plain text
    expect(item.textContent).toContain(msg); // verbatim, never reduced to "stopped"
  });

  it("omits the service tag entirely when serviceName is null", () => {
    renderItem(
      <SystemEventItem
        event={makeEvent({ serviceId: null, serviceName: null })}
        variant="screen"
      />,
    );
    const item = screen.getByTestId("events-item-evt-1");
    expect(item.textContent).not.toContain("Weather API");
  });
});
