/**
 * AddEditServiceModal — submit flow and tag management coverage tests
 *
 * Covers:
 *  - Successful submit in add mode (calls createService.mutateAsync)
 *  - Successful submit in edit mode (calls updateService.mutateAsync)
 *  - API error codes mapped to field errors (name / port / externalUrl)
 *  - Generic API error shown as submit error
 *  - Unexpected (non-ApiError) error shown as submit error
 *  - Tag management: Enter/comma adds tags, blur adds tag, × removes tag
 *  - Duplicate tags not added twice
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockApiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.name = "ApiError";
      this.code = code;
      this.status = status;
    }
  },
}));

// Hooks resolved after resetModules
type AddEditServiceModalType =
  typeof import("@/features/services/components/AddEditServiceModal").AddEditServiceModal;
let AddEditServiceModal: AddEditServiceModalType;

describe("AddEditServiceModal — submit and tags", () => {
  beforeAll(async () => {
    vi.resetModules();
    ({ AddEditServiceModal } =
      await import("@/features/services/components/AddEditServiceModal"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: next-port and settings return quickly
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      return Promise.resolve({});
    });
  });

  function makeWrapper() {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
  }

  const validService = {
    id: "svc-1",
    name: "My Service",
    slug: "my-service",
    description: "",
    externalUrl: "http://example.com",
    port: 30150,
    mocksRoot: "/mocks/my-service",
    status: "live" as const,
    isActive: true,
    tags: ["a", "b"],
    createdAt: "2025-01-01T00:00:00Z",
    mockFileCount: 0,
  };

  async function fillValidForm() {
    const nameInput = screen.getByTestId("input-service-name");
    const urlInput = screen.getByTestId("input-service-url");
    const portInput = screen.getByTestId("input-service-port");

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Test Service");
    await userEvent.clear(urlInput);
    await userEvent.type(urlInput, "http://test.com");
    await userEvent.clear(portInput);
    await userEvent.type(portInput, "30101");
  }

  // ── successful add ────────────────────────────────────────────────────────

  it("submits form in add mode and calls onSuccess + onClose", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.resolve({ id: "new-svc", name: "Test Service" });
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal
          mode="add"
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  // ── successful edit ───────────────────────────────────────────────────────

  it("submits form in edit mode calling PUT /api/services/:id", async () => {
    const onClose = vi.fn();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url.includes("/api/services/svc-1"))
        return Promise.resolve({ ...validService });
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal
          mode="edit"
          service={validService}
          onClose={onClose}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/services/svc-1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  // ── API error → name field ─────────────────────────────────────────────

  it("maps SERVICE_NAME_REQUIRED error to name field", async () => {
    const { ApiError } = await import("@/lib/api");
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.reject(
          new ApiError("SERVICE_NAME_REQUIRED", "Name is required"),
        );
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() =>
      expect(screen.queryByText("Name is required")).toBeTruthy(),
    );
  });

  // ── API error → port field ─────────────────────────────────────────────

  it("maps SERVICE_PORT_CONFLICT error to port field", async () => {
    const { ApiError } = await import("@/lib/api");
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.reject(
          new ApiError("SERVICE_PORT_CONFLICT", "Port already in use"),
        );
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() =>
      expect(screen.queryByText("Port already in use")).toBeTruthy(),
    );
  });

  // ── API error → externalUrl field ─────────────────────────────────────

  it("maps SERVICE_URL_INVALID error to externalUrl field", async () => {
    const { ApiError } = await import("@/lib/api");
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.reject(
          new ApiError("SERVICE_URL_INVALID", "URL is invalid"),
        );
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() =>
      expect(screen.queryByText("URL is invalid")).toBeTruthy(),
    );
  });

  // ── generic API error ──────────────────────────────────────────────────

  it("shows submit error for generic ApiError (unknown code)", async () => {
    const { ApiError } = await import("@/lib/api");
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.reject(
          new ApiError("UNKNOWN_CODE", "Something went wrong", 500),
        );
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() =>
      expect(screen.queryByText("Something went wrong")).toBeTruthy(),
    );
  });

  // ── non-ApiError ───────────────────────────────────────────────────────

  it("shows generic submit error when a non-ApiError is thrown", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/api/settings"))
        return Promise.resolve({ mocksHostPath: "mocks" });
      if (url.includes("/api/services/next-port"))
        return Promise.resolve({ port: 30100 });
      if (url === "/api/services")
        return Promise.reject(new Error("Network error"));
      return Promise.resolve({});
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    await fillValidForm();
    fireEvent.click(screen.getByTestId("btn-submit-service"));

    await waitFor(() =>
      expect(screen.queryByText(/unexpected error/i)).toBeTruthy(),
    );
  });

  // ── tag management ─────────────────────────────────────────────────────

  it("adds a tag when Enter is pressed in tag input", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const tagInput = screen.getByTestId("input-service-tags");
    await userEvent.type(tagInput, "mytag{Enter}");

    await waitFor(() => expect(screen.queryByText("mytag")).toBeTruthy());
  });

  it("adds a tag when comma is pressed in tag input", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const tagInput = screen.getByTestId("input-service-tags");
    await userEvent.type(tagInput, "tagcomma,");

    await waitFor(() => expect(screen.queryByText("tagcomma")).toBeTruthy());
  });

  it("adds a tag when tag input loses focus", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    const tagInput = screen.getByTestId("input-service-tags");
    await userEvent.type(tagInput, "blurtag");
    fireEvent.blur(tagInput);

    await waitFor(() => expect(screen.queryByText("blurtag")).toBeTruthy());
  });

  it("removes a tag when × button is clicked", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal
          mode="edit"
          service={validService}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // "a" and "b" tags are pre-populated
    await waitFor(() => expect(screen.queryByText("a")).toBeTruthy());

    const removeBtn = screen.getByLabelText("Remove tag a");
    await userEvent.click(removeBtn);

    await waitFor(() => expect(screen.queryByText("a")).toBeNull());
  });

  it("does not add a duplicate tag", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal
          mode="edit"
          service={validService}
          onClose={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // "a" is already present
    const tagInput = screen.getByTestId("input-service-tags");
    await userEvent.type(tagInput, "a{Enter}");

    // Should still be only one "a" chip
    const chips = screen.getAllByText("a");
    expect(chips.length).toBe(1);
  });

  it("closes modal on backdrop click", async () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false },
              mutations: { retry: false },
            },
          })
        }
      >
        <AddEditServiceModal mode="add" onClose={onClose} />
      </QueryClientProvider>,
    );

    // The backdrop div has role="presentation" and handles click-outside
    const backdrop = document.querySelector(
      '[role="presentation"]',
    ) as HTMLElement;
    // Click backdrop itself (not a child)
    fireEvent.click(backdrop, { target: backdrop });

    expect(onClose).toHaveBeenCalled();
  });
});
