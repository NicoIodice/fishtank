import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SetupPage } from "@/features/auth/pages/SetupPage";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage";

// ─── Mock auth hooks ──────────────────────────────────────────────────────────

const mockLoginMutateAsync = vi.fn();
const mockSetupMutateAsync = vi.fn();
const mockChangePasswordMutateAsync = vi.fn();

const mockUseLogin = vi.fn(() => ({
  mutateAsync: mockLoginMutateAsync,
  isPending: false,
}));

const mockUseSetup = vi.fn(() => ({
  mutateAsync: mockSetupMutateAsync,
  isPending: false,
}));

vi.mock("@/features/auth/hooks/useLogin", () => ({
  useLogin: () => mockUseLogin(),
}));
vi.mock("@/features/auth/hooks/useSetup", () => ({
  useSetup: () => mockUseSetup(),
}));
vi.mock("@/features/auth/hooks/useChangePassword", () => ({
  useChangePassword: vi.fn(() => ({
    mutateAsync: mockChangePasswordMutateAsync,
    isPending: false,
  })),
}));

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrap(element: ReactNode, initialPath = "/") {
  return <MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── LoginPage ────────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  it("renders the login form", () => {
    render(wrap(<LoginPage />));
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls login mutation with entered credentials on submit", async () => {
    mockLoginMutateAsync.mockResolvedValue({});
    const user = userEvent.setup();

    render(wrap(<LoginPage />));

    await user.type(screen.getByTestId("login-username-input"), "admin");
    await user.type(screen.getByTestId("login-password-input"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        username: "admin",
        password: "password123",
      });
    });
  });

  it("shows an error message when login fails with ApiError", async () => {
    const { ApiError } = await import("@/lib/api");
    mockLoginMutateAsync.mockRejectedValue(
      new ApiError("AUTH_INVALID", "Bad credentials"),
    );
    const user = userEvent.setup();

    render(wrap(<LoginPage />));
    await user.type(screen.getByTestId("login-username-input"), "admin");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Bad credentials")).toBeInTheDocument();
    });
  });

  it("shows generic error when login fails with unknown error", async () => {
    mockLoginMutateAsync.mockRejectedValue(new Error("Network failure"));
    const user = userEvent.setup();

    render(wrap(<LoginPage />));
    await user.type(screen.getByTestId("login-username-input"), "admin");
    await user.type(screen.getByTestId("login-password-input"), "wrong");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  it("clears password field after a failed login", async () => {
    mockLoginMutateAsync.mockRejectedValue(new Error("Network failure"));
    const user = userEvent.setup();

    render(wrap(<LoginPage />));
    await user.type(screen.getByTestId("login-password-input"), "password123");
    await user.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(
        (screen.getByTestId("login-password-input") as HTMLInputElement).value,
      ).toBe("");
    });
  });

  it("shows 'Signing in…' text when isPending is true", () => {
    mockUseLogin.mockReturnValueOnce({
      mutateAsync: mockLoginMutateAsync,
      isPending: true,
    });
    render(wrap(<LoginPage />));
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });
});

// ─── SetupPage ────────────────────────────────────────────────────────────────

