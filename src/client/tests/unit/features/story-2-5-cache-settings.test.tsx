/**
 * Component tests for Story 2.5 — CacheSettings
 *
 * ACs covered:
 *   AC-1: loading state renders; list renders with service name, entry count,
 *         and formatBytes output.
 *   AC-2: per-service Clear button → confirmation dialog opens (role="dialog"
 *         visible); Cancel closes without calling mutation; Confirm calls
 *         the useClearCache mutation (DELETE /api/cache/{id}).
 *   AC-3: Clear All button → its own confirmation dialog opens; Confirm calls
 *         useClearAllCaches mutation (DELETE /api/cache).
 *   AC-4: empty state shows bi-database icon + "No service caches yet." text.
 *
 * Uses vi.stubGlobal("fetch") following the project's existing test patterns
 * (NotificationPanel.test, story-2-3-toggle.test, etc.).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CacheSettings } from "@/features/settings/components/CacheSettings";
import type { ServiceCacheEntry } from "@/features/settings/types/cache";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CACHE_ENTRIES: ServiceCacheEntry[] = [
  {
    serviceId: "aaa-111-aaa-111-aaa1",
    serviceName: "Payments API",
    slug: "payments-api",
    entryCount: 7,
    estimatedBytes: 1536, // → "1.5 KB"
  },
  {
    serviceId: "bbb-222-bbb-222-bbb2",
    serviceName: "Auth Service",
    slug: "auth-service",
    entryCount: 1,
    estimatedBytes: 512, // → "512 B"
  },
];

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

/** Installs a fetch stub that serves CACHE_ENTRIES for GET and succeeds for DELETE. */
function installFetchSuccess(
  entries: ServiceCacheEntry[] = CACHE_ENTRIES,
): ReturnType<typeof vi.fn> {
  const mock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    if (method === "GET") return jsonOk({ success: true, data: entries });
    if (method === "DELETE") return jsonOk({ success: true, data: null });
    throw new Error(`Unexpected fetch: ${method}`);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** Installs a fetch stub whose GET promise never resolves → isLoading stays true. */
function installFetchPending(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
}

// ─── Render helper ───────────────────────────────────────────────────────────

function renderCacheSettings() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CacheSettings />
    </QueryClientProvider>,
  );
}

// ─── Test suites ─────────────────────────────────────────────────────────────

beforeEach(() => {
  installFetchSuccess();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── AC-1: Loading state ──────────────────────────────────────────────────────

describe("CacheSettings — AC-1: loading state", () => {
  it("shows loading text while data is being fetched", () => {
    installFetchPending();
    renderCacheSettings();
    expect(screen.getByText(/loading caches/i)).toBeDefined();
  });
});

// ─── AC-4: Empty state ────────────────────────────────────────────────────────

describe("CacheSettings — AC-4: empty state (no services)", () => {
  beforeEach(() => {
    installFetchSuccess([]);
  });

  it("shows the bi-database icon when data is empty", async () => {
    const { container } = renderCacheSettings();
    await waitFor(() => {
      const icon = container.querySelector("i.bi-database");
      expect(icon).not.toBeNull();
    });
  });

  it('shows "No service caches yet." primary text', async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(screen.getByText("No service caches yet.")).toBeDefined();
    });
  });

  it("shows the secondary empty-state description text", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(
        screen.getByText(/Caches appear here once services are created/i),
      ).toBeDefined();
    });
  });
});

// ─── AC-1: List rendering ─────────────────────────────────────────────────────

describe("CacheSettings — AC-1: list rendering", () => {
  it("renders service names for all entries", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(screen.getByText("Payments API")).toBeDefined();
      expect(screen.getByText("Auth Service")).toBeDefined();
    });
  });

  it("renders entry counts (plural and singular)", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(screen.getByText(/7 entries/)).toBeDefined(); // plural
      expect(screen.getByText(/1 entry/)).toBeDefined(); // singular
    });
  });

  it("renders formatBytes output for each service's estimated size", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(screen.getByText(/1\.5 KB/)).toBeDefined(); // 1536 bytes
      expect(screen.getByText(/512 B/)).toBeDefined(); // 512 bytes
    });
  });

  it("renders per-service Clear buttons with correct testids", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(
        screen.getByTestId("settings-btn-clear-cache-payments-api"),
      ).toBeDefined();
      expect(
        screen.getByTestId("settings-btn-clear-cache-auth-service"),
      ).toBeDefined();
    });
  });

  it("renders the Clear All button", async () => {
    renderCacheSettings();
    await waitFor(() => {
      expect(screen.getByTestId("settings-btn-clear-all-caches")).toBeDefined();
    });
  });
});

