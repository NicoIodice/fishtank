/**
 * Unit tests for Story 2.5 — formatBytes helper in cache.ts
 *
 * AC covered: AC-1 (display of entry count and estimated size).
 *
 * Exhaustively covers the four branches in formatBytes:
 *   - 0 bytes          → "0 B"
 *   - < 1024 bytes     → "{n} B"
 *   - < 1 MiB          → "{n.1f} KB"
 *   - ≥ 1 MiB          → "{n.1f} MB"
 */

import { describe, it, expect } from "vitest";
import { formatBytes } from "@/features/settings/types/cache";

describe("formatBytes", () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it('returns bytes with "B" suffix for values under 1 KB (e.g. 512)', () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it('returns bytes with "B" suffix for 1-byte values', () => {
    expect(formatBytes(1)).toBe("1 B");
  });

  it('returns bytes with "B" suffix for 1023 bytes (just under 1 KB)', () => {
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it('returns "1.0 KB" for exactly 1024 bytes', () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });

  it('returns "1.5 KB" for 1536 bytes', () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("returns KB display for values up to (but not including) 1 MiB", () => {
    const oneMiB = 1024 * 1024;
    expect(formatBytes(oneMiB - 1)).toBe(
      `${((oneMiB - 1) / 1024).toFixed(1)} KB`,
    );
  });

  it('returns "1.0 MB" for exactly 1 MiB (1024 * 1024 bytes)', () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
  });

  it('returns "1.5 MB" for 1.5 MiB', () => {
    expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
  });
});
