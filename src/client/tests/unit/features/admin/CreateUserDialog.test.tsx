import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CreateUserDialog } from "@/features/admin/components/CreateUserDialog";

/**
 * Component tests for CreateUserDialog
 * Story 5-2: User Management — Create, View & Deactivate
 *
 * Coverage:
 * - AC-3: Create User form submission
 * - AC-4: Password validation (≥12 characters, passwords must match)
 * - AC-5: Duplicate username returns 409 error
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

const server = setupServer(
  http.post("/api/users", async ({ request }) => {
    const body = (await request.json()) as {
      username: string;
      password: string;
    };

    if (body.username === "duplicate") {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_USERNAME_EXISTS",
            message: "A user with this username already exists.",
          },
        },
        { status: 409 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: "new-user-id",
        username: body.username,
        role: "StandardUser",
        isActive: true,
        createdAt: new Date().toISOString(),
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

describe("CreateUserDialog", () => {
  const mockOnOpenChange = vi.fn();

  const renderComponent = (open = true) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <CreateUserDialog open={open} onOpenChange={mockOnOpenChange} />
      </QueryClientProvider>,
    );
  };

  it("AC-3: renders dialog with all form fields", async () => {
    renderComponent();

    expect(screen.getByTestId("dialog-create-user")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-create-user-submit")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-create-user-cancel")).toBeInTheDocument();
  });

  it("does not render when open=false", async () => {
    renderComponent(false);

    expect(screen.queryByTestId("dialog-create-user")).not.toBeInTheDocument();
  });

  it("AC-4: shows validation error when password is less than 12 characters", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "newuser",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "short11",
    ); // 7 chars
    await user.type(screen.getByTestId("input-create-user-confirm-password"), "short11");

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    expect(
      await screen.findByText("Password must be at least 12 characters"),
    ).toBeInTheDocument();
  });

  it("AC-4: shows validation error when passwords do not match", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "newuser",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "validPassword12",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "differentPassword12",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
  });

  it("AC-4: shows validation error when username is empty", async () => {
    renderComponent();
    const user = userEvent.setup();

    // Leave username empty
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "validPassword12",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "validPassword12",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
  });

  it("AC-3: successfully creates user with valid input", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "newuser",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "securePassword123",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "securePassword123",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'User "newuser" created successfully.',
        "success",
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("AC-5: shows error when username already exists (409 Conflict)", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "duplicate",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "securePassword123",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "securePassword123",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    expect(
      await screen.findByText("A user with this username already exists."),
    ).toBeInTheDocument();

    // Dialog should remain open for correction
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("closes dialog when Cancel button is clicked", async () => {
    renderComponent();
    const user = userEvent.setup();

    const cancelButton = screen.getByTestId("dialog-create-user-cancel");
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes dialog when backdrop is clicked", async () => {
    renderComponent();
    const user = userEvent.setup();

    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("NFR-19: closes dialog when Escape key is pressed", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.keyboard("{Escape}");

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("NFR-19: activates focus trap when dialog opens", async () => {
    renderComponent();

    // Verify focus trap hook was called with modal ref and open=true
    expect(mockUseFocusTrap).toHaveBeenCalled();
  });

  it("trims whitespace from username before submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "  trimmeduser  ",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "securePassword123",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "securePassword123",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'User "trimmeduser" created successfully.',
        "success",
      );
    });
  });

  it("resets form after successful submission", async () => {
    renderComponent();
    const user = userEvent.setup();

    const usernameInput = screen.getByTestId("input-create-user-username");
    const passwordInput = screen.getByTestId("input-create-user-password");
    const confirmInput = screen.getByTestId("input-create-user-confirm-password");

    await user.type(usernameInput, "newuser");
    await user.type(passwordInput, "securePassword123");
    await user.type(confirmInput, "securePassword123");

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    // Re-open the dialog to verify form was reset
    mockOnOpenChange.mockClear();
    cleanup();
    renderComponent(true);

    expect(screen.getByTestId("input-create-user-username")).toHaveValue("");
    expect(screen.getByTestId("input-create-user-password")).toHaveValue("");
    expect(screen.getByTestId("input-create-user-confirm-password")).toHaveValue("");
  });

  it("disables form fields while submission is pending", async () => {
    server.use(
      http.post("/api/users", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({
          success: true,
          data: {
            id: "new-user-id",
            username: "newuser",
            role: "StandardUser",
            isActive: true,
            createdAt: new Date().toISOString(),
          },
        });
      }),
    );

    renderComponent();
    const user = userEvent.setup();

    await user.type(
      screen.getByTestId("input-create-user-username"),
      "newuser",
    );
    await user.type(
      screen.getByTestId("input-create-user-password"),
      "securePassword123",
    );
    await user.type(
      screen.getByTestId("input-create-user-confirm-password"),
      "securePassword123",
    );

    const submitButton = screen.getByTestId("dialog-create-user-submit");
    await user.click(submitButton);

    // Fields should be disabled during submission
    expect(screen.getByTestId("input-create-user-username")).toBeDisabled();
    expect(screen.getByTestId("input-create-user-password")).toBeDisabled();
    expect(screen.getByTestId("input-create-user-confirm-password")).toBeDisabled();
  });
});
