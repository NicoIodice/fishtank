/**
 * ATDD unit-level scaffolds for Story 2.2: Services Page — UI Logic
 *
 * RED PHASE — these tests define the expected component behaviour.
 * They FAIL before implementation.
 * They PASS once Story 2.2 components are implemented.
 *
 * Covers:
 *   - ServiceCard: stopped service opacity, card content rendering (AC-3)
 *   - AddEditServiceModal: inline validation on blur (AC-5), slug-change warning (AC-8)
 *   - generateSlug: slug generation helper (used in modal)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// RED PHASE: Static imports that will fail until Story 2.2 is implemented.
// These are intentional — the tests fail to load before implementation.
import { ServiceCard } from "@/features/services/components/ServiceCard";
import { AddEditServiceModal } from "@/features/services/components/AddEditServiceModal";

// ─── Test helpers ──────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = makeQueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
const liveService = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Payments Mock",
  slug: "payments-mock",
  description: "Mock for the payments service",
  externalUrl: "http://payments.example.com",
  port: 30150,
  mocksRoot: "/app/mocks/payments-mock",
  status: "live" as const,
  isActive: true,
  tags: ["payments", "billing"],
  createdAt: "2025-01-01T00:00:00Z",
  mockFileCount: 5,
};

const stoppedService = {
  ...liveService,
  id: "660e8400-e29b-41d4-a716-446655440001",
  name: "Auth Mock",
  slug: "auth-mock",
  status: "stopped" as const,
  mockFileCount: 0,
  tags: [],
};

// ─── ServiceCard unit tests ────────────────────────────────────────────────

describe("ServiceCard — AC-3: card content rendering", () => {
  beforeEach(() => {
    // Mock fetch — toggle calls the API
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { ...liveService } }),
      }),
    );
  });

  it("renders service name", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("Payments Mock")).toBeDefined();
  });

  it("renders port badge with :PORT format", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByTitle("Port 30150")).toBeDefined();
  });

  it("renders description when present", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("Mock for the payments service")).toBeDefined();
  });

  it("renders mock file count", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText(/5 mapping files/i)).toBeDefined();
  });

  it("renders 'No mapping files' when mockFileCount is 0", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={stoppedService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("No mapping files")).toBeDefined();
  });

  it("renders Edit button and calls onEdit when clicked", async () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    const editBtn = screen.getByTestId(`edit-service-${liveService.id}`);
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(liveService);
  });

  it("stopped service has reduced opacity via .stopped CSS class", () => {
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <ServiceCard service={stoppedService} onEdit={onEdit} />
      </Wrapper>,
    );
    // The article element should have a CSS class that applies opacity: 0.72
    const article = container.querySelector("article");
    expect(article?.className).toMatch(/stopped/);
  });

  it("live service does NOT have stopped CSS class", () => {
    const onEdit = vi.fn();
    const { container } = render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    const article = container.querySelector("article");
    expect(article?.className).not.toMatch(/stopped/);
  });

  it("renders tag chips for each tag", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("payments")).toBeDefined();
    expect(screen.getByText("billing")).toBeDefined();
  });

  it("renders status pill 'Live' for live service", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={liveService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("Live")).toBeDefined();
  });

  it("renders status pill 'Stopped' for stopped service", () => {
    const onEdit = vi.fn();
    render(
      <Wrapper>
        <ServiceCard service={stoppedService} onEdit={onEdit} />
      </Wrapper>,
    );
    expect(screen.getByText("Stopped")).toBeDefined();
  });
});

// ─── AddEditServiceModal unit tests ───────────────────────────────────────

describe("AddEditServiceModal — AC-5, AC-8: form validation and slug-change warning", () => {
  beforeEach(() => {
    // Mock fetch to avoid real API calls (next-port, settings, create/update)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const data =
          typeof url === "string" && url.includes("/api/settings")
            ? { mocksHostPath: "mocks" }
            : { port: 30100 };
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data }),
        });
      }),
    );
  });

  it("renders Add Service modal title in add mode", () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    expect(screen.getByText("Add Service")).toBeDefined();
  });

  it("renders Edit modal title with service name in edit mode", () => {
    render(
      <Wrapper>
        <AddEditServiceModal
          mode="edit"
          service={liveService}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );
    expect(screen.getByText(`Edit "${liveService.name}"`)).toBeDefined();
  });

  it("pre-populates all fields in edit mode (AC-8)", () => {
    render(
      <Wrapper>
        <AddEditServiceModal
          mode="edit"
          service={liveService}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId(
      "input-service-name",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe(liveService.name);

    const urlInput = screen.getByTestId(
      "input-service-url",
    ) as HTMLInputElement;
    expect(urlInput.value).toBe(liveService.externalUrl);
  });

  it("validates name required on blur (AC-5)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId("input-service-name");
    // Click and blur without typing
    await userEvent.click(nameInput);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/service name is required/i)).toBeDefined();
    });
  });

  it("validates name too long (>64 chars) on blur (AC-5)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId("input-service-name");
    await userEvent.type(nameInput, "a".repeat(65));
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText(/64 characters or fewer/i)).toBeDefined();
    });
  });

  it("validates externalUrl format on blur (AC-5)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    const urlInput = screen.getByTestId("input-service-url");
    await userEvent.type(urlInput, "not-a-url");
    fireEvent.blur(urlInput);

    await waitFor(() => {
      expect(screen.getByText(/must start with http/i)).toBeDefined();
    });
  });

  it("validates port range on blur (AC-5)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    const portInput = screen.getByTestId("input-service-port");
    await userEvent.clear(portInput);
    await userEvent.type(portInput, "9999");
    fireEvent.blur(portInput);

    await waitFor(() => {
      expect(screen.getByText(/30100/)).toBeDefined();
    });
  });

  it("shows slug-change warning when name edit changes slug (AC-8)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal
          mode="edit"
          service={liveService}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId("input-service-name");

    // Change the name to something that produces a different slug
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Totally Different Service Name");

    // Wait for 200ms debounce + re-render
    await waitFor(
      () => {
        expect(screen.getByTestId("slug-change-warning")).toBeDefined();
      },
      { timeout: 500 },
    );
  });

  it("does NOT show slug-change warning when slug is unchanged (AC-8)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal
          mode="edit"
          service={liveService}
          onClose={vi.fn()}
        />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId("input-service-name");

    // Modify name in a way that produces the same slug (e.g., just changes case)
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Payments Mock"); // slug = "payments-mock" — same

    await waitFor(
      () => {
        // Warning should not appear
        expect(
          document.querySelector('[data-testid="slug-change-warning"]'),
        ).toBeNull();
      },
      { timeout: 500 },
    );
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={onClose} />
      </Wrapper>,
    );
    await userEvent.click(screen.getByTestId("btn-cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={onClose} />
      </Wrapper>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows readonly mocks-root path preview (AC-5)", async () => {
    render(
      <Wrapper>
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </Wrapper>,
    );
    const nameInput = screen.getByTestId("input-service-name");
    await userEvent.type(nameInput, "Test Service");

    // After 200ms debounce the preview should update
    await waitFor(
      () => {
        const preview = screen.getByTestId("readonly-mocks-root");
        expect(preview.textContent).toContain("mocks/test-service");
      },
      { timeout: 500 },
    );
  });
});
