import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { SignOutConfirmDialog } from "@/components/dialogs/SignOutConfirmDialog";

/**
 * ATDD component tests for SignOutConfirmDialog — Story 4.6
 *
 * RED PHASE scaffolds covering:
 *   AC-4  — Dialog title "Sign out?" with dynamic body text
 *   AC-10 — "Cancel" keeps user signed in
 *   AC-11 — "Sign out" proceeds with sign-out
 *   AC-13 — data-testid attributes
 *
 * These tests verify the reusable sign-out confirmation dialog renders with
 * correct title, body text, actions, and keyboard handling.
 */

describe("SignOutConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    message: "You have unsaved changes in the Mappings editor. Sign out now? Unsaved changes will be lost.",
    onConfirm: vi.fn(),
  };

  it("renders with correct title and body text", () => {
    // AC-4: Dialog title "Sign out?" with custom message
    // EXPECTED: Title = "Sign out?", body contains message prop
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    render(<SignOutConfirmDialog {...defaultProps} />);

    expect(screen.getByRole("heading", { name: /sign out\?/i })).toBeInTheDocument();
    expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
  });

  it("renders Cancel and Sign out buttons with correct data-testid", () => {
    // AC-13: data-testid attributes for dialog actions
    // EXPECTED: dialog-signout-cancel, dialog-signout-confirm-btn
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    render(<SignOutConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-signout-cancel")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-signout-confirm-btn")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-signout-confirm-btn")).toHaveTextContent("Sign out");
  });

  it("renders with dialog container data-testid", () => {
    // AC-13: Dialog container data-testid
    // EXPECTED: dialog-signout-confirm on dialog content
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    render(<SignOutConfirmDialog {...defaultProps} />);

    expect(screen.getByTestId("dialog-signout-confirm")).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    // AC-10: Cancel keeps user signed in (closes dialog without confirming)
    // EXPECTED: onOpenChange(false) called, onConfirm NOT called
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <SignOutConfirmDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByTestId("dialog-signout-cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when Sign out button is clicked", async () => {
    // AC-11: Sign out proceeds with logout
    // EXPECTED: onConfirm called
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(<SignOutConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByTestId("dialog-signout-confirm-btn"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes dialog on Escape key press", async () => {
    // AC-10: Keyboard accessibility — Escape cancels
    // EXPECTED: onOpenChange(false) called
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<SignOutConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when open=false", () => {
    // Conditional rendering: dialog should not be in DOM when closed
    // EXPECTED: Dialog content not in DOM
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    render(<SignOutConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId("dialog-signout-confirm")).not.toBeInTheDocument();
  });

  it("renders custom message variations correctly", () => {
    // AC-4, AC-5, AC-6, AC-8: Multiple message formats supported
    // EXPECTED: Message prop is rendered verbatim
    // ACTUAL: Component does not exist yet — this test will FAIL (RED)
    const messages = [
      "You have an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost.",
      "You have unsaved form data. Sign out now? Unsaved changes will be lost.",
      "You have unsaved changes in the Mappings editor and an unsaved Mocks Root path. Sign out now? Unsaved changes will be lost.",
    ];

    messages.forEach((message) => {
      const { unmount } = render(
        <SignOutConfirmDialog {...defaultProps} message={message} />
      );
      expect(screen.getByText(message)).toBeInTheDocument();
      unmount();
    });
  });

  it("Sign out button has destructive styling class", () => {
    // UX requirement: Sign out action is destructive (red/error styling)
    // EXPECTED: Button has class indicating destructive action
    // CSS modules hash class names, so check for the actual CSS module class
    render(<SignOutConfirmDialog {...defaultProps} />);

    const signOutButton = screen.getByTestId("dialog-signout-confirm-btn");
    // Check that it has the confirmBtn class from the CSS module
    expect(signOutButton.className).toContain("confirmBtn");
  });

  it("closes dialog when clicking backdrop", async () => {
    // Backdrop click should close dialog (accessibility pattern)
    // EXPECTED: onOpenChange(false) called when clicking outside modal content
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(<SignOutConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />);

    // Click the backdrop (parent div with role="presentation")
    const backdrop = screen.getByRole("presentation");
    await user.click(backdrop);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("moves focus into the dialog when opened (NFR-19 focus trap)", () => {
    // NFR-19: Focus must be trapped — first focusable element receives focus on open
    render(<SignOutConfirmDialog {...defaultProps} />);

    // The Cancel button is the first focusable element
    const cancelBtn = screen.getByTestId("dialog-signout-cancel");
    expect(document.activeElement).toBe(cancelBtn);
  });

  it("traps Tab key within dialog — wraps from last to first button (NFR-19)", async () => {
    // NFR-19: Tab from the last focusable element cycles back to the first
    const user = userEvent.setup();
    render(<SignOutConfirmDialog {...defaultProps} />);

    const cancelBtn = screen.getByTestId("dialog-signout-cancel");
    const confirmBtn = screen.getByTestId("dialog-signout-confirm-btn");

    // Move focus to confirm (last) button
    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);

    // Tab forward from the last button → should cycle back to first (Cancel)
    await user.tab();
    expect(document.activeElement).toBe(cancelBtn);
  });

  it("traps Shift+Tab key within dialog — wraps from first to last button (NFR-19)", async () => {
    // NFR-19: Shift+Tab from the first focusable element cycles to the last
    const user = userEvent.setup();
    render(<SignOutConfirmDialog {...defaultProps} />);

    const cancelBtn = screen.getByTestId("dialog-signout-cancel");
    const confirmBtn = screen.getByTestId("dialog-signout-confirm-btn");

    // Focus is on Cancel (first) — Shift+Tab should wrap to Sign out (last)
    cancelBtn.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmBtn);
  });

  it("confirms sign-out on Enter when Sign out button is focused (NFR-19)", async () => {
    // NFR-19: Enter submits — pressing Enter on the focused confirm button calls onConfirm
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<SignOutConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmBtn = screen.getByTestId("dialog-signout-confirm-btn");
    confirmBtn.focus();
    await user.keyboard("{Enter}");

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
