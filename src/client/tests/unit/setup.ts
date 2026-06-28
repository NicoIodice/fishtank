import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock window.matchMedia for jsdom (not implemented natively)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub window.location globally so jsdom never fires "Not implemented: navigation".
// Tests can read/write window.location.href freely as a plain string.
const locationStub = {
  href: "",
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  ancestorOrigins: {} as DOMStringList,
  hash: "",
  host: "localhost",
  hostname: "localhost",
  origin: "http://localhost",
  pathname: "/",
  port: "",
  protocol: "http:",
  search: "",
};
Object.defineProperty(window, "location", {
  value: locationStub,
  writable: true,
  configurable: true,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Reset navigation stub between tests
  locationStub.href = "";
  locationStub.assign.mockReset();
  locationStub.replace.mockReset();
  locationStub.reload.mockReset();
  // With isolate:false all files share one worker, so any vi.useFakeTimers() call
  // in a test must be undone here to prevent @testing-library/dom waitFor from hanging.
  vi.useRealTimers();
});
