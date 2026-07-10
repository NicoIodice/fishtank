/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { AuditLogSection } from "@/features/admin/components/AuditLogSection";
import * as useAuditLogModule from "@/features/admin/hooks/useAuditLog";
import type { AuditEntryDto } from "@/features/admin/types";

/**
 * Unit tests for AuditLogSection — Story 5.3
 *
 * Coverage:
 * - Renders loading state
 * - Renders empty state when no entries
 * - Renders audit log table with data-testid
 * - Displays action, actor, resource, timestamp
 * - Handles system actor (null) display
 * - Formats timestamps
 * - Formats resource display
 * - Handles load more button
 * - Shows total entries count
 */

vi.mock("@/features/admin/hooks/useAuditLog");

describe("AuditLogSection component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Arrange
    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: [],
      isLoading: true,
      loadMore: vi.fn(),
      hasMore: false,
      total: 0,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByTestId("section-audit-log")).toBeInTheDocument();
    expect(screen.getByText("Loading audit log…")).toBeInTheDocument();
  });

  it("renders empty state when no entries exist", () => {
    // Arrange
    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: [],
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 0,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByTestId("section-audit-log")).toBeInTheDocument();
    expect(screen.getByText("No audit entries yet.")).toBeInTheDocument();
    expect(screen.queryByTestId("table-audit-log")).not.toBeInTheDocument();
  });

  it("renders audit log table with data-testid when entries exist", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByTestId("section-audit-log")).toBeInTheDocument();
    expect(screen.getByTestId("table-audit-log")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-entry-1")).toBeInTheDocument();
  });

  it("displays action, actor, resource, and timestamp columns", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    const row = screen.getByTestId("audit-row-entry-1");
    expect(row).toHaveTextContent("USER_CREATED");
    expect(row).toHaveTextContent("admin");
    expect(row).toHaveTextContent("User: user-123");
  });

  it("handles system actor (null username) with em styling", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "SYSTEM_STARTUP",
        actorUsername: null,
        resourceType: "System",
        resourceId: null,
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    const row = screen.getByTestId("audit-row-entry-1");
    expect(row).toHaveTextContent("system");
    const systemEm = row.querySelector("em");
    expect(systemEm).toBeInTheDocument();
  });

  it("formats resource display with resourceType and resourceId", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "TOGGLE_CHANGED",
        actorUsername: "admin",
        resourceType: "Toggle",
        resourceId: "network_activity",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    const row = screen.getByTestId("audit-row-entry-1");
    expect(row).toHaveTextContent("Toggle: network_activity");
  });

  it("formats resource display with only resourceType when resourceId is null", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "SYSTEM_STARTUP",
        actorUsername: null,
        resourceType: "System",
        resourceId: null,
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    const row = screen.getByTestId("audit-row-entry-1");
    expect(row).toHaveTextContent("System");
    expect(row).not.toHaveTextContent("System:");
  });

  it("formats timestamps in locale string format", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    const row = screen.getByTestId("audit-row-entry-1");
    // Should display formatted timestamp (exact format depends on locale)
    expect(row).toHaveTextContent(/2026/); // Year should be present
  });

  it("shows load more button when hasMore is true", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: true,
      total: 50,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByTestId("btn-audit-load-more")).toBeInTheDocument();
  });

  it("hides load more button when hasMore is false", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 1,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.queryByTestId("btn-audit-load-more")).not.toBeInTheDocument();
  });

  it("calls loadMore when load more button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const mockLoadMore = vi.fn();
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: mockLoadMore,
      hasMore: true,
      total: 50,
    } as any);

    // Act
    render(<AuditLogSection />);
    const loadMoreBtn = screen.getByTestId("btn-audit-load-more");
    await user.click(loadMoreBtn);

    // Assert
    await waitFor(() => {
      expect(mockLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  it("shows total entries count", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: true,
      total: 42,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByText("42 total entries")).toBeInTheDocument();
  });

  it("renders multiple audit entries in table", () => {
    // Arrange
    const mockEntries: AuditEntryDto[] = [
      {
        id: "entry-1",
        action: "USER_CREATED",
        actorUsername: "admin",
        resourceType: "User",
        resourceId: "user-123",
        createdAt: "2026-07-10T10:00:00Z",
      },
      {
        id: "entry-2",
        action: "TOGGLE_CHANGED",
        actorUsername: "admin",
        resourceType: "Toggle",
        resourceId: "network_activity",
        createdAt: "2026-07-10T10:05:00Z",
      },
      {
        id: "entry-3",
        action: "USER_DEACTIVATED",
        actorUsername: "superadmin",
        resourceType: "User",
        resourceId: "user-456",
        createdAt: "2026-07-10T10:10:00Z",
      },
    ];

    vi.spyOn(useAuditLogModule, "useAuditLog").mockReturnValue({
      items: mockEntries,
      isLoading: false,
      loadMore: vi.fn(),
      hasMore: false,
      total: 3,
    } as any);

    // Act
    render(<AuditLogSection />);

    // Assert
    expect(screen.getByTestId("audit-row-entry-1")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-entry-2")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-entry-3")).toBeInTheDocument();
    expect(screen.getByText("3 total entries")).toBeInTheDocument();
  });
});
