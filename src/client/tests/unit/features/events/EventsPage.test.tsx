import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EventsPage } from "@/features/events/pages/EventsPage";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMarkAllReadMutate = vi.fn();
const mockClearAllMutate = vi.fn();

// Default empty page response
function emptyPage() {
  return {
    data: {
      pages: [{ items: [], total: 0, hasMore: false }],
      pageParams: [0],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  };
}

// Default: all empty, no loading
const mockUseSystemEvents = vi.fn(() => emptyPage());
const mockUseUnreadCount = vi.fn(() => ({ data: 0, isLoading: false }));

vi.mock("@/features/events/hooks/useSystemEvents", () => ({
  useSystemEvents: (...args: Parameters<typeof mockUseSystemEvents>) =>
    mockUseSystemEvents(...args),
  useMarkAllRead: vi.fn(() => ({
    mutate: mockMarkAllReadMutate,
    isPending: false,
  })),
  useClearAll: vi.fn(() => ({ mutate: mockClearAllMutate, isPending: false })),
  useUnreadCount: vi.fn(() => mockUseUnreadCount()),
}));

// ─── Wrapper / helpers ────────────────────────────────────────────────────────

function wrap(path = "/events") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSystemEvents.mockReturnValue(emptyPage());
  mockUseUnreadCount.mockReturnValue({ data: 0, isLoading: false });
});

// ─── EventsPage ───────────────────────────────────────────────────────────────

describe("EventsPage", () => {
  it("renders the page title and tabs", () => {
    render(<EventsPage />, { wrapper: wrap() });

    expect(screen.getByTestId("page-events")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /system events/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("events-tab-warnings")).toBeInTheDocument();
    expect(screen.getByTestId("events-tab-info")).toBeInTheDocument();
  });

  it("shows loading state while fetching", () => {
    mockUseSystemEvents.mockReturnValue({
      ...emptyPage(),
      data: undefined as unknown as ReturnType<typeof emptyPage>["data"],
      isLoading: true,
    });

    render(<EventsPage />, { wrapper: wrap() });
    expect(screen.getByTestId("events-loading")).toBeInTheDocument();
  });

  it("shows empty state when there are no events", () => {
    render(<EventsPage />, { wrapper: wrap() });
    expect(screen.getByTestId("events-empty")).toBeInTheDocument();
  });

  it("shows the Mark all read button when there are unread warnings", () => {
    mockUseUnreadCount.mockReturnValue({ data: 3, isLoading: false });
    render(<EventsPage />, { wrapper: wrap() });
    expect(screen.getByTestId("events-btn-mark-all-read")).toBeInTheDocument();
  });

  it("does not show Mark all read button on the info tab", async () => {
    mockUseUnreadCount.mockReturnValue({ data: 5, isLoading: false });
    const user = userEvent.setup();

    render(<EventsPage />, { wrapper: wrap("/events?tab=warnings-errors") });
    await user.click(screen.getByTestId("events-tab-info"));

    expect(
      screen.queryByTestId("events-btn-mark-all-read"),
    ).not.toBeInTheDocument();
  });

  it("calls markAllRead.mutate when Mark all read is clicked", async () => {
    mockUseUnreadCount.mockReturnValue({ data: 2, isLoading: false });
    const user = userEvent.setup();

    render(<EventsPage />, { wrapper: wrap() });
    await user.click(screen.getByTestId("events-btn-mark-all-read"));

    expect(mockMarkAllReadMutate).toHaveBeenCalled();
  });

  it("shows a confirm dialog when Clear all is clicked", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap() });

    await user.click(screen.getByTestId("events-btn-clear-all-warnings"));
    expect(
      screen.getByTestId("events-modal-clear-all-warnings-confirm"),
    ).toBeInTheDocument();
  });

  it("calls clearAll.mutate when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap() });

    await user.click(screen.getByTestId("events-btn-clear-all-warnings"));
    await user.click(
      screen.getByTestId("events-btn-clear-all-warnings-confirm"),
    );

    expect(mockClearAllMutate).toHaveBeenCalledWith("warnings-errors");
  });

  it("dismisses the confirm dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap() });

    await user.click(screen.getByTestId("events-btn-clear-all-warnings"));
    expect(
      screen.getByTestId("events-modal-clear-all-warnings-confirm"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByTestId("events-modal-clear-all-warnings-confirm"),
    ).not.toBeInTheDocument();
  });

  it("switches to the info tab when the tab button is clicked", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap() });

    await user.click(screen.getByTestId("events-tab-info"));

    // The clear-all button for info should now be visible
    expect(screen.getByTestId("events-btn-clear-all-info")).toBeInTheDocument();
  });

  it("shows load more button when hasNextPage is true", () => {
    mockUseSystemEvents.mockReturnValue({
      ...emptyPage(),
      data: {
        pages: [
          {
            items: [{ id: "ev-1", severity: "warning" as const, message: "test", serviceId: null, serviceName: null, createdAt: "2025-01-01T00:00:00Z", isRead: false }],
            total: 10,
            hasMore: true,
          },
        ],
        pageParams: [0],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      isLoading: false,
    });

    render(<EventsPage />, { wrapper: wrap() });
    expect(screen.getByTestId("events-btn-load-more")).toBeInTheDocument();
    expect(screen.getByTestId("events-btn-load-more")).not.toBeDisabled();
  });

  it("shows 'Loading…' on load more button when isFetchingNextPage", () => {
    mockUseSystemEvents.mockReturnValue({
      ...emptyPage(),
      data: {
        pages: [
          {
            items: [{ id: "ev-1", severity: "warning" as const, message: "test", serviceId: null, serviceName: null, createdAt: "2025-01-01T00:00:00Z", isRead: false }],
            total: 10,
            hasMore: true,
          },
        ],
        pageParams: [0],
      },
      hasNextPage: true,
      isFetchingNextPage: true,
      isLoading: false,
    });

    render(<EventsPage />, { wrapper: wrap() });
    expect(screen.getByTestId("events-btn-load-more")).toHaveTextContent(
      "Loading…",
    );
  });

  it("shows clear confirmation for info tab events", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap("/events?tab=info") });

    await user.click(screen.getByTestId("events-btn-clear-all-info"));
    expect(
      screen.getByTestId("events-modal-clear-all-info-confirm"),
    ).toBeInTheDocument();
  });

  it("calls clearAll.mutate with 'info' when info clear is confirmed", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap("/events?tab=info") });

    await user.click(screen.getByTestId("events-btn-clear-all-info"));
    await user.click(screen.getByTestId("events-btn-clear-all-info-confirm"));

    expect(mockClearAllMutate).toHaveBeenCalledWith("info");
  });

  it("dismisses info clear dialog when backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<EventsPage />, { wrapper: wrap("/events?tab=info") });

    await user.click(screen.getByTestId("events-btn-clear-all-info"));
    expect(
      screen.getByTestId("events-modal-clear-all-info-confirm"),
    ).toBeInTheDocument();

    // Click the backdrop (the outer div)
    await user.click(screen.getByRole("dialog").parentElement!);
    expect(
      screen.queryByTestId("events-modal-clear-all-info-confirm"),
    ).not.toBeInTheDocument();
  });
});
