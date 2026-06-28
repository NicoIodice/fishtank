import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { AboutModal } from "@/components/modals/AboutModal";

describe("AboutModal", () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
  });

  it("renders the dialog with title", () => {
    render(<AboutModal onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /fishtank/i }),
    ).toBeInTheDocument();
  });

  it("calls onClose when the X button is clicked", async () => {
    const user = userEvent.setup();
    render(<AboutModal onClose={onClose} />);
    await user.click(
      screen.getByRole("button", { name: /close about modal/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape key is pressed on the backdrop", () => {
    render(<AboutModal onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("presentation"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop itself is clicked (not the modal)", () => {
    render(<AboutModal onClose={onClose} />);
    const presentation = screen.getByRole("presentation");
    // Simulate click directly on the backdrop (target === currentTarget)
    fireEvent.click(presentation, { target: presentation });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows 'Not configured' when no env build vars are set", () => {
    render(<AboutModal onClose={onClose} />);
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
  });
});

describe("AboutModal — with env vars set", () => {
  it("shows version, docker tag, build hash and links when env vars are defined", async () => {
    vi.stubEnv("VITE_FISHTANK_VERSION", "1.2.3");
    vi.stubEnv("VITE_FISHTANK_DOCKER_TAG", "fishtank:1.2.3");
    vi.stubEnv("VITE_FISHTANK_BUILD_HASH", "abc123");
    vi.stubEnv("VITE_FISHTANK_DOCS_URL", "https://docs.example.com");
    vi.stubEnv("VITE_FISHTANK_CHANGELOG_URL", "https://changelog.example.com");

    // Reset modules so the module-level constants pick up the new env values
    vi.resetModules();
    const { AboutModal: Modal } =
      await import("@/components/modals/AboutModal");

    render(<Modal onClose={vi.fn()} />);

    expect(screen.queryByText("1.2.3")).toBeTruthy();
    expect(screen.queryByText("fishtank:1.2.3")).toBeTruthy();
    expect(screen.queryByText("abc123")).toBeTruthy();
    expect(screen.queryByText("https://docs.example.com")).toBeTruthy();
    expect(screen.queryByText("https://changelog.example.com")).toBeTruthy();

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
