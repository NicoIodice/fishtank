import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/**
 * Component tests for UserManagementSection
 * Story 5-2: User Management — Create, View & Deactivate
 *
 * Coverage:
 * - AC-1: Displays user list with correct columns
 * - AC-2: Status badges (Active green / Deactivated slate with opacity)
 * - AC-9: Self-deactivation guard (disable button for current user)
 * - Loading and error states
 */

// Mock auth context
const mockAuthContext = {
  user: { id: "admin-1", username: "testadmin", role: "Admin" },
  isAuthenticated: true,
  isLoading: false,
};

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock dialogs to isolate component testing
vi.mock("../../../../src/features/admin/components/CreateUserDialog", () => ({
  CreateUserDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="mock-create-dialog">Create Dialog</div> : null,
}));

vi.mock(
  "../../../../src/features/admin/components/DeactivateUserDialog",
  () => ({
    DeactivateUserDialog: ({ open }: { open: boolean }) =>
      open ? (
        <div data-testid="mock-deactivate-dialog">Deactivate Dialog</div>
      ) : null,
  }),
);

const mockUsers = [
  {
    id: "user-1",
    username: "alice",
    role: "StandardUser",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "admin-1",
    username: "testadmin",
    role: "Admin",
    isActive: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "user-2",
    username: "bob",
    role: "StandardUser",
    isActive: false,
    createdAt: "2026-01-10T12:00:00Z",
  },
  {
    id: "user-3",
    username: "charlie",
    role: "Admin",
    isActive: true,
    createdAt: "2026-01-20T14:00:00Z",
  },
];

const server = setupServer(
  http.get("/api/users", () => {
    return HttpResponse.json({ success: true, data: mockUsers });
  }),
);

beforeEach(() => {
  server.listen();
  vi.clearAllMocks();
});

afterEach(() => {
  server.close();
});

describe("UserManagementSection", () => {
  const renderComponent = async () => {
    const { UserManagementSection } =
      await import("../../../../src/features/admin/components/UserManagementSection");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <UserManagementSection />
      </QueryClientProvider>,
    );
  };

  it("AC-1: renders user list table with all columns", async () => {
    await renderComponent();

    // Wait for data to load
    expect(await screen.findByText("alice")).toBeInTheDocument();

    // Check all required columns are present
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    // Verify users are displayed alphabetically (alice, bob, charlie, testadmin)
    const usernames = screen.getAllByTestId(/^user-row-/);
    expect(usernames).toHaveLength(4);
    expect(usernames[0]).toHaveAttribute("data-testid", "user-row-alice");
    expect(usernames[1]).toHaveAttribute("data-testid", "user-row-bob");
    expect(usernames[2]).toHaveAttribute("data-testid", "user-row-charlie");
    expect(usernames[3]).toHaveAttribute("data-testid", "user-row-testadmin");
  });

  it("AC-2: shows green 'Active' badge for active users", async () => {
    await renderComponent();

    const aliceBadge = await screen.findByTestId("user-status-alice");
    expect(aliceBadge).toHaveTextContent("Active");
    expect(aliceBadge).toHaveClass("statusActive");
  });

  it("AC-2: shows slate 'Deactivated' badge with opacity for deactivated users", async () => {
    await renderComponent();

    const bobBadge = await screen.findByTestId("user-status-bob");
    expect(bobBadge).toHaveTextContent("Deactivated");
    expect(bobBadge).toHaveClass("statusInactive");

    // Check that the row has reduced opacity styling
    const bobRow = screen.getByTestId("user-row-bob");
    expect(bobRow).toHaveClass("deactivatedRow");
  });

  it("AC-9: disables Deactivate button for current user (self-deactivation guard)", async () => {
    await renderComponent();

    // Find the current user's (testadmin) deactivate button
    const adminButton = await screen.findByTestId("user-deactivate-testadmin");
    expect(adminButton).toBeDisabled();
    expect(adminButton).toHaveAttribute("aria-disabled", "true");
    expect(adminButton).toHaveAttribute(
      "title",
      "You cannot deactivate your own account",
    );
  });

  it("AC-9: enables Deactivate button for other users", async () => {
    await renderComponent();

    const aliceButton = await screen.findByTestId("user-deactivate-alice");
    expect(aliceButton).toBeEnabled();
    expect(aliceButton).not.toHaveAttribute("aria-disabled", "true");
  });

  it("does not show Deactivate button for already deactivated users", async () => {
    await renderComponent();

    await screen.findByText("alice"); // Wait for data

    // Bob is deactivated, so no deactivate button should exist
    const bobButton = screen.queryByTestId("user-deactivate-bob");
    expect(bobButton).not.toBeInTheDocument();
  });

  it("opens CreateUserDialog when Create User button is clicked", async () => {
    await renderComponent();
    const user = userEvent.setup();

    const createButton = await screen.findByTestId("btn-create-user");
    await user.click(createButton);

    expect(screen.getByTestId("mock-create-dialog")).toBeInTheDocument();
  });

  it("opens DeactivateUserDialog when Deactivate button is clicked", async () => {
    await renderComponent();
    const user = userEvent.setup();

    const deactivateButton = await screen.findByTestId("user-deactivate-alice");
    await user.click(deactivateButton);

    expect(screen.getByTestId("mock-deactivate-dialog")).toBeInTheDocument();
  });

  it("shows loading state while fetching users", async () => {
    server.use(
      http.get("/api/users", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ success: true, data: mockUsers });
      }),
    );

    await renderComponent();

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("shows error message when fetch fails", async () => {
    server.use(
      http.get("/api/users", () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: "SYSTEM_ERROR",
              message: "Database connection failed",
            },
          },
          { status: 500 },
        );
      }),
    );

    await renderComponent();

    expect(await screen.findByText(/Error loading users:/)).toBeInTheDocument();
  });
});
