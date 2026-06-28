import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/router/ProtectedRoute";
import { FirstRunGate } from "@/components/router/FirstRunGate";

// ─── Mock useAuth ─────────────────────────────────────────────────────────────

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from "@/features/auth/hooks/useAuth";
const mockUseAuth = vi.mocked(useAuth);

// ─── Mock apiFetch for FirstRunGate ──────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));
import { apiFetch } from "@/lib/api";
const mockApiFetch = vi.mocked(apiFetch);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapInRouter(element: ReactNode, initialPath = "/", qc?: QueryClient) {
  const client = qc ?? makeQc();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing while auth is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
    });
    const { container } = render(
      wrapInRouter(
        <ProtectedRoute>
          <div data-testid="protected-child">Protected</div>
        </ProtectedRoute>,
      ),
    );
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("renders children when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { userId: "user-1", username: "admin", role: "Admin", forcePasswordChange: false },
      isLoading: false,
      isAuthenticated: true,
    });
    render(
      wrapInRouter(
        <ProtectedRoute>
          <div data-testid="protected-child">Protected</div>
        </ProtectedRoute>,
      ),
    );
    expect(screen.getByTestId("protected-child")).toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    render(
      wrapInRouter(
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div data-testid="protected-child">Protected</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={<div data-testid="login-page">Login</div>}
          />
        </Routes>,
        "/",
      ),
    );
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });

  it("redirects to /setup/change-password when forcePasswordChange is set", () => {
    mockUseAuth.mockReturnValue({
      user: { userId: "user-1", username: "admin", role: "Admin", forcePasswordChange: true },
      isLoading: false,
      isAuthenticated: true,
    });
    render(
      wrapInRouter(
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div data-testid="protected-child">Protected</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/setup/change-password"
            element={<div data-testid="change-pw">Change PW</div>}
          />
        </Routes>,
        "/",
      ),
    );
    expect(screen.getByTestId("change-pw")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-child")).not.toBeInTheDocument();
  });
});

// ─── FirstRunGate ─────────────────────────────────────────────────────────────

describe("FirstRunGate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing while setup status is loading", () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    const { container } = render(
      wrapInRouter(
        <FirstRunGate>
          <div data-testid="gate-child">Child</div>
        </FirstRunGate>,
      ),
    );
    // While loading, renders null
    expect(screen.queryByTestId("gate-child")).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it("renders children when setup is not needed", async () => {
    mockApiFetch.mockResolvedValue({ needsSetup: false });

    render(
      wrapInRouter(
        <FirstRunGate>
          <div data-testid="gate-child">Child</div>
        </FirstRunGate>,
      ),
    );
    await screen.findByTestId("gate-child");
  });

  it("redirects to /setup when setup is needed and not on /setup route", async () => {
    mockApiFetch.mockResolvedValue({ needsSetup: true });

    render(
      wrapInRouter(
        <Routes>
          <Route
            path="/"
            element={
              <FirstRunGate>
                <div data-testid="gate-child">Child</div>
              </FirstRunGate>
            }
          />
          <Route
            path="/setup"
            element={<div data-testid="setup-page">Setup</div>}
          />
        </Routes>,
        "/",
      ),
    );
    await screen.findByTestId("setup-page");
    expect(screen.queryByTestId("gate-child")).not.toBeInTheDocument();
  });

  it("renders children on /setup route even when setup is needed", async () => {
    mockApiFetch.mockResolvedValue({ needsSetup: true });

    render(
      wrapInRouter(
        <Routes>
          <Route
            path="/setup"
            element={
              <FirstRunGate>
                <div data-testid="gate-child">Setup content</div>
              </FirstRunGate>
            }
          />
        </Routes>,
        "/setup",
      ),
    );
    await screen.findByTestId("gate-child");
  });
});
