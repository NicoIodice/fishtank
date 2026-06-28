import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminPage } from "@/features/admin/pages/AdminPage";
import { MappingsPage } from "@/features/mappings/pages/MappingsPage";

describe("AdminPage", () => {
  it("renders the administration page shell", () => {
    render(<AdminPage />);
    expect(screen.getByTestId("page-admin")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /administration/i }),
    ).toBeInTheDocument();
  });
});

describe("MappingsPage", () => {
  it("renders the mappings page shell", () => {
    render(<MappingsPage />);
    expect(screen.getByTestId("page-mappings")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /mappings/i }),
    ).toBeInTheDocument();
  });
});
