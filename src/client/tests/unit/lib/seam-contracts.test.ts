import { describe, it, expect } from "vitest";

/**
 * Vitest unit tests for Story 1.5: TypeScript Seam Contracts.
 *
 * T-1-5-01 — queryClient.ts exports `queryClient` and `HUB_INVALIDATION_MAP`
 * T-1-5-02 — signalr.ts exports `createHubConnection` as a factory function
 *
 * RED:  N/A — These seam contracts were established in Story 1.3.
 *             These tests pass immediately and serve as regression guards,
 *             ensuring the seam contracts remain stable as Epic 2 activates them.
 * GREEN: Always green after Story 1.3 (non-breaking forward compatibility check).
 *
 * Source: test-design-epic-1.md scenarios T-1-5-01, T-1-5-02 (P3)
 */

describe("T-1-5-01: queryClient.ts seam contracts", () => {
  it("exports a queryClient instance", async () => {
    // RED: N/A — queryClient.ts was established in Story 1.3
    const mod = await import("@/lib/queryClient");
    expect(mod.queryClient).toBeDefined();
    expect(typeof mod.queryClient).toBe("object");
  });

  it("exports HUB_INVALIDATION_MAP as an object (Epic 2+ populates entries)", async () => {
    // RED: N/A — HUB_INVALIDATION_MAP was established in Story 1.3
    // The map starts empty; Epic 2+ stories add entries — this test only
    // verifies the export contract (type and existence), not the content.
    const mod = await import("@/lib/queryClient");
    expect(mod.HUB_INVALIDATION_MAP).toBeDefined();
    expect(typeof mod.HUB_INVALIDATION_MAP).toBe("object");
    expect(mod.HUB_INVALIDATION_MAP).not.toBeNull();
  });
});

describe("T-1-5-02: signalr.ts seam contracts", () => {
  it("exports createHubConnection as a factory function", async () => {
    // RED: N/A — createHubConnection was established in Story 1.3
    const mod = await import("@/lib/signalr");
    expect(typeof mod.createHubConnection).toBe("function");
  });

  it("createHubConnection returns a HubConnection object when called with a URL", async () => {
    // RED: N/A — signalr.ts was established in Story 1.3
    // This test validates the factory contract: given a URL string,
    // the function returns an object (HubConnection instance).
    // Note: Does NOT call .start() — that is Epic 2+ responsibility.
    const mod = await import("@/lib/signalr");
    const connection = mod.createHubConnection("http://localhost/hub");
    expect(connection).toBeDefined();
    expect(typeof connection).toBe("object");
    // Verify the returned object has the expected SignalR HubConnection API surface
    expect(typeof connection.start).toBe("function");
    expect(typeof connection.stop).toBe("function");
    expect(typeof connection.on).toBe("function");
  });
});
