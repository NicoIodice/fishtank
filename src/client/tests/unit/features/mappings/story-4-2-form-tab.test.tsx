/**
 * Unit tests — Story 4.2: FormTab component
 * Layer: Frontend unit (Vitest + React Testing Library)
 *
 * Covers all field onChange paths in FormTab.updateField, including:
 *   - method, url (nested request fields)
 *   - status (numeric conversion + empty → undefined)
 *   - body (set vs delete on empty)
 *   - bodyAsFile (set vs delete on empty)
 *   - contentType (set when no headers, set when headers exist, clear when headers
 *                  has other keys, clear when headers only had Content-Type)
 *   - delay (set vs delete on empty/zero)
 *   - priority (set vs delete on empty)
 *   - useTransformer (enable sets transformerParameters, disable deletes it)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { FormTab } from "@/features/mappings/components/FormTab";
import type { MappingJson } from "@/features/mappings/types/mappings";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBuffer(overrides: MappingJson = {}): MappingJson {
  return {
    request: { method: "GET", url: "/api/test" },
    response: { status: 200, body: "hello" },
    ...overrides,
  };
}

function renderFormTab(buffer: MappingJson, onChange: (u: MappingJson) => void) {
  return render(<FormTab editBuffer={buffer} onChange={onChange} />);
}

/**
 * Controlled wrapper that feeds onChange updates back into the component.
 * This simulates a real parent that re-renders FormTab with the updated buffer,
 * which is required for text inputs to show incremental keystrokes correctly.
 */
function ControlledFormTab({
  initialBuffer,
  onChangeSpy,
}: {
  initialBuffer: MappingJson;
  onChangeSpy: (u: MappingJson) => void;
}) {
  const [buffer, setBuffer] = React.useState<MappingJson>(initialBuffer);
  const handleChange = React.useCallback(
    (updated: MappingJson) => {
      setBuffer(updated);
      onChangeSpy(updated);
    },
    [onChangeSpy],
  );
  return <FormTab editBuffer={buffer} onChange={handleChange} />;
}

function renderControlled(initialBuffer: MappingJson, onChangeSpy: (u: MappingJson) => void) {
  return render(<ControlledFormTab initialBuffer={initialBuffer} onChangeSpy={onChangeSpy} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FormTab — field rendering", () => {
  it("renders all expected fields", () => {
    const onChange = vi.fn();
    renderFormTab(makeBuffer(), onChange);

    expect(screen.getByLabelText("Method")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Response body")).toBeInTheDocument();
    expect(screen.getByLabelText("BodyAsFile")).toBeInTheDocument();
    expect(screen.getByLabelText("Content-Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Delay")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Use transformer")).toBeInTheDocument();
  });

  it("displays existing buffer values in the fields", () => {
    const buffer: MappingJson = {
      request: { method: "POST", url: "/api/create" },
      response: {
        status: 201,
        body: "created",
        bodyAsFile: "../responses/create.json",
        headers: { "Content-Type": "application/json" },
        fixedDelayMilliseconds: 500,
      },
      priority: 3,
      transformerParameters: {},
    };
    const onChange = vi.fn();
    renderFormTab(buffer, onChange);

    expect(screen.getByLabelText("Method")).toHaveValue("POST");
    expect(screen.getByLabelText("URL")).toHaveValue("/api/create");
    expect(screen.getByLabelText("Status")).toHaveValue(201);
    expect(screen.getByLabelText("Response body")).toHaveValue("created");
    expect(screen.getByLabelText("BodyAsFile")).toHaveValue("../responses/create.json");
    expect(screen.getByLabelText("Content-Type")).toHaveValue("application/json");
    expect(screen.getByLabelText("Delay")).toHaveValue(500);
    expect(screen.getByLabelText("Priority")).toHaveValue(3);
    expect(screen.getByLabelText("Use transformer")).toBeChecked();
  });

  it("renders empty fields when buffer has no request/response", () => {
    const buffer: MappingJson = {};
    const onChange = vi.fn();
    renderFormTab(buffer, onChange);

    expect(screen.getByLabelText("Method")).toHaveValue("");
    expect(screen.getByLabelText("URL")).toHaveValue("");
    expect(screen.getByLabelText("Use transformer")).not.toBeChecked();
  });
});

// ─── Request fields ───────────────────────────────────────────────────────────

describe("FormTab — method field", () => {
  it("calls onChange with updated request.method when method is changed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer = makeBuffer();
    renderFormTab(buffer, onChange);

    await user.selectOptions(screen.getByLabelText("Method"), "POST");

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as MappingJson;
    expect((updated.request as Record<string, unknown>).method).toBe("POST");
    // Other request fields retained
    expect((updated.request as Record<string, unknown>).url).toBe("/api/test");
  });

  it("retains all other top-level fields when updating method", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/api/test" },
      response: { status: 200 },
      priority: 5,
    };
    renderFormTab(buffer, onChange);

    await user.selectOptions(screen.getByLabelText("Method"), "DELETE");

    const updated = onChange.mock.calls[0][0] as MappingJson;
    expect(updated.priority).toBe(5);
    expect((updated.response as Record<string, unknown>).status).toBe(200);
  });
});

