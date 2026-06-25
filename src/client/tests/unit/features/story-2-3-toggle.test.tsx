/**
 * Acceptance unit tests for Story 2.3:
 * Enable/Disable Service Toggle â€” Optimistic UI + Toast on Error
 *
 * ACs covered:
 *   AC-1a: Toggle click â†’ isActive flips immediately (optimistic update)
 *           before the server responds (status pill does NOT change).
 *   AC-1b: Server returns 5xx â†’ toggle reverts to original state + error toast shown.
 *   AC-1c: data-testid="service-toggle-{id}" is present on the toggle input.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import { ServiceCard } from "@/features/services/components/ServiceCard";
import { ToastProvider } from "@/components/ui/Toast";
import type { Service } from "@/features/services/types/service";

// â”€â”€â”€ Fixtures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SERVICE_ID = "550e8400-e29b-41d4-a716-446655440099";

const liveService: Service = {
  id: SERVICE_ID,
  name: "Payments Mock",
  slug: "payments-mock",
  description: "Mock for the payments service",
  externalUrl: "http://payments.example.com",
  port: 30183,
  mocksRoot: "/app/mocks/payments-mock",
  status: "live",
  isActive: true,
  tags: [],
  createdAt: "2025-01-01T00:00:00Z",
  mockFileCount: 2,
};

const stoppedService: Service = {
  ...liveService,
  status: "stopped",
  isActive: false,
};

const SERVICES_QUERY_KEY = ["services"];

// â”€â”€â”€ Wrapper that feeds ServiceCard from the QueryClient cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// This ensures optimistic setQueryData updates flow back through to the card.

function ServiceCardFromCache({ onEdit }: { onEdit: () => void }) {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  return (
    <>
      {services.map((svc) => (
        <ServiceCard key={svc.id} service={svc} onEdit={onEdit} />
      ))}
    </>
  );
}

function makeWrapper(initialServices: Service[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  qc.setQueryData(SERVICES_QUERY_KEY, initialServices);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ToastProvider>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </ToastProvider>
    );
  }
  return { qc, Wrapper };
}

// â”€â”€â”€ Fetch mock helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mockFetchSuccess(responseData: Service) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: responseData }),
    }),
  );
}

function mockFetchError(status = 500) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({
        success: false,
        error: { code: `HTTP_${status}`, message: "Internal Server Error" },
      }),
    }),
  );
}

function mockFetchPending(): { resolve: (svc: Service) => void } {
  let resolveFetch!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    ),
  );
  return {
    resolve: (svc: Service) => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: svc }),
      } as Response);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

// â”€â”€â”€ AC-1c: data-testid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("ServiceCard toggle â€” AC-1c: data-testid present", () => {
  it("toggle input has data-testid='service-toggle-{id}'", () => {
    mockFetchSuccess(stoppedService);

    const { Wrapper } = makeWrapper([liveService]);
    render(
      <Wrapper>
        <ServiceCardFromCache onEdit={vi.fn()} />
      </Wrapper>,
    );

    expect(screen.getByTestId(`service-toggle-${SERVICE_ID}`)).toBeDefined();
  });
});

// â”€â”€â”€ AC-1a: Optimistic UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("ServiceCard toggle â€” AC-1a: optimistic UI update", () => {
  it("toggle flips isActive immediately before server responds", async () => {
    const { resolve } = mockFetchPending();
    const user = userEvent.setup();
    const { Wrapper } = makeWrapper([liveService]);

    render(
      <Wrapper>
        <ServiceCardFromCache onEdit={vi.fn()} />
      </Wrapper>,
    );

    const toggle = screen.getByTestId(`service-toggle-${SERVICE_ID}`);
    const toggleInput = toggle.querySelector("input") as HTMLInputElement;

    expect(toggleInput.checked).toBe(true);

    // Click without awaiting â€” check optimistic state while pending
    const clickDone = user.click(toggle);

    // Optimistic flip should happen before server responds
    await waitFor(() => expect(toggleInput.checked).toBe(false));

    // Resolve the server and clean up
    resolve(stoppedService);
    await clickDone;
  });

  it("status pill (service.status) does NOT change during optimistic update", async () => {
    const { resolve } = mockFetchPending();
    const user = userEvent.setup();
    const { Wrapper } = makeWrapper([liveService]);

    render(
      <Wrapper>
        <ServiceCardFromCache onEdit={vi.fn()} />
      </Wrapper>,
    );

    const toggle = screen.getByTestId(`service-toggle-${SERVICE_ID}`);
    const toggleInput = toggle.querySelector("input") as HTMLInputElement;
    const clickDone = user.click(toggle);

    // Wait for optimistic flip (isActive = false â†’ toggle unchecked)
    await waitFor(() =>
      expect(toggleInput.checked).toBe(false),
    );

    // Status pill must still show "Live" (status not flipped optimistically)
    expect(screen.queryByText(/stopped/i)).toBeNull();
    expect(screen.getByText(/live/i)).toBeDefined();

    resolve(stoppedService);
    await clickDone;
  });
});

// â”€â”€â”€ AC-1b: Error revert + toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("ServiceCard toggle â€” AC-1b: error revert + toast", () => {
  beforeEach(() => {
    mockFetchError(500);
  });

  it("reverts toggle to original state when server returns 500", async () => {
    const user = userEvent.setup();
    const { Wrapper } = makeWrapper([liveService]);

    render(
      <Wrapper>
        <ServiceCardFromCache onEdit={vi.fn()} />
      </Wrapper>,
    );

    const toggle = screen.getByTestId(`service-toggle-${SERVICE_ID}`);
    const toggleInput = toggle.querySelector("input") as HTMLInputElement;

    expect(toggleInput.checked).toBe(true);
    await user.click(toggle);

    // Toggle must revert to original checked state after error
    await waitFor(() => {
      expect(toggleInput.checked).toBe(true);
    });
  });

  it("shows error toast when server returns 500", async () => {
    const user = userEvent.setup();
    const { Wrapper } = makeWrapper([liveService]);

    render(
      <Wrapper>
        <ServiceCardFromCache onEdit={vi.fn()} />
      </Wrapper>,
    );

    const toggle = screen.getByTestId(`service-toggle-${SERVICE_ID}`);
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeNull();
    });
  });
});
