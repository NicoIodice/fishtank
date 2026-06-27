/**
 * Component tests for Story 2.4 — NotificationBadge.
 * Covers the P1 "99+" overflow scenario (test-design-epic-2.md line 241):
 *   - renders the number for 1..99
 *   - renders "99+" above 99 with the >99 aria-label
 *   - renders nothing when count is 0
 *
 * Uses plain DOM assertions (the project does not install @testing-library/jest-dom).
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NotificationBadge } from "@/features/events/components/NotificationBadge";

describe("NotificationBadge", () => {
  it("renders the number for 1..99", () => {
    render(<NotificationBadge count={42} />);
    const b = screen.getByTestId("topbar-badge-bell");
    expect(b.textContent).toBe("42");
    expect(b.getAttribute("aria-label")).toBe("42 unread warnings and errors");
  });

  it('renders "99+" above 99', () => {
    render(<NotificationBadge count={150} />);
    const b = screen.getByTestId("topbar-badge-bell");
    expect(b.textContent).toBe("99+");
    expect(b.getAttribute("aria-label")).toBe(
      "More than 99 unread warnings and errors",
    );
  });

  it("renders exactly 99 (boundary) without overflow", () => {
    render(<NotificationBadge count={99} />);
    expect(screen.getByTestId("topbar-badge-bell").textContent).toBe("99");
  });

  it("renders nothing when count is 0", () => {
    render(<NotificationBadge count={0} />);
    expect(screen.queryByTestId("topbar-badge-bell")).toBeNull();
  });
});
