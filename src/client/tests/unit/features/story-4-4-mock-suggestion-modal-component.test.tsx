/**
 * @fileoverview Story 4.4: MockSuggestionModal Component Tests
 * Tests for the modal UI component behavior and user interactions.
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityRow } from "@/features/activity/types";
import * as mockGen from "@/features/activity/utils/mockSuggestionGenerator";

// Stable hoisted mocks — created before any module is evaluated
const mockApiFetch = vi.hoisted(() => vi.fn());
const MockApiError = vi.hoisted(() =>
  class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "ApiError";
    }
  },
);

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
  ApiError: MockApiError,
}));
vi.mock("@/lib/useToast", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Dynamic import after vi.resetModules
type MockSuggestionModalType = typeof import("@/features/activity/components/MockSuggestionModal").MockSuggestionModal;
let MockSuggestionModal: MockSuggestionModalType;

// Local alias for ApiError so test code can use `new api.ApiError(...)`
const api = { ApiError: MockApiError };

describe("Story 4.4: MockSuggestionModal Component", () => {
  let queryClient: QueryClient;

  beforeAll(async () => {
    vi.resetModules();
    ({ MockSuggestionModal } = await import("@/features/activity/components/MockSuggestionModal"));
  });

  const mockRow: ActivityRow = {
    id: "test-123",
    timestamp: "2024-01-15T10:30:00Z",
    serviceName: "ProductAPI",
    serviceSlug: "product-api",
    serviceId: "service-guid-123",
    servicePort: 8080,
    method: "GET",
    urlPath: "/api/products/123",
    statusCode: 200,
    durationMs: 125,
    requestHeaders: {},
    requestBody: null,
    responseHeaders: {},
    responseBody: '{"id": 123, "name": "Widget"}',
    type: "Proxied",
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  function renderModal(row: ActivityRow = mockRow, onClose = vi.fn()) {
    return render(
      <QueryClientProvider client={queryClient}>
        <MockSuggestionModal row={row} onClose={onClose} />
      </QueryClientProvider>,
    );
  }

  describe("Rendering", () => {
    it("renders modal with correct title", () => {
      renderModal();
      expect(screen.getByText("Save As Mock")).toBeInTheDocument();
    });

    it("displays initial mapping JSON from mock suggestion generator", () => {
      renderModal();
      const textarea = screen.getByTestId("mock-suggestion-mapping-json");
      const value = (textarea as HTMLTextAreaElement).value;

      expect(value).toContain('"Guid"');
      expect(value).toContain('"Request"');
      expect(value).toContain('"Response"');
      expect(value).toContain('"Path"');
      expect(value).toContain('"/api/products/123"');
    });

    it("displays initial response body", () => {
      renderModal();
      const textarea = screen.getByTestId("mock-suggestion-response-body");
      const value = (textarea as HTMLTextAreaElement).value;

      expect(value).toContain('"id"');
      expect(value).toContain('"name"');
    });

    it("displays response filename in label", () => {
      renderModal();
      expect(
        screen.getByText(/Response Body — get_api_products_123_200_body\.json/),
      ).toBeInTheDocument();
    });

    it("renders UseTransformer checkbox checked by default", () => {
      renderModal();
      const checkbox = screen.getByTestId("mock-suggestion-use-transformer");
      expect(checkbox).toBeChecked();
    });

    it("renders Save and Close buttons", () => {
      renderModal();
      expect(screen.getByTestId("mock-suggestion-btn-save")).toBeInTheDocument();
      expect(screen.getByTestId("mock-suggestion-btn-close")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("allows editing the mapping JSON", async () => {
      renderModal();

      const textarea = screen.getByTestId("mock-suggestion-mapping-json");
      const newValue = '{"custom": "json"}';
      
      // Use fireEvent for simplicity
      fireEvent.change(textarea, { target: { value: newValue } });

      expect((textarea as HTMLTextAreaElement).value).toBe(newValue);
    });

    it("allows editing the response body", async () => {
      const user = userEvent.setup();
      renderModal();

      const textarea = screen.getByTestId("mock-suggestion-response-body");
      await user.clear(textarea);
      await user.type(textarea, "New response body");

      expect((textarea as HTMLTextAreaElement).value).toBe("New response body");
    });

    it("toggles UseTransformer checkbox and updates mapping JSON", async () => {
      const user = userEvent.setup();
      renderModal();

      const checkbox = screen.getByTestId("mock-suggestion-use-transformer");
      const textarea = screen.getByTestId("mock-suggestion-mapping-json");

      // Uncheck
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();

      const value = (textarea as HTMLTextAreaElement).value;
      const parsed = JSON.parse(value);
      expect(parsed.Response.UseTransformer).toBe(false);

      // Re-check
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      const updatedValue = (textarea as HTMLTextAreaElement).value;
      const updatedParsed = JSON.parse(updatedValue);
      expect(updatedParsed.Response.UseTransformer).toBe(true);
    });

    it("closes modal when clicking Close button", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal(mockRow, onClose);

      const closeButton = screen.getByTestId("mock-suggestion-btn-close");
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes modal when clicking X button", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal(mockRow, onClose);

      const xButton = screen.getByLabelText("Close modal");
      await user.click(xButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closes modal when clicking backdrop", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal(mockRow, onClose);

      const backdrop = screen.getByRole("dialog");
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not close modal when clicking modal content", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal(mockRow, onClose);

      const title = screen.getByText("Save As Mock");
      await user.click(title);

      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes modal when pressing Escape key", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal(mockRow, onClose);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Status Mismatch Warning", () => {
    it("does not show warning when status matches", () => {
      renderModal();
      expect(
        screen.queryByTestId("mock-suggestion-status-warning"),
      ).not.toBeInTheDocument();
    });

    it("shows warning when user edits status code in mapping", async () => {
      renderModal();

      const textarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;
      const currentValue = textarea.value;

      // Change status code from 200 to 201
      const newValue = currentValue.replace('"StatusCode": 200', '"StatusCode": 201');
      
      // Use fireEvent.change with the new value
      fireEvent.change(textarea, { target: { value: newValue } });

      await waitFor(() => {
        expect(screen.getByTestId("mock-suggestion-status-warning")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Filename reflects the original proxied status \(200\)/),
      ).toBeInTheDocument();
    });

    it("does not show warning for invalid JSON", async () => {
      const user = userEvent.setup();
      renderModal();

      const textarea = screen.getByTestId("mock-suggestion-mapping-json");
      await user.clear(textarea);
      await user.type(textarea, "invalid json");

      // Wait a bit to ensure useMemo has run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(
        screen.queryByTestId("mock-suggestion-status-warning"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Save Functionality", () => {
    it("calls API when Save button is clicked", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValue({ path: "test.json", content: "{}" });
      renderModal();

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledTimes(2);
      });

      // Verify both API calls (mapping + response)
      expect(mockApiFetch).toHaveBeenNthCalledWith(1, "/api/mappings", expect.any(Object));
      expect(mockApiFetch).toHaveBeenNthCalledWith(2, "/api/mappings", expect.any(Object));
    });

    it("disables Save button while saving", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ path: "", content: "" }), 100)),
      );
      renderModal();

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");
      await user.click(saveButton);

      // Check button is disabled during save
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent("Saving...");

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
        expect(saveButton).toHaveTextContent("Save");
      });
    });

    it("displays error message when save fails", async () => {
      const user = userEvent.setup();
      const error = new api.ApiError("SAVE_FAILED", "Network error");
      mockApiFetch.mockRejectedValueOnce(error);
      renderModal();

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to save mock — Network error/),
        ).toBeInTheDocument();
      });
    });

    it("clears previous error when trying to save again", async () => {
      const user = userEvent.setup();
      const error = new api.ApiError("SAVE_FAILED", "First error");
      mockApiFetch.mockRejectedValueOnce(error);
      renderModal();

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");

      // First save fails
      await user.click(saveButton);
      await waitFor(() => {
        expect(screen.getByText(/First error/)).toBeInTheDocument();
      });

      // Second save attempt should clear error first
      mockApiFetch.mockResolvedValueOnce({ path: "", content: "" });
      mockApiFetch.mockResolvedValueOnce({ path: "", content: "" });
      await user.click(saveButton);

      // Error should be cleared during save attempt
      await waitFor(() => {
        expect(screen.queryByText(/First error/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Service Slug Derivation", () => {
    it("uses provided serviceSlug if available", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValue({ path: "", content: "" });

      const rowWithSlug = { ...mockRow, serviceSlug: "my-service" };
      renderModal(rowWithSlug);

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalled();
      });

      // Verify the path includes the correct slug
      const firstCall = mockApiFetch.mock.calls[0];
      const body = JSON.parse(firstCall[1]?.body as string);
      expect(body.path).toContain("my-service");
    });

    it("derives serviceSlug from serviceName if not provided", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValue({ path: "", content: "" });

      const rowWithoutSlug = {
        ...mockRow,
        serviceSlug: undefined,
        serviceName: "Product API Service",
      };
      renderModal(rowWithoutSlug);

      const saveButton = screen.getByTestId("mock-suggestion-btn-save");
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalled();
      });

      // Verify the path includes the derived slug (Product API Service -> product-api-service)
      const firstCall = mockApiFetch.mock.calls[0];
      const body = JSON.parse(firstCall[1]?.body as string);
      expect(body.path).toContain("product-api-service");
    });
  });
});
