import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockSuggestionModal } from "@/features/activity/components/MockSuggestionModal";
import type { ActivityRow } from "@/features/activity/types";

/**
 * ATDD component tests — Story 4.4: Mock Suggestion Modal
 * Layer: Vitest + Testing Library (component-level)
 *
 * RED PHASE — these tests are RED-by-construction:
 *   - MockSuggestionModal component does not exist yet
 *   - Modal pre-population logic (mockSuggestionGenerator) not implemented
 *   - Mapping JSON and Response Body blocks don't exist
 *   - Save action and mutation hook not implemented
 *
 * ACs covered:
 *   AC-3: Modal opens pre-populated with proxied request data (FR-14)
 *   AC-4: Mapping JSON block structure (FR-15)
 *   AC-5: Response body block pre-populated (FR-15)
 *   AC-6: Default Response filename convention (FR-15)
 *   AC-8: UseTransformer checkbox (FR-15)
 *   AC-13: Modal footer actions (FR-14)
 *   AC-14: Both blocks editable (FR-15)
 *   AC-15: Modal closes on Escape key (UX)
 *
 * Test Strategy:
 *   - Verify modal renders with correct structure
 *   - Verify Mapping JSON auto-generated correctly
 *   - Verify Response Body pre-populated from proxied response
 *   - Verify UseTransformer checkbox default state and toggle
 *   - Verify Save/Close buttons present
 *   - Verify Escape key closes modal
 *
 * Expected RED behavior:
 *   - Tests will fail because MockSuggestionModal doesn't exist
 *   - Tests will fail because mockSuggestionGenerator utility doesn't exist
 *   - Tests will fail because data-testid attributes not found
 */

// ─── React Query wrapper ─────────────────────────────────────────────────────

function makeQc() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return qc;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={makeQc()}>{children}</QueryClientProvider>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOCK_PROXIED_ROW: ActivityRow = {
  id: "proxied-abc123",
  timestamp: new Date().toISOString(),
  method: "POST",
  urlPath: "/api/v1/users/123",
  statusCode: 500,
  type: "Proxied",
  serviceId: "service-1",
  serviceName: "Test Service",
  servicePort: 30100,
  serviceSlug: "test-service",
  durationMs: 150,
  requestHeaders: { "content-type": "application/json" },
  requestBody: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
  responseHeaders: { "content-type": "application/json" },
  responseBody: JSON.stringify({ error: "Internal Server Error", code: 500 }),
};

