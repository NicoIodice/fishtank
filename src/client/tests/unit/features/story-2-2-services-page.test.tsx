/**
 * test-automate: Story 2.2 â€” ServicesPage component
 *
 * Covers coverage gaps not addressed by ATDD scaffolds:
 *   - Loading / error / empty states (AC-1)
 *   - Grid and table view rendering (AC-1, AC-4)
 *   - View mode toggle + sessionStorage persistence (AC-4)
 *   - Tag filter chip rendering and AND-logic filtering (AC-7)
 *   - "Add Service" and "Edit" buttons open modal (AC-6, AC-8)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// â”€â”€â”€ Component under test â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { ServicesPage } from "@/features/services/pages/ServicesPage";

// â”€â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

vi.mock("@/features/services/hooks/useServices", () => ({
  useServices: vi.fn(),
  useNextPort: vi.fn(() => ({ data: 30101 })),
  useCreateService: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  })),
  useUpdateService: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  })),
  useToggleService: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  SERVICES_QUERY_KEY: ["services"],
}));

import { useServices } from "@/features/services/hooks/useServices";
const mockUseServices = vi.mocked(useServices);

// â”€â”€â”€ Test helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>;
}

function renderPage() {
  return render(
    <Wrapper>
      <ServicesPage />
    </Wrapper>,
  );
}

const svcA = {
  id: "aaa",
  name: "Alpha Service",
  slug: "alpha-service",
  description: null,
  externalUrl: "https://alpha.example.com",
  port: 30100,
  mocksRoot: "/app/mocks/alpha-service",
  status: "live" as const,
  isActive: true,
  tags: ["api", "internal"],
  createdAt: "2025-01-01T00:00:00Z",
  mockFileCount: 3,
};

const svcB = {
  id: "bbb",
  name: "Beta Service",
  slug: "beta-service",
  description: "Beta desc",
  externalUrl: "https://beta.example.com",
  port: 30101,
  mocksRoot: "/app/mocks/beta-service",
  status: "stopped" as const,
  isActive: true,
  tags: ["api", "external"],
  createdAt: "2025-01-02T00:00:00Z",
  mockFileCount: 0,
};

beforeEach(() => {
  // Default: two services loaded
  mockUseServices.mockReturnValue({
    data: [svcA, svcB],
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useServices>);

  // Reset sessionStorage between tests
  sessionStorage.removeItem("fishtank_services_view");
});

afterEach(() => {
  vi.clearAllMocks();
});

// â”€â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe("ServicesPage â€” loading / error / empty states", () => {
  it("shows loading state while services are fetching", () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useServices>);

    renderPage();
    expect(screen.getByTestId("services-loading")).toBeDefined();
    expect(screen.queryByTestId("services-grid")).toBeNull();
    expect(screen.queryByTestId("services-table")).toBeNull();
  });

  it("shows error state when fetch fails", () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useServices>);

    renderPage();
    expect(screen.getByTestId("services-error")).toBeDefined();
  });

  it("shows empty state when no services exist", () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useServices>);

    renderPage();
    expect(screen.getByTestId("services-empty")).toBeDefined();
    expect(screen.getByTestId("empty-add-service")).toBeDefined();
  });

  it("does not show empty state when services exist", () => {
    renderPage();
    expect(screen.queryByTestId("services-empty")).toBeNull();
  });
});

describe("ServicesPage â€” grid view (default)", () => {
  it("renders a card for each service in grid view", () => {
    renderPage();
    expect(screen.getByTestId("services-grid")).toBeDefined();
    expect(screen.getByTestId(`service-card-${svcA.id}`)).toBeDefined();
    expect(screen.getByTestId(`service-card-${svcB.id}`)).toBeDefined();
  });

  it("does not show table view by default", () => {
    renderPage();
    expect(screen.queryByTestId("services-table")).toBeNull();
  });
});

describe("ServicesPage â€” table view toggle", () => {
  it("switches to table view when table toggle button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const tableBtn = screen.getByRole("button", { name: /table view/i });
    await user.click(tableBtn);

    expect(screen.getByTestId("services-table")).toBeDefined();
    expect(screen.queryByTestId("services-grid")).toBeNull();
  });

  it("persists view mode to sessionStorage on toggle", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /table view/i }));
    expect(sessionStorage.getItem("fishtank_services_view")).toBe("table");

    await user.click(screen.getByRole("button", { name: /grid view/i }));
    expect(sessionStorage.getItem("fishtank_services_view")).toBe("grid");
  });

  it("restores table view from sessionStorage on mount", () => {
    sessionStorage.setItem("fishtank_services_view", "table");
    renderPage();
    expect(screen.getByTestId("services-table")).toBeDefined();
  });
});

describe("ServicesPage â€” tag filter", () => {
  it("renders tag filter chips for all unique tags across services", () => {
    renderPage();
    // Both services share "api"; svcA has "internal", svcB has "external"
    expect(screen.getByRole("button", { name: "api" })).toBeDefined();
    expect(screen.getByRole("button", { name: "internal" })).toBeDefined();
    expect(screen.getByRole("button", { name: "external" })).toBeDefined();
  });

  it("filters services by selected tag â€” shows matching cards only", async () => {
    const user = userEvent.setup();
    renderPage();

    // Click "internal" â€” only svcA has this tag
    await user.click(screen.getByRole("button", { name: "internal" }));

    expect(screen.getByTestId(`service-card-${svcA.id}`)).toBeDefined();
    expect(screen.queryByTestId(`service-card-${svcB.id}`)).toBeNull();
  });

  it("applies AND logic when multiple tags selected", async () => {
    const user = userEvent.setup();
    renderPage();

    // "api" matches both; "internal" matches only svcA â€” AND gives svcA only
    await user.click(screen.getByRole("button", { name: "api" }));
    await user.click(screen.getByRole("button", { name: "internal" }));

    expect(screen.getByTestId(`service-card-${svcA.id}`)).toBeDefined();
    expect(screen.queryByTestId(`service-card-${svcB.id}`)).toBeNull();
  });

  it("shows empty state when no services match selected tags", async () => {
    // Make svcA and svcB have non-overlapping tags
    mockUseServices.mockReturnValue({
      data: [
        { ...svcA, tags: ["alpha-only"] },
        { ...svcB, tags: ["beta-only"] },
      ],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useServices>);

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "alpha-only" }));
    await user.click(screen.getByRole("button", { name: "beta-only" }));

    // No service matches both tags simultaneously
    expect(screen.getByTestId("services-empty")).toBeDefined();
  });

  it("'Clear filters' button deactivates all tag filters", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "internal" }));
    expect(screen.queryByTestId(`service-card-${svcB.id}`)).toBeNull();

    const clearBtn = screen.getByRole("button", { name: /clear all tag filters/i });
    await user.click(clearBtn);

    expect(screen.getByTestId(`service-card-${svcA.id}`)).toBeDefined();
    expect(screen.getByTestId(`service-card-${svcB.id}`)).toBeDefined();
  });

  it("deactivates a tag chip when clicked again (toggle off)", async () => {
    const user = userEvent.setup();
    renderPage();

    const internalBtn = screen.getByRole("button", { name: "internal" });
    await user.click(internalBtn);
    expect(screen.queryByTestId(`service-card-${svcB.id}`)).toBeNull();

    await user.click(internalBtn);
    expect(screen.getByTestId(`service-card-${svcB.id}`)).toBeDefined();
  });
});

describe("ServicesPage â€” modal open/close", () => {
  it("opens Add Service modal when toolbar button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("btn-add-service"));
    expect(screen.getByTestId("service-modal")).toBeDefined();
  });

  it("opens Add Service modal when empty-state button is clicked", async () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useServices>);

    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("empty-add-service"));
    expect(screen.getByTestId("service-modal")).toBeDefined();
  });

  it("opens Edit modal when a service card edit button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId(`edit-service-${svcA.id}`));
    expect(screen.getByTestId("service-modal")).toBeDefined();
    // Edit modal title contains service name
    expect(screen.getByText(`Edit "${svcA.name}"`)).toBeDefined();
  });

  it("closes modal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId("btn-add-service"));
    expect(screen.getByTestId("service-modal")).toBeDefined();

    await user.click(screen.getByTestId("btn-cancel"));
    expect(screen.queryByTestId("service-modal")).toBeNull();
  });
});


