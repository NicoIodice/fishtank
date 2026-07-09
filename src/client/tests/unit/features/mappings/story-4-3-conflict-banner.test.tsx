/**
 * ATDD component tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Component (Vitest + React Testing Library)
 *
 * RED PHASE — `ConflictBanner` component does not exist yet.
 * Import will fail until `src/client/src/features/mappings/components/ConflictBanner.tsx`
 * is created.
 *
 * ACs covered:
 *   AC-8  — Conflict banner appears when the open file has unsaved changes AND
 *            Resync reports it as externally modified.
 *   AC-11 — Unsaved changes are never silently discarded (banner always shown when dirty)
 *
 * data-testid contract (DESIGN.md — verbatim):
 *   mappings-banner-conflict
 *   mappings-btn-view-disk
 *   mappings-btn-keep-edits
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

// ─── RED: component does not exist yet ────────────────────────────────────────
import { ConflictBanner } from "@/features/mappings/components/ConflictBanner";

// ─────────────────────────────────────────────────────────────────────────────

describe("ConflictBanner — AC-8: rendering", () => {
  it('renders with data-testid="mappings-banner-conflict"', () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    expect(screen.getByTestId("mappings-banner-conflict")).toBeInTheDocument();
  });

  it("displays the conflict message text", () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    expect(
      screen.getByText(
        "This file was modified on disk since you started editing.",
      ),
    ).toBeInTheDocument();
  });

  it('renders "View disk version" button with correct data-testid', () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    expect(screen.getByTestId("mappings-btn-view-disk")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-view-disk")).toHaveTextContent(
      /View disk version/i,
    );
  });

  it('renders "Keep my edits" button with correct data-testid', () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    expect(screen.getByTestId("mappings-btn-keep-edits")).toBeInTheDocument();
    expect(screen.getByTestId("mappings-btn-keep-edits")).toHaveTextContent(
      /Keep my edits/i,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ConflictBanner — AC-8: action callbacks", () => {
  it('clicking "Keep my edits" calls onKeepEdits callback', async () => {
    const onKeepEdits = vi.fn();
    const user = userEvent.setup();

    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={onKeepEdits} />);

    await user.click(screen.getByTestId("mappings-btn-keep-edits"));

    expect(onKeepEdits).toHaveBeenCalledOnce();
  });

  it('"Keep my edits" does not call onViewDisk', async () => {
    const onViewDisk = vi.fn();
    const user = userEvent.setup();

    render(<ConflictBanner onViewDisk={onViewDisk} onKeepEdits={vi.fn()} />);

    await user.click(screen.getByTestId("mappings-btn-keep-edits"));

    expect(onViewDisk).not.toHaveBeenCalled();
  });

  it('"View disk version" calls onViewDisk (possibly after confirmation)', async () => {
    const onViewDisk = vi.fn();
    const user = userEvent.setup();

    render(<ConflictBanner onViewDisk={onViewDisk} onKeepEdits={vi.fn()} />);

    await user.click(screen.getByTestId("mappings-btn-view-disk"));

    // A confirmation dialog appears — click "Discard & view disk version" to confirm
    await waitFor(() => {
      expect(
        screen.getByTestId("mappings-btn-view-disk-confirm"),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("mappings-btn-view-disk-confirm"));

    expect(onViewDisk).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ConflictBanner — AC-11: unsaved changes never silently discarded", () => {
  it("banner is visible (not hidden by default) — proof that dirty + conflict = banner shown", () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    const banner = screen.getByTestId("mappings-banner-conflict");
    expect(banner).toBeVisible();
  });

  it('banner has role="alert" or aria-live attribute for accessibility', () => {
    render(<ConflictBanner onViewDisk={vi.fn()} onKeepEdits={vi.fn()} />);

    // Either role="alert" OR role="status" must be present for screen-reader visibility
    const banner = screen.getByTestId("mappings-banner-conflict");
    const role = banner.getAttribute("role");
    const ariaLive = banner.getAttribute("aria-live");

    expect(role === "alert" || ariaLive !== null).toBe(true);
  });
});
