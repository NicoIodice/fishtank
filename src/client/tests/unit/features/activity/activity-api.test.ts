import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Stable mock — survives vi.resetModules()
const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

// Import dynamically after resetting modules to pick up this file's mock.
let fetchActivityRows: typeof import("@/features/activity/api").fetchActivityRows;
let clearActivityLog: typeof import("@/features/activity/api").clearActivityLog;

describe("activity API", () => {
  beforeAll(async () => {
    vi.resetModules();
    ({ fetchActivityRows, clearActivityLog } =
      await import("@/features/activity/api"));
  });

  beforeEach(() => vi.clearAllMocks());

  // ── fetchActivityRows ────────────────────────────────────────────────────────

  describe("fetchActivityRows", () => {
    it("calls GET /api/activity with no params", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      const result = await fetchActivityRows();
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity");
      expect(result).toEqual([]);
    });

    it("appends serviceId query param when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({ serviceId: "svc-1" });
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/activity?serviceId=svc-1",
      );
    });

    it("appends type query param when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({ type: "Mocked" });
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity?type=Mocked");
    });

    it("appends search query param when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({ search: "foo" });
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity?search=foo");
    });

    it("appends skip query param when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({ skip: 10 });
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity?skip=10");
    });

    it("appends take query param when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({ take: 50 });
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity?take=50");
    });

    it("appends multiple query params when provided", async () => {
      mockApiFetch.mockResolvedValueOnce([]);
      await fetchActivityRows({
        serviceId: "svc-1",
        type: "Proxied",
        take: 100,
      });
      const url = (mockApiFetch.mock.calls[0]?.[0] as string) ?? "";
      expect(url).toContain("serviceId=svc-1");
      expect(url).toContain("type=Proxied");
      expect(url).toContain("take=100");
      expect(url.startsWith("/api/activity?")).toBe(true);
    });
  });

  // ── clearActivityLog ─────────────────────────────────────────────────────────

  describe("clearActivityLog", () => {
    it("calls DELETE /api/activity", async () => {
      mockApiFetch.mockResolvedValueOnce(null);
      await clearActivityLog();
      expect(mockApiFetch).toHaveBeenCalledWith("/api/activity", {
        method: "DELETE",
      });
    });
  });
});
