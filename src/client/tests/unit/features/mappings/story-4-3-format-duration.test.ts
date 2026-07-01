/**
 * ATDD unit tests — Story 4.3: Resync UI with Toast Feedback & Conflict Banners
 * Layer: Unit (Vitest — pure function, no DOM)
 *
 * RED PHASE — `formatDuration` does not exist yet.
 * Import will fail until `src/client/src/features/mappings/utils/formatDuration.ts` is created.
 *
 * AC covered:
 *   AC-5 — Duration format rules:
 *     • <10,000ms     → "{N}ms"           e.g. "850ms"
 *     • ≥10,000ms     → "{N.X}s"          e.g. "12.5s"
 *     • ≥60,000ms     → "{M}m {S}s"       e.g. "1m 23s"
 *
 * Edge-case table from Dev Notes:
 *   0       → "0ms"
 *   850     → "850ms"
 *   9999    → "9999ms"
 *   10000   → "10.0s"
 *   12500   → "12.5s"
 *   59999   → "60.0s"   (59.999 s rounds to 60.0 s)
 *   60000   → "1m 0s"
 *   123456  → "2m 3s"
 */

import { describe, it, expect } from "vitest";

// ─── RED: this module does not exist yet ──────────────────────────────────────
import { formatDuration } from "@/features/mappings/utils/formatDuration";

// ─────────────────────────────────────────────────────────────────────────────

describe("formatDuration (AC-5)", () => {
  describe("< 10,000 ms — returns integer ms string", () => {
    it("formats 0 ms as '0ms'", () => {
      expect(formatDuration(0)).toBe("0ms");
    });

    it("formats 1 ms as '1ms'", () => {
      expect(formatDuration(1)).toBe("1ms");
    });

    it("formats 850 ms as '850ms'", () => {
      expect(formatDuration(850)).toBe("850ms");
    });

    it("formats 9999 ms as '9999ms'", () => {
      expect(formatDuration(9999)).toBe("9999ms");
    });
  });

  describe(">= 10,000 ms and < 60,000 ms — returns {N.X}s", () => {
    it("formats 10000 ms as '10.0s'", () => {
      expect(formatDuration(10000)).toBe("10.0s");
    });

    it("formats 12500 ms as '12.5s'", () => {
      expect(formatDuration(12500)).toBe("12.5s");
    });

    it("formats 59999 ms as '60.0s' (rounding)", () => {
      expect(formatDuration(59999)).toBe("60.0s");
    });
  });

  describe(">= 60,000 ms — returns {M}m {S}s", () => {
    it("formats 60000 ms as '1m 0s'", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
    });

    it("formats 123456 ms as '2m 3s'", () => {
      expect(formatDuration(123456)).toBe("2m 3s");
    });

    it("formats 90000 ms (90 s) as '1m 30s'", () => {
      expect(formatDuration(90000)).toBe("1m 30s");
    });

    it("formats 3600000 ms (1 hour) as '60m 0s'", () => {
      expect(formatDuration(3600000)).toBe("60m 0s");
    });
  });

  describe("boundary: exactly 10,000 ms switches from ms to s format", () => {
    it("9999 ms is still in ms format", () => {
      expect(formatDuration(9999)).toMatch(/ms$/);
    });

    it("10000 ms switches to s format", () => {
      expect(formatDuration(10000)).toMatch(/s$/);
      expect(formatDuration(10000)).not.toMatch(/ms$/);
    });
  });

  describe("boundary: exactly 60,000 ms switches from s to m format", () => {
    it("59999 ms stays in s format (rounds to 60.0s, not 1m 0s)", () => {
      // Per spec table: 59999 → "60.0s" (the fractional seconds format, not minutes)
      expect(formatDuration(59999)).toBe("60.0s");
    });

    it("60000 ms switches to m format", () => {
      expect(formatDuration(60000)).toMatch(/m/);
    });
  });
});