// ─── AC-2: Per-service Clear dialog ──────────────────────────────────────────

describe("CacheSettings — AC-2: per-service Clear confirmation dialog", () => {
  it("clicking Clear opens the confirmation dialog", async () => {
    const user = userEvent.setup();
    renderCacheSettings();
    await waitFor(() =>
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );

    await user.click(
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByTestId("settings-modal-clear-cache-confirm-payments-api"),
    ).toBeDefined();
  });

  it("Cancel closes the dialog without calling the delete mutation", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchSuccess();
    renderCacheSettings();
    await waitFor(() =>
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );

    await user.click(
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );
    await user.click(
      screen.getByTestId("settings-btn-clear-cache-cancel-payments-api"),
    );

    // Dialog should be gone
    expect(screen.queryByRole("dialog")).toBeNull();

    // No DELETE call should have been made
    const deleteCalls = (
      fetchMock.mock.calls as [RequestInfo | URL, RequestInit?][]
    ).filter(([, init]) => (init?.method ?? "GET").toUpperCase() === "DELETE");
    expect(deleteCalls).toHaveLength(0);
  });

  it("Confirm calls the clear-cache mutation (DELETE /api/cache/{id})", async () => {
    const user = userEvent.setup();
    const deleteMock = vi.fn(async () => jsonOk({ success: true, data: null }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method === "DELETE") return deleteMock();
        return jsonOk({ success: true, data: CACHE_ENTRIES });
      }),
    );

    renderCacheSettings();
    await waitFor(() =>
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );

    await user.click(
      screen.getByTestId("settings-btn-clear-cache-payments-api"),
    );
    await user.click(
      screen.getByTestId("settings-btn-clear-cache-confirm-payments-api"),
    );

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── AC-3: Clear All dialog ───────────────────────────────────────────────────

describe("CacheSettings — AC-3: Clear All confirmation dialog", () => {
  it("clicking Clear All opens the clear-all dialog", async () => {
    const user = userEvent.setup();
    renderCacheSettings();
    await waitFor(() => screen.getByTestId("settings-btn-clear-all-caches"));

    await user.click(screen.getByTestId("settings-btn-clear-all-caches"));

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(
      screen.getByTestId("settings-modal-clear-all-caches-confirm"),
    ).toBeDefined();
  });

  it("Cancel on Clear All dialog closes it without calling mutation", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetchSuccess();
    renderCacheSettings();
    await waitFor(() => screen.getByTestId("settings-btn-clear-all-caches"));

    await user.click(screen.getByTestId("settings-btn-clear-all-caches"));
    await user.click(
      screen.getByTestId("settings-btn-clear-all-caches-cancel"),
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    const deleteCalls = (
      fetchMock.mock.calls as [RequestInfo | URL, RequestInit?][]
    ).filter(([, init]) => (init?.method ?? "GET").toUpperCase() === "DELETE");
    expect(deleteCalls).toHaveLength(0);
  });

  it("Confirm Clear All calls the clear-all-caches mutation (DELETE /api/cache)", async () => {
    const user = userEvent.setup();
    const deleteMock = vi.fn(async () => jsonOk({ success: true, data: null }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = (init?.method ?? "GET").toUpperCase();
        if (method === "DELETE") return deleteMock();
        return jsonOk({ success: true, data: CACHE_ENTRIES });
      }),
    );

    renderCacheSettings();
    await waitFor(() => screen.getByTestId("settings-btn-clear-all-caches"));

    await user.click(screen.getByTestId("settings-btn-clear-all-caches"));
    await user.click(
      screen.getByTestId("settings-btn-clear-all-caches-confirm"),
    );

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledTimes(1);
    });
  });
});