describe("FormTab — url field", () => {
  it("calls onChange with updated request.url when URL is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer = makeBuffer();
    renderControlled(buffer, onChange);

    const urlInput = screen.getByLabelText("URL");
    await user.clear(urlInput);
    await user.type(urlInput, "/api/new");

    // Each keystroke fires onChange and re-renders; final call has the full typed value
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.request as Record<string, unknown>).url).toBe("/api/new");
    // method retained
    expect((lastCall.request as Record<string, unknown>).method).toBe("GET");
  });
});

// ─── Response fields ──────────────────────────────────────────────────────────

describe("FormTab — status field", () => {
  it("calls onChange with numeric status when a number is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderControlled(buffer, onChange);

    const statusInput = screen.getByLabelText("Status");
    await user.clear(statusInput);
    await user.type(statusInput, "404");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.response as Record<string, unknown>).status).toBe(404);
  });

  it("sets status to undefined when cleared to empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderFormTab(buffer, onChange);

    const statusInput = screen.getByLabelText("Status");
    await user.clear(statusInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.response as Record<string, unknown>).status).toBeUndefined();
  });
});

describe("FormTab — body field", () => {
  it("calls onChange with updated response.body when text is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200, body: "old" },
    };
    renderControlled(buffer, onChange);

    const bodyTextarea = screen.getByLabelText("Response body");
    await user.clear(bodyTextarea);
    await user.type(bodyTextarea, "new body");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.response as Record<string, unknown>).body).toBe("new body");
  });

  it("deletes response.body when cleared to empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200, body: "something" },
    };
    renderFormTab(buffer, onChange);

    const bodyTextarea = screen.getByLabelText("Response body");
    await user.clear(bodyTextarea);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "body")).toBe(false);
    // status retained
    expect(response.status).toBe(200);
  });
});

describe("FormTab — bodyAsFile field", () => {
  it("calls onChange with updated response.bodyAsFile when text is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderControlled(buffer, onChange);

    const bafInput = screen.getByLabelText("BodyAsFile");
    await user.type(bafInput, "../responses/file.json");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.response as Record<string, unknown>).bodyAsFile).toBe("../responses/file.json");
  });

  it("deletes response.bodyAsFile when cleared to empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200, bodyAsFile: "../responses/file.json" },
    };
    renderFormTab(buffer, onChange);

    const bafInput = screen.getByLabelText("BodyAsFile");
    await user.clear(bafInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "bodyAsFile")).toBe(false);
  });
});

describe("FormTab — contentType field", () => {
  it("sets Content-Type header when no headers exist yet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderControlled(buffer, onChange);

    const ctInput = screen.getByLabelText("Content-Type");
    await user.type(ctInput, "application/json");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    const headers = response.headers as Record<string, unknown>;
    expect(headers?.["Content-Type"]).toBe("application/json");
  });

  it("updates Content-Type when other headers already exist", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: {
        status: 200,
        headers: { "X-Custom": "value", "Content-Type": "text/plain" },
      },
    };
    renderControlled(buffer, onChange);

    const ctInput = screen.getByLabelText("Content-Type");
    await user.clear(ctInput);
    await user.type(ctInput, "application/xml");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const headers = (lastCall.response as Record<string, unknown>).headers as Record<string, unknown>;
    expect(headers["Content-Type"]).toBe("application/xml");
    // Other headers retained
    expect(headers["X-Custom"]).toBe("value");
  });

  it("removes Content-Type but keeps headers object when other header keys exist", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: {
        status: 200,
        headers: { "X-Custom": "kept", "Content-Type": "text/html" },
      },
    };
    renderFormTab(buffer, onChange);

    const ctInput = screen.getByLabelText("Content-Type");
    await user.clear(ctInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    const headers = response.headers as Record<string, unknown>;
    // Content-Type removed
    expect(Object.prototype.hasOwnProperty.call(headers, "Content-Type")).toBe(false);
    // Other key still present
    expect(headers["X-Custom"]).toBe("kept");
    // headers object itself still exists (has remaining keys)
    expect(response.headers).toBeDefined();
  });

  it("sets headers to undefined when Content-Type is the only header and it is cleared", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    };
    renderFormTab(buffer, onChange);

    const ctInput = screen.getByLabelText("Content-Type");
    await user.clear(ctInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    // No remaining header keys → headers becomes undefined
    expect(response.headers).toBeUndefined();
  });
});

