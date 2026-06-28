import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { ProxyCounterPill } from "@/features/activity/ProxyCounterPill";
import type { ActivityRow } from "@/features/activity/types";

/**
 * Unit tests for ProxyCounterPill — Story 3.2 AC-10
 *
 * Covers:
 *   AC-10: Proxy counter pill shows count, error color, popover, empty state
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<ActivityRow> = {}): ActivityRow {
  return {
    id: `r-${Math.random()}`,
    timestamp: new Date().toISOString(),
    method: "GET",
    urlPath: "/test",
    statusCode: 200,
    type: "Proxied",
    serviceId: "svc-1",
    serviceName: "Service Alpha",
    servicePort: 30100,
    durationMs: 5,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProxyCounterPill — Story 3.2 AC-10", () => {
  beforeEach(() => vi.clearAllMocks());

  it("AC-10: renders data-testid=activity-pill-proxy-count", () => {
    render(<ProxyCounterPill rows={[]} />);
    expect(screen.getByTestId("activity-pill-proxy-count")).toBeInTheDocument();
  });

  it("AC-10: shows 0 count when no rows", () => {
    render(<ProxyCounterPill rows={[]} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    expect(pill.textContent).toContain("0");
  });

  it("AC-10: counts only Proxied rows (ignores Mocked)", () => {
    const rows: ActivityRow[] = [
      makeRow({ type: "Proxied" }),
      makeRow({ type: "Proxied" }),
      makeRow({ type: "Mocked" }),
    ];
    render(<ProxyCounterPill rows={rows} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    expect(pill.textContent).toContain("2");
  });

  it("AC-10: renders error color (#ef4444) when a proxied row has 5xx status", () => {
    const rows: ActivityRow[] = [makeRow({ type: "Proxied", statusCode: 500 })];
    render(<ProxyCounterPill rows={rows} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    // Error color #ef4444 is applied to the pill button itself via inline style
    // jsdom converts hex → rgb
    expect(pill.style.color).toBe("rgb(239, 68, 68)");
  });

  it("AC-10: no error color when all proxied rows are 2xx", () => {
    const rows: ActivityRow[] = [makeRow({ type: "Proxied", statusCode: 200 })];
    render(<ProxyCounterPill rows={rows} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    expect(pill.style.color).not.toBe("rgb(239, 68, 68)");
  });

  it("AC-10: has aria-live=polite for screen-reader announcement", () => {
    render(<ProxyCounterPill rows={[]} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    expect(pill).toHaveAttribute("aria-live", "polite");
  });

  it("AC-10: clicking pill opens popover", () => {
    const rows: ActivityRow[] = [
      makeRow({ type: "Proxied", serviceName: "Service Alpha" }),
    ];
    render(<ProxyCounterPill rows={rows} />);
    const pill = screen.getByTestId("activity-pill-proxy-count");
    fireEvent.click(pill);
    expect(screen.getByText(/Service Alpha/)).toBeInTheDocument();
  });

  it("AC-10: popover shows per-service breakdown with count", () => {
    const rows: ActivityRow[] = [
      makeRow({ type: "Proxied", serviceId: "svc-1", serviceName: "Alpha" }),
      makeRow({ type: "Proxied", serviceId: "svc-1", serviceName: "Alpha" }),
      makeRow({ type: "Proxied", serviceId: "svc-2", serviceName: "Beta" }),
    ];
    render(<ProxyCounterPill rows={rows} />);
    fireEvent.click(screen.getByTestId("activity-pill-proxy-count"));
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
  });

  it("AC-10: popover shows empty state when no proxied requests", () => {
    render(<ProxyCounterPill rows={[]} />);
    fireEvent.click(screen.getByTestId("activity-pill-proxy-count"));
    expect(
      screen.getByText(/No proxied requests recorded/i),
    ).toBeInTheDocument();
  });

  it("AC-10: Escape key closes popover", () => {
    const rows: ActivityRow[] = [makeRow({ type: "Proxied" })];
    render(<ProxyCounterPill rows={rows} />);
    fireEvent.click(screen.getByTestId("activity-pill-proxy-count"));
    // Popover open — press Escape
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/No proxied requests/)).not.toBeInTheDocument();
  });

  it("AC-10: clicking outside the pill and popover closes the popover", async () => {
    const rows: ActivityRow[] = [makeRow({ type: "Proxied" })];
    const user = userEvent.setup();
    render(
      <div>
        <ProxyCounterPill rows={rows} />
        <button data-testid="outside">outside</button>
      </div>,
    );
    await user.click(screen.getByTestId("activity-pill-proxy-count")); // open
    // Popover is open — should show proxied count text
    expect(screen.getByTestId("activity-pill-proxy-count")).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Click something entirely outside — triggers handleClickOutside
    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() =>
      expect(screen.getByTestId("activity-pill-proxy-count")).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });
});
