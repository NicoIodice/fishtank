/**
 * ATDD component tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Component (Vitest + React Testing Library + MSW)
 *
 * RED PHASE — `ResyncButton` component does not exist yet.
 * Import will fail until `src/client/src/features/mappings/components/ResyncButton.tsx` is created.
 *
 * ACs covered:
 *   AC-1  — Resync button visible in toolbar (data-testid="mappings-btn-resync")
 *   AC-2  — Spinner shown + disabled during POST /api/resync pending
 *   AC-2  — In-progress toast "Resyncing…" shown
 *   AC-3  — Success toast: "{M} mappings and {R} responses loaded in {duration}"
 *   AC-4  — Zero-files success toast with Mocks Root hint
 *   AC-5  — Duration formatted correctly via formatDuration
 *   AC-6  — Error toast: "Resync failed — …" shown; button re-enables
 *   AC-7  — Partial success: success toast for loaded + individual error toasts per failure
 *   AC-15 — 409 RESYNC_IN_PROGRESS → "Resync failed — A resync operation is already in progress."
 *   AC-16 — Error toast does NOT auto-dismiss
 *
 * data-testid contract (DESIGN.md — verbatim):
 *   mappings-btn-resync
 *   toast-resync-progress
 *   toast-resync-success
 *   toast-resync-error
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ─── MSW handler overrides ────────────────────────────────────────────────────
import { server } from "@/test/mocks/server";
import { http, HttpResponse } from "msw";

// ─── RED: component does not exist yet ────────────────────────────────────────
import { ResyncButton } from "@/features/mappings/components/ResyncButton";

// ─────────────────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeResyncResponse(
  overrides: Partial<{
    mappingsLoaded: number;
    responsesLoaded: number;
    elapsedMs: number;
    conflicts: { path: string; reason: string }[];
    failures: { path: string; reason: string }[];
  }> = {},
) {
  return {
    success: true,
    data: {
      mappingsLoaded: 5,
      responsesLoaded: 3,
      elapsedMs: 850,
      conflicts: [],
      failures: [],
      ...overrides,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-1: button rendering", () => {
  it('renders with data-testid="mappings-btn-resync"', () => {
    renderWithProviders(<ResyncButton />);
    expect(screen.getByTestId("mappings-btn-resync")).toBeInTheDocument();
  });

  it('renders with visible label "Resync"', () => {
    renderWithProviders(<ResyncButton />);
    expect(screen.getByTestId("mappings-btn-resync")).toHaveTextContent(
      "Resync",
    );
  });

  it("includes the bi-arrow-clockwise icon class", () => {
    renderWithProviders(<ResyncButton />);
    const btn = screen.getByTestId("mappings-btn-resync");
    // The bootstrap icon element should be present inside the button
    expect(btn.querySelector(".bi-arrow-clockwise")).toBeTruthy();
  });

  it("button is enabled when idle", () => {
    renderWithProviders(<ResyncButton />);
    expect(screen.getByTestId("mappings-btn-resync")).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-2: spinner + disabled during operation", () => {
  it("disables button while POST /api/resync is pending", async () => {
    // Delay the response so we can observe the pending state
    server.use(
      http.post("/api/resync", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(makeResyncResponse());
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    const btn = screen.getByTestId("mappings-btn-resync");
    await user.click(btn);

    // Immediately after click the button should be disabled
    expect(btn).toBeDisabled();
  });

  it("shows spinner element while pending", async () => {
    server.use(
      http.post("/api/resync", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(makeResyncResponse());
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    // A spinner element should be visible (role="status" or dedicated data-testid)
    expect(
      screen.queryByRole("status") ?? screen.queryByTestId("resync-spinner"),
    ).toBeTruthy();
  });

  it("shows in-progress toast 'Resyncing…' while pending (AC-2)", async () => {
    server.use(
      http.post("/api/resync", async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(makeResyncResponse());
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    expect(screen.getByText("Resyncing…")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-3: success toast format", () => {
  beforeEach(() => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          makeResyncResponse({
            mappingsLoaded: 5,
            responsesLoaded: 3,
            elapsedMs: 850,
          }),
        ),
      ),
    );
  });

  it("shows success toast with '{M} mappings and {R} responses loaded in {duration}'", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(
        screen.getByText("5 mappings and 3 responses loaded in 850ms"),
      ).toBeInTheDocument();
    });
  });

  it("re-enables button after successful Resync", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-resync")).not.toBeDisabled();
    });
  });

  it("dismisses the in-progress toast after success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      // Success toast shown
      expect(screen.queryByText("Resyncing…")).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-4: zero-files success toast", () => {
  it("shows zero-files hint when 0 mappings and 0 responses loaded", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          makeResyncResponse({
            mappingsLoaded: 0,
            responsesLoaded: 0,
            elapsedMs: 45,
          }),
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(
        screen.getByText(
          /0 files loaded in 45ms — check your Mocks Root path/i,
        ),
      ).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-5: duration formatting in toast", () => {
  it("formats elapsed time < 10000ms as '{N}ms' in success toast", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(makeResyncResponse({ elapsedMs: 850 })),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);
    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/850ms/)).toBeInTheDocument();
    });
  });

  it("formats elapsed time >= 10000ms as '{N.X}s' in success toast", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(makeResyncResponse({ elapsedMs: 12500 })),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);
    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/12\.5s/)).toBeInTheDocument();
    });
  });

  it("formats elapsed time >= 60000ms as '{M}m {S}s' in success toast", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(makeResyncResponse({ elapsedMs: 123456 })),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);
    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/2m 3s/)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-6: failure toast (network error)", () => {
  it("shows persistent error toast on network error", async () => {
    server.use(http.post("/api/resync", () => HttpResponse.error()));

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/Resync failed/i)).toBeInTheDocument();
    });
  });

  it("re-enables button after error (AC-6)", async () => {
    server.use(http.post("/api/resync", () => HttpResponse.error()));

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByTestId("mappings-btn-resync")).not.toBeDisabled();
    });
  });

  it("error toast persists (does not auto-dismiss) — AC-16", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: "NETWORK_ERROR", message: "Network error" },
          },
          { status: 500 },
        ),
      ),
    );

    // Use real timers for the click and waitFor to avoid the RTL asyncWrapper
    // deadlock that occurs when vi.useFakeTimers() is active (RTL's asyncWrapper
    // creates a setTimeout(0) promise and only advances it when it detects Jest
    // fake timers via `setTimeout._isMockFunction`; Vitest's fake timers don't
    // set that flag, causing user.click() to hang indefinitely).
    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/Resync failed/i)).toBeInTheDocument();
    });

    // Switch to fake timers only after the toast is visible, then advance past
    // the normal 4 s auto-dismiss window. Error toasts have persist:true so no
    // auto-dismiss timer is registered — the toast must still be visible.
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);

    // Error toast must still be visible
    expect(screen.getByText(/Resync failed/i)).toBeInTheDocument();

    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-15: 409 RESYNC_IN_PROGRESS", () => {
  it("shows error toast with 'already in progress' message on 409", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: "RESYNC_IN_PROGRESS",
              message: "A resync operation is already in progress.",
            },
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Resync failed — A resync operation is already in progress/i,
        ),
      ).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("ResyncButton — AC-7: partial success toasts", () => {
  it("shows success toast for loaded count AND error toast per failure", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          makeResyncResponse({
            mappingsLoaded: 3,
            responsesLoaded: 2,
            elapsedMs: 1200,
            failures: [
              {
                path: "svc/mappings/bad-file.json",
                reason: "Permission denied",
              },
            ],
          }),
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      // Success toast for the loaded count
      expect(
        screen.getByText(/3 mappings and 2 responses loaded/i),
      ).toBeInTheDocument();

      // Error toast for the individual failure
      expect(
        screen.getByText(/bad-file\.json.*Permission denied/i),
      ).toBeInTheDocument();
    });
  });

  it("shows one error toast per failure when multiple failures", async () => {
    server.use(
      http.post("/api/resync", () =>
        HttpResponse.json(
          makeResyncResponse({
            mappingsLoaded: 1,
            responsesLoaded: 0,
            elapsedMs: 300,
            failures: [
              { path: "svc/mappings/file-a.json", reason: "Read error" },
              { path: "svc/mappings/file-b.json", reason: "Parse error" },
            ],
          }),
        ),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ResyncButton />);

    await user.click(screen.getByTestId("mappings-btn-resync"));

    await waitFor(() => {
      expect(screen.getByText(/file-a\.json/i)).toBeInTheDocument();
      expect(screen.getByText(/file-b\.json/i)).toBeInTheDocument();
    });
  });
});
