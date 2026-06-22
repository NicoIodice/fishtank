export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  externalUrl: string;
  port: number;
  mocksRoot: string;
  status: "live" | "stopped";
  isActive: boolean;
  tags: string[];
  createdAt: string;
  mockFileCount: number;
  mocksRootChanged?: boolean | null;
}

export interface ServiceFormValues {
  name: string;
  description: string;
  externalUrl: string;
  port: number | string;
  tags: string;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  externalUrl: string;
  port: number;
  tags?: string[];
}

export interface UpdateServicePayload {
  name: string;
  description?: string;
  externalUrl: string;
  port: number;
  tags?: string[];
}
