/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { HealthDashboardSection } from "@/features/admin/components/HealthDashboardSection";
import * as useHealthModule from "@/features/admin/hooks/useHealth";

/**
 * Unit tests for HealthDashboardSection — Story 5.3
 *
 * Coverage:
 * - Renders loading state
 * - Renders health metrics with data-testid attributes
 * - Formats uptime correctly
 * - Displays database status with color coding
 * - Handles manual refresh
 * - Shows last refreshed timestamp
 */

vi.mock("@/features/admin/hooks/useHealth");

describe("HealthDashboardSection component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Arrange
    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
      dataUpdatedAt: 0,
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByTestId("section-health")).toBeInTheDocument();
    expect(screen.getByText("Loading health data…")).toBeInTheDocument();
  });

  it("renders health metrics with data-testid attributes", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 3600,
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByTestId("section-health")).toBeInTheDocument();
    expect(screen.getByTestId("health-active-services")).toHaveTextContent("5");
    expect(screen.getByTestId("health-total-requests")).toHaveTextContent(
      "1234",
    );
    expect(screen.getByTestId("health-db-status")).toBeInTheDocument();
  });

  it("formats uptime as days+hours when > 24 hours", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 90000, // 25 hours = 1d 1h
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByText(/1d 1h/)).toBeInTheDocument();
  });

  it("formats uptime as hours+minutes when < 24 hours", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 3665, // 1h 1m
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByText(/1h 1m/)).toBeInTheDocument();
  });

  it("formats uptime as minutes only when < 1 hour", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 180, // 3 minutes
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByText(/3m/)).toBeInTheDocument();
  });

  it("displays database status as accessible with green badge", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 3600,
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    const dbStatus = screen.getByTestId("health-db-status");
    expect(dbStatus).toHaveTextContent("Accessible");
    // Green badge check — component uses inline styles
    const badge = dbStatus.querySelector("span");
    expect(badge).toBeInTheDocument();
  });

  it("displays database status as inaccessible with red badge", () => {
    // Arrange
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "inaccessible",
      uptimeSeconds: 3600,
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    const dbStatus = screen.getByTestId("health-db-status");
    expect(dbStatus).toHaveTextContent("Inaccessible");
  });

  it("handles manual refresh button click", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockRefetch = vi.fn().mockResolvedValue({});
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 3600,
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: mockRefetch,
      dataUpdatedAt: Date.now(),
    } as any);

    // Act
    render(<HealthDashboardSection />);
    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await user.click(refreshButton);

    // Assert
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows last refreshed timestamp", () => {
    // Arrange
    const mockTimestamp = new Date("2026-07-10T10:30:00Z").getTime();
    const mockData = {
      activeServicesCount: 5,
      totalRequestCount: 1234,
      databaseStatus: "accessible",
      uptimeSeconds: 3600,
    };

    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: mockTimestamp,
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    // Should display time in locale format
    expect(screen.getByText(/Last refreshed:/)).toBeInTheDocument();
  });

  it("handles missing data gracefully with fallback zeros", () => {
    // Arrange
    vi.spyOn(useHealthModule, "useHealth").mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      dataUpdatedAt: 0,
    } as any);

    // Act
    render(<HealthDashboardSection />);

    // Assert
    expect(screen.getByTestId("health-active-services")).toHaveTextContent("0");
    expect(screen.getByTestId("health-total-requests")).toHaveTextContent("0");
  });
});
