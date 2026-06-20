import { faker } from "@faker-js/faker";

export type ServiceStatus = "live" | "stopped";

export interface ServiceConfig {
  name: string;
  /** Must be in the range 30100–30199 (Fishtank architecture constraint). */
  port: number;
  status: ServiceStatus;
  description?: string;
}

/** Port range per architecture: 30100–30199 (max 100 services in v1). */
const PORT_MIN = 30100;
const PORT_MAX = 30199;

/**
 * Creates a valid ServiceConfig with sensible defaults.
 * Pass overrides to document what matters for each test.
 *
 * @example
 * const svc = createService({ name: 'payments-mock', port: 30110 });
 */
export const createService = (
  overrides: Partial<ServiceConfig> = {},
): ServiceConfig => ({
  name: faker.helpers
    .slugify(faker.company.buzzNoun())
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 30),
  port: faker.number.int({ min: PORT_MIN, max: PORT_MAX }),
  status: "stopped",
  ...overrides,
});
