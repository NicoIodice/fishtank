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
