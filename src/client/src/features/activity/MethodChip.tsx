interface MethodChipProps {
  method: string;
}

const METHOD_COLORS: Record<
  string,
  { text: string; bg: string }
> = {
  GET: { text: "#3b82f6", bg: "#eff6ff" },
  POST: { text: "#10b981", bg: "#ecfdf5" },
  PUT: { text: "#d97706", bg: "#fef3c7" },
  DELETE: { text: "#ef4444", bg: "#fee2e2" },
  PATCH: { text: "#8b5cf6", bg: "#ede9fe" },
};

const DEFAULT_COLOR = { text: "#475569", bg: "#f1f5f9" };

export function MethodChip({ method }: MethodChipProps) {
  const color = METHOD_COLORS[method.toUpperCase()] ?? DEFAULT_COLOR;

  return (
    <span
      style={{
        color: color.text,
        backgroundColor: color.bg,
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      {method}
    </span>
  );
}
