import { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";

interface RawJsonTabProps {
  content: string;
  onChange: (value: string) => void;
}

/**
 * Raw JSON tab — CodeMirror editor with lang-json and one-dark theme.
 * Copy JSON button copies current content to clipboard (AC-17).
 */
export function RawJsonTab({ content, onChange }: RawJsonTabProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API unavailable — silently fail
    }
  }, [content]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Actions bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "4px 8px",
          borderBottom: "1px solid var(--input-border, #e5e7eb)",
          background: "var(--surface-subtle, #f9fafb)",
          flexShrink: 0,
        }}
      >
        <button
          data-testid="mappings-btn-copy-json"
          aria-label="Copy JSON to clipboard"
          onClick={() => void handleCopy()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 10px",
            border: "1px solid var(--input-border, #e5e7eb)",
            borderRadius: "4px",
            background: "var(--surface, #fff)",
            color: "var(--content-fg, #374151)",
            fontSize: "0.8125rem",
            cursor: "pointer",
          }}
        >
          <i className="bi bi-clipboard" aria-hidden="true" />
          Copy JSON
        </button>
      </div>

      {/* CodeMirror editor */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <CodeMirror
          value={content}
          height="100%"
          extensions={[json()]}
          theme={oneDark}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: true,
          }}
        />
      </div>
    </div>
  );
}
