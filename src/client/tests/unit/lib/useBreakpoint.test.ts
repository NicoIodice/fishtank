import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useBreakpoint } from "@/lib/useBreakpoint";

// jsdom defaults to innerWidth=0; we control it per-test
function setWidth(px: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: px,
  });
}

afterEach(() => {
  setWidth(1024); // reset to desktop
  vi.restoreAllMocks();
});

describe("useBreakpoint", () => {
  it("returns desktop=true for wide viewports (≥1024px)", () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.desktop).toBe(true);
    expect(result.current.mobile).toBe(false);
    expect(result.current.mid).toBe(false);
  });

  it("returns mid=true for 768–1023px viewports", () => {
    setWidth(900);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.mid).toBe(true);
    expect(result.current.desktop).toBe(false);
    expect(result.current.mobile).toBe(false);
  });

  it("returns midNarrow=true for 640–767px viewports", () => {
    setWidth(700);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.midNarrow).toBe(true);
    expect(result.current.mobile).toBe(true); // <768
    expect(result.current.desktop).toBe(false);
  });

  it("returns mobile=true for narrow viewports (<768px)", () => {
    setWidth(400);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.mobile).toBe(true);
    expect(result.current.desktop).toBe(false);
  });

  it("updates breakpoints on window resize", () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.desktop).toBe(true);

    act(() => {
      setWidth(500);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current.mobile).toBe(true);
    expect(result.current.desktop).toBe(false);
  });

  it("removes the resize listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    setWidth(1024);
    const { unmount } = renderHook(() => useBreakpoint());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
