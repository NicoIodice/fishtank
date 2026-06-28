export type ActivityType = "Mocked" | "Proxied";

export interface ActivityRow {
  id: string;           // GUID
  timestamp: string;    // ISO 8601
  method: string;       // "GET", "POST", etc.
  urlPath: string;      // Full path
  statusCode: number;
  type: ActivityType;
  serviceId: string;    // GUID
  serviceName: string;
  servicePort: number;
  durationMs: number;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
}

export interface ActivityQueryParams {
  serviceId?: string;
  type?: string;
  search?: string;
  skip?: number;
  take?: number;
}
