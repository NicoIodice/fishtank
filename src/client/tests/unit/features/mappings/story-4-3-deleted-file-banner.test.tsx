/**
 * ATDD component tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Component (Vitest + React Testing Library)
 *
 * RED PHASE — `DeletedFileBanner` component does not exist yet.
 * Import will fail until `src/client/src/features/mappings/components/DeletedFileBanner.tsx`
 * is created.
 *
 * ACs covered:
 *   AC-9  — Deleted-file banner appears when the active file no longer exists on disk.
 *
 * data-testid contract (DESIGN.md — verbatim):
 *   mappings-banner-deleted
 *   mappings-btn-close-deleted
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

// ─── RED: component does not exist yet ────────────────────────────────────────
import { DeletedFileBanner } from "@/features/mappings/components/DeletedFileBanner";

// ─────────────────────────────────────────────────────────────────────────────

describe("DeletedFileBanner — AC-9: rendering", () => {
  it('renders with data-testid="mappings-banner-deleted"', () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    expect(screen.getByTestId("mappings-banner-deleted")).toBeInTheDocument();
  });

  it("displays the deleted file message", () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    expect(
      screen.getByText("File no longer exists on disk."),
    ).toBeInTheDocument();
  });

  it('renders a "Close" button with data-testid="mappings-btn-close-deleted"', () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    expect(
      screen.getByTestId("mappings-btn-close-deleted"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-close-deleted")).toHaveTextContent(
      /Close/i,
    );
  });

  it("banner is visible by default", () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    expect(screen.getByTestId("mappings-banner-deleted")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("DeletedFileBanner — AC-9: action callback", () => {
  it('clicking "Close" calls onClose callback', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<DeletedFileBanner onClose={onClose} />);

    await user.click(screen.getByTestId("mappings-btn-close-deleted"));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('"Close" is the only action — no other buttons present', () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    // Only one button (the Close button) should be in the banner
    expect(buttons).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("DeletedFileBanner — accessibility", () => {
  it('has role="alert" or aria-live for screen-reader announcement', () => {
    render(<DeletedFileBanner onClose={vi.fn()} />);

    const banner = screen.getByTestId("mappings-banner-deleted");
    const role = banner.getAttribute("role");
    const ariaLive = banner.getAttribute("aria-live");

    expect(role === "alert" || ariaLive !== null).toBe(true);
  });
});
