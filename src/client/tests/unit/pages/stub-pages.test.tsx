import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
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
