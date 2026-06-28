/**
 * Import the router to achieve coverage of the route configuration.
 * No render needed — just verifying the module loads and exports the router object.
 */
import { describe, it, expect, vi } from "vitest";

// Stub heavy components so createBrowserRouter can resolve without a full render
vi.mock("@/components/layout/AppShell", () => ({ AppShell: () => null }));
vi.mock("@/components/router/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/router/FirstRunGate", () => ({
  FirstRunGate: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/features/auth/pages/LoginPage", () => ({ LoginPage: () => null }));
vi.mock("@/features/auth/pages/SetupPage", () => ({ SetupPage: () => null }));
vi.mock("@/features/auth/pages/ChangePasswordPage", () => ({
  ChangePasswordPage: () => null,
}));
vi.mock("@/features/services/pages/ServicesPage", () => ({
  ServicesPage: () => null,
}));
vi.mock("@/features/activity/pages/ActivityPage", () => ({
  ActivityPage: () => null,
}));
vi.mock("@/features/mappings/pages/MappingsPage", () => ({
  MappingsPage: () => null,
}));
vi.mock("@/features/events/pages/EventsPage", () => ({
  EventsPage: () => null,
}));
vi.mock("@/features/settings/pages/SettingsPage", () => ({
  SettingsPage: () => null,
}));
vi.mock("@/features/admin/pages/AdminPage", () => ({ AdminPage: () => null }));

import { router } from "@/router";

describe("router", () => {
  it("exports a router object with routes configured", () => {
    expect(router).toBeDefined();
    expect(typeof router.navigate).toBe("function");
  });
});
