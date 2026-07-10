import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { DeactivateUserDialog } from "@/features/admin/components/DeactivateUserDialog";

/**
 * Component tests for DeactivateUserDialog
 * Story 5-2: User Management — Create, View & Deactivate
 *
 * Coverage:
 * - AC-6: Deactivation confirmation dialog
 * - AC-10: Last admin guard error handling
 * - NFR-15: Destructive action requires explicit confirmation
 * - NFR-19: Focus trap and Escape key
 */

const { mockShowToast, mockUseFocusTrap } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockUseFocusTrap: vi.fn(),
}));

vi.mock("@/lib/useToast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("@/hooks/useFocusTrap", () => ({
  useFocusTrap: mockUseFocusTrap,
}));

const mockUser = {
  id: "user-1",
  username: "alice",
  role: "StandardUser",
  isActive: true,
  createdAt: "2026-01-15T10:00:00Z",
};

const mockAdminUser = {
  id: "admin-1",
  username: "adminuser",
  role: "Admin",
  isActive: true,
  createdAt: "2026-01-01T08:00:00Z",
};

const server = setupServer(
  http.put("/api/users/:userId/deactivate", ({ params }) => {
    const { userId } = params;

    // Simulate last admin guard
    if (userId === "last-admin-id") {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: "ADMIN_LAST_ADMIN_DEACTIVATE",
            message: "Cannot deactivate the last active administrator.",
          },
        },
        { status: 409 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: userId,
        username: "alice",
        role: "StandardUser",
        isActive: false,
        createdAt: "2026-01-15T10:00:00Z",
      },
    });
  }),
);

beforeEach(() => {
  server.listen();
  vi.clearAllMocks();
});

afterEach(() => {
  server.close();
});

describe("DeactivateUserDialog", () => {
  const mockOnOpenChange = vi.fn();

  const renderComponent = (user = mockUser, open = true) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <DeactivateUserDialog
          open={open}
          onOpenChange={mockOnOpenChange}
          user={user}
        />
      </QueryClientProvider>,
    );
  };

  it("AC-6: renders confirmation dialog with user information", async () => {
    renderComponent();

    expect(screen.getByTestId("dialog-deactivate-user")).toBeInTheDocument();
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure/)).toBeInTheDocument();
    expect(
      screen.getByTestId("btn-deactivate-user-confirm"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("btn-deactivate-user-cancel"),
    ).toBeInTheDocument();
  });

  it("does not render when open=false", async () => {
    renderComponent(mockUser, false);

    expect(
      screen.queryByTestId("dialog-deactivate-user"),
    ).not.toBeInTheDocument();
  });

  it("shows warning message when deactivating an Admin user", async () => {
    renderComponent(mockAdminUser);

    expect(
      screen.getByText(/You are about to deactivate an administrator account/),
    ).toBeInTheDocument();
  });

  it("does NOT show admin warning for Standard Users", async () => {
    renderComponent(mockUser);

    expect(screen.queryByText(/administrator account/)).not.toBeInTheDocument();
  });

  it("AC-6: successfully deactivates user when confirmed", async () => {
    renderComponent();
    const user = userEvent.setup();

    const confirmButton = screen.getByTestId("btn-deactivate-user-confirm");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'User "alice" has been deactivated. All active sessions have been terminated.',
        "success",
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("NFR-15: closes dialog without action when Cancel is clicked", async () => {
    renderComponent();
    const user = userEvent.setup();

    const cancelButton = screen.getByTestId("btn-deactivate-user-cancel");
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("closes dialog when backdrop is clicked", async () => {
    renderComponent();
    const user = userEvent.setup();

    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("NFR-19: closes dialog when Escape key is pressed", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.keyboard("{Escape}");

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("NFR-19: activates focus trap when dialog opens", async () => {
    renderComponent();

    expect(mockUseFocusTrap).toHaveBeenCalled();
  });

  it("AC-10: shows error toast when attempting to deactivate last admin", async () => {
    const lastAdmin = {
      ...mockAdminUser,
      id: "last-admin-id",
      username: "lastadmin",
    };

    renderComponent(lastAdmin);
    const user = userEvent.setup();

    const confirmButton = screen.getByTestId("btn-deactivate-user-confirm");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        "Cannot deactivate the last active administrator.",
        "error",
      );
    });

    // Dialog should remain open after error
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("disables buttons while deactivation is pending", async () => {
    server.use(
      http.put("/api/users/:userId/deactivate", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          success: true,
          data: {
            id: "user-1",
            username: "alice",
            role: "StandardUser",
            isActive: false,
            createdAt: "2026-01-15T10:00:00Z",
          },
        });
      }),
    );

    renderComponent();
    const user = userEvent.setup();

    const confirmButton = screen.getByTestId("btn-deactivate-user-confirm");
    await user.click(confirmButton);

    // Buttons should be disabled during mutation
    expect(confirmButton).toBeDisabled();
    expect(screen.getByTestId("btn-deactivate-user-cancel")).toBeDisabled();
  });

  it("shows destructive styling on confirm button", async () => {
    renderComponent();

    const confirmButton = screen.getByTestId("btn-deactivate-user-confirm");
    expect(confirmButton).toHaveClass("destructive");
  });

  it("lists deactivation consequences in dialog body", async () => {
    renderComponent();

    // Check for consequence list
    expect(screen.getByText(/This action will:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Immediately invalidate all active JWT tokens/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Prevent future login attempts/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Set account status to "Deactivated"/),
    ).toBeInTheDocument();
  });
});
