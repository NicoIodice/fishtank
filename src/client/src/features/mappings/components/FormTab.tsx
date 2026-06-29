import React from "react";
import type { MappingJson } from "../types/mappings";

interface FormTabProps {
  editBuffer: MappingJson;
  onChange: (updated: MappingJson) => void;
}

/**
 * Form tab — guided fields for common Mapping properties.
 * Reads/writes only known keys on the parsed JSON object in the edit buffer.
 * Unknown/advanced WireMock fields are retained untouched (AC-7).
 */
export function FormTab({ editBuffer, onChange }: FormTabProps) {
  const req = (editBuffer.request as Record<string, unknown>) ?? {};
  const res = (editBuffer.response as Record<string, unknown>) ?? {};

  const method = (req.method as string) ?? "";
  const url = (req.url as string) ?? "";
  const status = String(res.status ?? "");
  const body = (res.body as string) ?? "";
  const bodyAsFile = (res.bodyAsFile as string) ?? "";
  const contentType = ((res.headers as Record<string, unknown>)?.["Content-Type"] as string) ?? "";
  const delay = String((res.fixedDelayMilliseconds as number) ?? "");
  const priority = String(editBuffer.priority ?? "");
  const useTransformer = editBuffer.transformerParameters !== undefined;

  function updateField(key: string, value: unknown) {
    const next = { ...editBuffer };

    // Handle nested request fields
    if (key === "method" || key === "url") {
      next.request = { ...(next.request as Record<string, unknown>), [key]: value };
    }
    // Handle nested response fields
    else if (key === "status") {
      const statusNum = value === "" ? undefined : Number(value);
      next.response = { ...(next.response as Record<string, unknown>), status: statusNum };
    }
    else if (key === "body") {
      const r = { ...(next.response as Record<string, unknown>) };
      if (value === "") {
        delete r.body;
      } else {
        r.body = value;
      }
      next.response = r;
    }
    else if (key === "bodyAsFile") {
      const r = { ...(next.response as Record<string, unknown>) };
      if (value === "") {
        delete r.bodyAsFile;
      } else {
        r.bodyAsFile = value;
      }
      next.response = r;
    }
    else if (key === "contentType") {
      const r = { ...(next.response as Record<string, unknown>) };
      const existingHeaders = (r.headers as Record<string, unknown>) ?? {};
      if (value === "") {
        const rest = { ...existingHeaders };
        delete rest["Content-Type"];
        r.headers = Object.keys(rest).length > 0 ? rest : undefined;
      } else {
        r.headers = { ...existingHeaders, "Content-Type": value };
      }
      next.response = r;
    }
    else if (key === "delay") {
      const r = { ...(next.response as Record<string, unknown>) };
      if (value === "" || value === 0) {
        delete r.fixedDelayMilliseconds;
      } else {
        r.fixedDelayMilliseconds = Number(value);
      }
      next.response = r;
    }
    else if (key === "priority") {
      if (value === "") {
        delete next.priority;
      } else {
        next.priority = Number(value);
      }
    }
    else if (key === "useTransformer") {
      if (!value) {
        delete next.transformerParameters;
      } else {
        next.transformerParameters = next.transformerParameters ?? {};
      }
    }

    onChange(next);
  }

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "12px",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--content-muted, #6b7280)",
  };

  const inputStyle: React.CSSProperties = {
    padding: "6px 8px",
    border: "1px solid var(--input-border, #e5e7eb)",
    borderRadius: "4px",
    background: "var(--input-bg, #fff)",
    color: "var(--content-fg, #374151)",
    fontSize: "0.875rem",
  };

  return (
    <div style={{ padding: "16px", overflowY: "auto", height: "100%" }}>
      {/* Request section */}
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--content-muted)", marginBottom: "12px" }}>
          Request
        </h4>

        <div style={fieldStyle}>
          <label htmlFor="form-method" style={labelStyle}>Method</label>
          <select
            id="form-method"
            aria-label="Method"
            value={method}
            onChange={(e) => updateField("method", e.target.value)}
            style={inputStyle}
          >
            <option value="">— select —</option>
            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "ANY"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="form-url" style={labelStyle}>URL Pattern</label>
          <input
            id="form-url"
            type="text"
            aria-label="URL"
            value={url}
            onChange={(e) => updateField("url", e.target.value)}
            placeholder="/api/path"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Response section */}
      <div style={{ marginBottom: "16px" }}>
        <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--content-muted)", marginBottom: "12px" }}>
          Response
        </h4>

        <div style={fieldStyle}>
          <label htmlFor="form-status" style={labelStyle}>Status Code</label>
          <input
            id="form-status"
            type="number"
            aria-label="Status"
            value={status}
            onChange={(e) => updateField("status", e.target.value)}
            placeholder="200"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="form-body" style={labelStyle}>Response Body</label>
          <textarea
            id="form-body"
            aria-label="Response body"
            value={body}
            onChange={(e) => updateField("body", e.target.value)}
            placeholder="Response body content"
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="form-body-as-file" style={labelStyle}>Body As File (BodyAsFile)</label>
          <input
            id="form-body-as-file"
            type="text"
            aria-label="BodyAsFile"
            value={bodyAsFile}
            onChange={(e) => updateField("bodyAsFile", e.target.value)}
            placeholder="../responses/filename_body.json"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="form-content-type" style={labelStyle}>Content-Type</label>
          <input
            id="form-content-type"
            type="text"
            aria-label="Content-Type"
            value={contentType}
            onChange={(e) => updateField("contentType", e.target.value)}
            placeholder="application/json"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="form-delay" style={labelStyle}>Delay (ms)</label>
          <input
            id="form-delay"
            type="number"
            aria-label="Delay"
            value={delay}
            onChange={(e) => updateField("delay", e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Misc section */}
      <div>
        <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--content-muted)", marginBottom: "12px" }}>
          Options
        </h4>

        <div style={fieldStyle}>
          <label htmlFor="form-priority" style={labelStyle}>Priority</label>
          <input
            id="form-priority"
            type="number"
            aria-label="Priority"
            value={priority}
            onChange={(e) => updateField("priority", e.target.value)}
            placeholder="1"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
          <input
            id="form-use-transformer"
            type="checkbox"
            aria-label="Use transformer"
            checked={useTransformer}
            onChange={(e) => updateField("useTransformer", e.target.checked)}
          />
          <label htmlFor="form-use-transformer" style={{ fontSize: "0.875rem", color: "var(--content-fg)" }}>
            Use Transformer
          </label>
        </div>
      </div>
    </div>
  );
}
