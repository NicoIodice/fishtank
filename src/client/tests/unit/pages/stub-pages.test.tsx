import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

// Mutable auth mock for AdminPage tests
const mockUseAuth = vi.fn();
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));
vi.mock("@/features/admin/hooks/useTogglesHub", () => ({
  useTogglesHub: vi.fn(),
}));
vi.mock("@/features/admin/hooks/useToggles", () => ({
  useToggles: () => ({
    toggles: [],
    isLoading: false,
    error: null,
    setToggle: vi.fn(),
    isSettingToggle: false,
  }),
}));

describe("AdminPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "1", username: "admin", role: "Admin" },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it("renders the Admin Console page for Admin-role users", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <AdminPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("page-admin-console")).toBeInTheDocument();
  });

  it("renders null for Standard User (role guard)", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "2", username: "std", role: "Standard User" },
      isAuthenticated: true,
      isLoading: false,
    });
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <QueryClientProvider client={qc}>
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route
              path="/services"
              element={<div data-testid="services-page">Services</div>}
            />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("page-admin-console")).not.toBeInTheDocument();
    // After redirect, /services route renders
    expect(screen.getByTestId("services-page")).toBeInTheDocument();
  });
});

describe("MappingsPage", () => {
  it("renders the mappings page shell", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={["/mappings"]}>
        <QueryClientProvider client={qc}>
          <MappingsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("page-mappings")).toBeInTheDocument();
  });
});
