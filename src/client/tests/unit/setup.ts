import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
});
