export interface FeatureToggle {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  envVarOverride: boolean | null;
}

export interface SetToggleRequest {
  enabled: boolean;
}

export interface HealthDto {
  activeServicesCount: number;
  totalRequestCount: number;
  databaseStatus: "accessible" | "inaccessible";
  uptimeSeconds: number;
}

export interface AuditEntryDto {
  id: string;
  action: string;
  actorUsername: string | null;
  resourceType: string;
  resourceId: string | null;
  details: unknown;
  createdAt: string;
}

export interface AuditPageDto {
  items: AuditEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}