describe("SetupPage", () => {
  it("renders the setup form", () => {
    render(wrap(<SetupPage />));
    expect(screen.getByTestId("setup-page")).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("shows validation error when password is too short", async () => {
    const user = userEvent.setup();
    render(wrap(<SetupPage />));

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByTestId("setup-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });
    expect(mockSetupMutateAsync).not.toHaveBeenCalled();
  });

  it("calls setup mutation with valid credentials", async () => {
    mockSetupMutateAsync.mockResolvedValue({});
    const user = userEvent.setup();

    render(wrap(<SetupPage />));
    await user.type(screen.getByTestId("setup-username-input"), "admin");
    await user.type(
      screen.getByTestId("setup-password-input"),
      "SuperSecure123!",
    );
    await user.click(screen.getByTestId("setup-submit-button"));

    await waitFor(() => {
      expect(mockSetupMutateAsync).toHaveBeenCalledWith({
        username: "admin",
        password: "SuperSecure123!",
      });
    });
  });

  it("shows error on setup mutation failure", async () => {
    const { ApiError } = await import("@/lib/api");
    mockSetupMutateAsync.mockRejectedValue(
      new ApiError("SETUP_ERROR", "Setup failed"),
    );
    const user = userEvent.setup();

    render(wrap(<SetupPage />));
    await user.type(screen.getByTestId("setup-username-input"), "admin");
    await user.type(
      screen.getByTestId("setup-password-input"),
      "SuperSecure123!",
    );
    await user.click(screen.getByTestId("setup-submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Setup failed")).toBeInTheDocument();
    });
  });

  it("shows generic fallback error when setup throws non-ApiError", async () => {
    mockSetupMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(wrap(<SetupPage />));
    await user.type(screen.getByTestId("setup-username-input"), "admin");
    await user.type(
      screen.getByTestId("setup-password-input"),
      "SuperSecure123!",
    );
    await user.click(screen.getByTestId("setup-submit-button"));

    await waitFor(() => {
      expect(
        screen.getByText(/unexpected error occurred/i),
      ).toBeInTheDocument();
    });
  });

  it("shows 'Creating account…' text when isPending is true", () => {
    mockUseSetup.mockReturnValueOnce({
      mutateAsync: mockSetupMutateAsync,
      isPending: true,
    });
    render(wrap(<SetupPage />));
    expect(screen.getByText(/creating account/i)).toBeInTheDocument();
  });
});

// ─── ChangePasswordPage ───────────────────────────────────────────────────────

describe("ChangePasswordPage", () => {
  it("renders the change password form", () => {
    render(wrap(<ChangePasswordPage />));
    expect(screen.getByTestId("change-password-page")).toBeInTheDocument();
    expect(
      screen.getByTestId("change-password-current-input"),
    ).toBeInTheDocument();
  });

  it("shows validation error when new password is too short", async () => {
    const user = userEvent.setup();
    render(wrap(<ChangePasswordPage />));

    await user.type(
      screen.getByTestId("change-password-current-input"),
      "OldPassword1!",
    );
    await user.type(screen.getByLabelText(/new password/i), "short");
    await user.click(screen.getByTestId("change-password-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    });
    expect(mockChangePasswordMutateAsync).not.toHaveBeenCalled();
  });

  it("calls changePassword mutation with valid passwords", async () => {
    mockChangePasswordMutateAsync.mockResolvedValue(null);
    const user = userEvent.setup();

    render(wrap(<ChangePasswordPage />));
    await user.type(
      screen.getByTestId("change-password-current-input"),
      "OldPassword1!",
    );
    await user.type(
      screen.getByTestId("change-password-new-input"),
      "NewSuperPassword1!",
    );
    await user.click(screen.getByTestId("change-password-submit-button"));

    await waitFor(() => {
      expect(mockChangePasswordMutateAsync).toHaveBeenCalledWith({
        currentPassword: "OldPassword1!",
        newPassword: "NewSuperPassword1!",
      });
    });
  });

  it("shows error message on change password failure", async () => {
    mockChangePasswordMutateAsync.mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();

    render(wrap(<ChangePasswordPage />));
    await user.type(
      screen.getByTestId("change-password-current-input"),
      "OldPassword1!",
    );
    await user.type(
      screen.getByTestId("change-password-new-input"),
      "NewSuperPassword1!",
    );
    await user.click(screen.getByTestId("change-password-submit-button"));

    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  it("shows ApiError message on change password ApiError failure", async () => {
    const { ApiError } = await import("@/lib/api");
    mockChangePasswordMutateAsync.mockRejectedValue(
      new ApiError("WRONG_PASSWORD", "Current password is incorrect"),
    );
    const user = userEvent.setup();

    render(wrap(<ChangePasswordPage />));
    await user.type(
      screen.getByTestId("change-password-current-input"),
      "OldPassword1!",
    );
    await user.type(
      screen.getByTestId("change-password-new-input"),
      "NewSuperPassword1!",
    );
    await user.click(screen.getByTestId("change-password-submit-button"));

    await waitFor(() => {
      expect(
        screen.getByText("Current password is incorrect"),
      ).toBeInTheDocument();
    });
  });
});
