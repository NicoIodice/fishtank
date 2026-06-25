export type SystemEventSeverity = "info" | "warning" | "error";

export interface SystemEvent {
  id: string;
  severity: SystemEventSeverity;
  message: string;
  serviceId: string | null;
  serviceName: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface SystemEventPage {
  items: SystemEvent[];
  total: number;
  hasMore: boolean;
}

// Bootstrap Icons + semantic color var per severity (DESIGN.md lines 33, 404, 466)
export const SEVERITY_ICON: Record<SystemEventSeverity, string> = {
  error: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

export const SEVERITY_COLOR: Record<SystemEventSeverity, string> = {
  error: "var(--error, #ef4444)",
  warning: "var(--warning, #f59e0b)",
  info: "var(--info, #3b82f6)",
};