function renderModal(row: ActivityRow, onClose = vi.fn()) {
  return render(<MockSuggestionModal row={row} onClose={onClose} />, {
    wrapper: Wrapper,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Story 4.4: Mock Suggestion Modal", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── AC-3: Modal opens pre-populated ──────────────────────────────────────

  it("AC-3 (P0): Modal renders with correct structure and testids", () => {
    renderModal(MOCK_PROXIED_ROW);

    const modal = screen.getByTestId("mock-suggestion-modal");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("role", "dialog");
    expect(modal).toHaveAttribute("aria-modal", "true");

    // Verify sections exist
    expect(screen.getByText("Mapping")).toBeInTheDocument();
    expect(screen.getByText(/Response Body/i)).toBeInTheDocument();
  });

  // ─── AC-4: Mapping JSON block structure ───────────────────────────────────

  it("AC-4 (P1): Mapping JSON block has correct WireMock structure", () => {
    renderModal(MOCK_PROXIED_ROW);

    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;
    expect(mappingTextarea).toBeInTheDocument();

    // Parse the auto-generated JSON
    const mappingJson = JSON.parse(mappingTextarea.value);

    // Verify structure per AC-4
    expect(mappingJson).toHaveProperty("Guid");
    expect(mappingJson.Guid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    expect(mappingJson.Request).toEqual({
      Path: {
        Matchers: [
          {
            Name: "WildcardMatcher",
            Pattern: "/api/v1/users/123",
          },
        ],
      },
      Methods: ["POST"],
    });

    expect(mappingJson.Response).toEqual({
      StatusCode: 500,
      BodyAsFile: "../responses/post_api_v1_users_123_500_body.json",
      UseTransformer: true,
    });
  });

  it("AC-4 (P1): Mapping JSON textarea is editable", () => {
    renderModal(MOCK_PROXIED_ROW);

    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;
    expect(mappingTextarea).not.toHaveAttribute("readonly");
    expect(mappingTextarea).not.toBeDisabled();

    // User can edit the JSON
    fireEvent.change(mappingTextarea, {
      target: { value: '{"Guid":"test-123","Request":{},"Response":{}}' },
    });

    expect(mappingTextarea.value).toBe('{"Guid":"test-123","Request":{},"Response":{}}');
  });

  // ─── AC-5: Response body pre-populated ────────────────────────────────────

  it("AC-5 (P1): Response Body block pre-populated from proxied response", () => {
    renderModal(MOCK_PROXIED_ROW);

    const responseTextarea = screen.getByTestId("mock-suggestion-response-body") as HTMLTextAreaElement;
    expect(responseTextarea).toBeInTheDocument();

    // Verify content is the proxied response body (pretty-printed JSON)
    const expectedBody = JSON.stringify(
      JSON.parse(MOCK_PROXIED_ROW.responseBody!),
      null,
      2,
    );
    expect(responseTextarea.value).toBe(expectedBody);
  });

  it("AC-5 (P1): Response Body textarea is editable", () => {
    renderModal(MOCK_PROXIED_ROW);

    const responseTextarea = screen.getByTestId("mock-suggestion-response-body") as HTMLTextAreaElement;
    expect(responseTextarea).not.toHaveAttribute("readonly");
    expect(responseTextarea).not.toBeDisabled();

    // User can edit the response body
    fireEvent.change(responseTextarea, {
      target: { value: '{"error":"Custom Error"}' },
    });

    expect(responseTextarea.value).toBe('{"error":"Custom Error"}');
  });

  // ─── AC-6: Default Response filename convention ───────────────────────────

  it("AC-6 (P1): Response filename label shows correct convention", () => {
    renderModal(MOCK_PROXIED_ROW);

    // Expect label: "Response Body — post_api_v1_users_123_500_body.json"
    const label = screen.getByText(/Response Body — post_api_v1_users_123_500_body\.json/i);
    expect(label).toBeInTheDocument();
  });

  it("AC-6 (P1): Response filename handles leading slash and special chars", () => {
    const rowWithComplexPath: ActivityRow = {
      ...MOCK_PROXIED_ROW,
      method: "GET",
      urlPath: "/api/v2/orders/456?filter=active",
      statusCode: 200,
    };

    renderModal(rowWithComplexPath);

    // Expect: get_api_v2_orders_456filteractive_200_body.json
    // (special chars removed, max 64 chars)
    const label = screen.getByText(/Response Body — get_api_v2_orders_456filteractive_200_body\.json/i);
    expect(label).toBeInTheDocument();
  });

  // ─── AC-8: UseTransformer checkbox ────────────────────────────────────────

  it("AC-8 (P2): UseTransformer checkbox is checked by default", () => {
    renderModal(MOCK_PROXIED_ROW);

    const checkbox = screen.getByTestId("mock-suggestion-use-transformer") as HTMLInputElement;
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute("type", "checkbox");
    expect(checkbox).toBeChecked();

    // Verify label
    expect(screen.getByText("Enable WireMock response templating")).toBeInTheDocument();
  });

  it("AC-8 (P2): Unchecking UseTransformer updates Mapping JSON", () => {
    renderModal(MOCK_PROXIED_ROW);

    const checkbox = screen.getByTestId("mock-suggestion-use-transformer") as HTMLInputElement;
    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;

    // Initial state: UseTransformer: true
    let mappingJson = JSON.parse(mappingTextarea.value);
    expect(mappingJson.Response.UseTransformer).toBe(true);

    // Uncheck the checkbox
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Mapping JSON should update to UseTransformer: false
    mappingJson = JSON.parse(mappingTextarea.value);
    expect(mappingJson.Response.UseTransformer).toBe(false);
  });

  it("AC-8 (P2): Re-checking UseTransformer updates Mapping JSON back to true", () => {
    renderModal(MOCK_PROXIED_ROW);

    const checkbox = screen.getByTestId("mock-suggestion-use-transformer") as HTMLInputElement;
    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;

    // Uncheck then re-check
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    const mappingJson = JSON.parse(mappingTextarea.value);
    expect(mappingJson.Response.UseTransformer).toBe(true);
  });

  // ─── AC-13: Modal footer actions ──────────────────────────────────────────

  it("AC-13 (P1): Modal footer contains Save and Close buttons", () => {
    renderModal(MOCK_PROXIED_ROW);

    const saveBtn = screen.getByTestId("mock-suggestion-btn-save");
    const closeBtn = screen.getByTestId("mock-suggestion-btn-close");

    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveTextContent("Save");

    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveTextContent("Close");
  });

  it("AC-13 (P1): Close button calls onClose handler", () => {
    const onClose = vi.fn();
    renderModal(MOCK_PROXIED_ROW, onClose);

    const closeBtn = screen.getByTestId("mock-suggestion-btn-close");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── AC-14: Both blocks editable ──────────────────────────────────────────

  it("AC-14 (P1): Both Mapping and Response blocks support editing simultaneously", () => {
    renderModal(MOCK_PROXIED_ROW);

    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;
    const responseTextarea = screen.getByTestId("mock-suggestion-response-body") as HTMLTextAreaElement;

    // Edit both blocks
    fireEvent.change(mappingTextarea, {
      target: { value: '{"Guid":"edited-mapping"}' },
    });
    fireEvent.change(responseTextarea, {
      target: { value: '{"edited":"response"}' },
    });

    expect(mappingTextarea.value).toBe('{"Guid":"edited-mapping"}');
    expect(responseTextarea.value).toBe('{"edited":"response"}');
  });

  // ─── AC-15: Escape key closes modal ───────────────────────────────────────

  it("AC-15 (P2): Pressing Escape key closes modal", () => {
    const onClose = vi.fn();
    renderModal(MOCK_PROXIED_ROW, onClose);

    // Press Escape key
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("AC-15 (P2): Escape key works when focus is inside modal", () => {
    const onClose = vi.fn();
    renderModal(MOCK_PROXIED_ROW, onClose);

    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json");
    mappingTextarea.focus();

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Additional edge cases ────────────────────────────────────────────────

  it("Edge case: Handles empty request body", () => {
    const rowWithoutBody: ActivityRow = {
      ...MOCK_PROXIED_ROW,
      method: "GET",
      requestBody: null,
      responseBody: JSON.stringify({ result: "success" }),
    };

    renderModal(rowWithoutBody);

    const mappingTextarea = screen.getByTestId("mock-suggestion-mapping-json") as HTMLTextAreaElement;
    const mappingJson = JSON.parse(mappingTextarea.value);

    // Should still generate valid mapping
    expect(mappingJson.Request.Methods).toEqual(["GET"]);
  });

  it("Edge case: Handles non-JSON response body", () => {
    const rowWithTextResponse: ActivityRow = {
      ...MOCK_PROXIED_ROW,
      responseBody: "Plain text response",
    };

    renderModal(rowWithTextResponse);

    const responseTextarea = screen.getByTestId("mock-suggestion-response-body") as HTMLTextAreaElement;

    // Should display as-is (not pretty-printed)
    expect(responseTextarea.value).toBe("Plain text response");
  });
});