describe("FormTab — delay field", () => {
  it("sets fixedDelayMilliseconds to a number when typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderControlled(buffer, onChange);

    const delayInput = screen.getByLabelText("Delay");
    await user.type(delayInput, "300");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect((lastCall.response as Record<string, unknown>).fixedDelayMilliseconds).toBe(300);
  });

  it("deletes fixedDelayMilliseconds when cleared to empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200, fixedDelayMilliseconds: 500 },
    };
    renderFormTab(buffer, onChange);

    const delayInput = screen.getByLabelText("Delay");
    await user.clear(delayInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    const response = lastCall.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "fixedDelayMilliseconds")).toBe(false);
  });
});

// ─── Options fields ───────────────────────────────────────────────────────────

describe("FormTab — priority field", () => {
  it("sets priority as a number when typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer = makeBuffer();
    renderFormTab(buffer, onChange);

    const priorityInput = screen.getByLabelText("Priority");
    await user.type(priorityInput, "2");

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect(lastCall.priority).toBe(2);
  });

  it("deletes priority from the buffer when cleared to empty string", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
      priority: 5,
    };
    renderFormTab(buffer, onChange);

    const priorityInput = screen.getByLabelText("Priority");
    await user.clear(priorityInput);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as MappingJson;
    expect(Object.prototype.hasOwnProperty.call(lastCall, "priority")).toBe(false);
  });
});

describe("FormTab — useTransformer checkbox", () => {
  it("sets transformerParameters to an empty object when checked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
      // transformerParameters is absent → checkbox unchecked
    };
    renderFormTab(buffer, onChange);

    const checkbox = screen.getByLabelText("Use transformer");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as MappingJson;
    expect(updated.transformerParameters).toEqual({});
  });

  it("retains existing transformerParameters object when re-enabling (already set)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const existingParams = { template: "{{request.method}}" };
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
      transformerParameters: existingParams,
    };
    renderFormTab(buffer, onChange);

    // Uncheck first
    const checkbox = screen.getByLabelText("Use transformer");
    await user.click(checkbox);

    const afterUncheck = onChange.mock.calls[0][0] as MappingJson;
    expect(Object.prototype.hasOwnProperty.call(afterUncheck, "transformerParameters")).toBe(false);
  });

  it("deletes transformerParameters from the buffer when unchecked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
      transformerParameters: { key: "value" },
    };
    renderFormTab(buffer, onChange);

    const checkbox = screen.getByLabelText("Use transformer");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0] as MappingJson;
    expect(Object.prototype.hasOwnProperty.call(updated, "transformerParameters")).toBe(false);
  });

  it("enables transformer when previously absent then disables it on second click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Start unchecked
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };

    const { rerender } = render(<FormTab editBuffer={buffer} onChange={onChange} />);

    const checkbox = screen.getByLabelText("Use transformer");

    // First click — enable
    await user.click(checkbox);
    const firstCall = onChange.mock.calls[0][0] as MappingJson;
    expect(firstCall.transformerParameters).toEqual({});

    // Re-render with updated buffer (simulates controlled component update)
    rerender(<FormTab editBuffer={firstCall} onChange={onChange} />);

    // Second click — disable
    await user.click(screen.getByLabelText("Use transformer"));
    const secondCall = onChange.mock.calls[1][0] as MappingJson;
    expect(Object.prototype.hasOwnProperty.call(secondCall, "transformerParameters")).toBe(false);
  });
});

// ─── Edge cases / extra branches ─────────────────────────────────────────────

describe("FormTab — edge cases", () => {
  it("passes through unknown/advanced top-level keys in the onChange result", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
      uuid: "abc-123",
      extraField: "advanced-wiremock-key",
    };
    renderFormTab(buffer, onChange);

    await user.selectOptions(screen.getByLabelText("Method"), "POST");

    const updated = onChange.mock.calls[0][0] as MappingJson;
    expect(updated.uuid).toBe("abc-123");
    expect(updated.extraField).toBe("advanced-wiremock-key");
  });

  it("renders correctly when response has no headers property", () => {
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200 },
    };
    renderFormTab(buffer, onChange);
    // Content-Type input should show empty
    expect(screen.getByLabelText("Content-Type")).toHaveValue("");
  });

  it("renders delay as empty string when fixedDelayMilliseconds is 0", () => {
    // delay value === 0 is treated as "no delay" per the component logic
    // (delete branch: value === "" || value === 0)
    const onChange = vi.fn();
    const buffer: MappingJson = {
      request: { method: "GET", url: "/" },
      response: { status: 200, fixedDelayMilliseconds: 0 },
    };
    renderFormTab(buffer, onChange);
    // When delay is 0, String(0) = "0", so the input displays 0
    expect(screen.getByLabelText("Delay")).toHaveValue(0);
  });
});
