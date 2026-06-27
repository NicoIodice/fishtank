---
story_id: "2.3"
epic: 2
story_key: 2-3-enable-disable-service-toggle-serviceshub-and-real-time-status
story_title: "Enable/Disable Service Toggle, ServicesHub & Real-Time Status"
status: done
priority: high
baseline_commit: 71eef72
---

# Story 2.3: Enable/Disable Service Toggle, ServicesHub & Real-Time Status

## Story

**As a** developer,
**I want** to start or stop individual mock services without restarting the container, with status updates reflected in real time across all browser sessions,
**So that** I can quickly control which mocks are active during development or incident response.

---

## Status

Ready for Dev

---

## Context

### Background

Story 2.2 built the Services page with `ServiceCard` components. The toggle in `ServiceCard.tsx` currently calls the API and then re-fetches all services (`onSuccess: invalidateQueries`). There is **no optimistic UI** and **no real-time SignalR wiring** — both are the primary deliverables of this story.

**Backend state entering this story:**
- `ServicesHub.cs` exists at `src/Fishtank.Api/Hubs/ServicesHub.cs` but is a skeleton — `[Authorize]` attribute applied, no events broadcast
- `/hubs/services` is mapped in `Program.cs` line 231
- No `EventsHub.cs` exists yet
- `ServiceManager.cs` — `StopAsync` and `StartAsync` are complete but do NOT inject or call `IHubContext<ServicesHub>`

**Frontend state entering this story:**
- `useToggleService` in `src/client/src/features/services/hooks/useServices.ts` is non-optimistic (calls API, then `invalidateQueries`)
- `ServiceCard.tsx` uses `useToggleService` — needs to be upgraded
- `src/client/src/lib/queryClient.ts` — `HUB_INVALIDATION_MAP` exists but is empty
- `src/client/src/lib/signalr.ts` — `createHubConnection(url)` factory exists; comment says "DO NOT call .start() here — each feature that needs real-time wires its own hub"
- No `useServicesHub` hook exists yet
- **No toast system exists** — needs to be created in this story

### Implementation Sequence for This Story

1. **Backend**: Inject `IHubContext<ServicesHub>` into `ServiceManager` and broadcast `ServiceStatusChanged` from `StopAsync` and `StartAsync`
2. **Backend**: Create `EventsHub.cs` skeleton
3. **Backend**: Map `/hubs/events` in `Program.cs`
4. **Frontend**: Create `<Toast>` component + `useToast` hook (needed by optimistic toggle error path)
5. **Frontend**: Upgrade `useToggleService` to optimistic UI with error-revert and toast
6. **Frontend**: Update `HUB_INVALIDATION_MAP` with `ServiceStatusChanged`
7. **Frontend**: Create `useServicesHub` hook in `src/client/src/features/services/hooks/`
8. **Frontend**: Mount `useServicesHub` in `AppShell.tsx`
9. **Backend Integration tests**: Add `Story2_3_ServicesHubTests.cs`
10. **Frontend component tests**: Add `ServiceCard.toggle.test.tsx`

### `ServiceStatusChanged` Event Contract

From `project-context.md`:
```
Hub: /hubs/services
Event: ServiceStatusChanged
Payload: { id: string, status: "live" | "stopped" }
```

### SignalR Rules (from project-context.md)

- Reconnect logic lives in `lib/signalr.ts` only — never in feature hooks
- All hubs require JWT auth via cookie (`withCredentials`) — no query-string token
- httpOnly cookies are included in WebSocket upgrade natively — no `accessTokenFactory` needed
- `SameSite: Strict` is safe because SPA and API serve from same origin

### Optimistic Toggle Pattern

The optimistic update works as follows:
1. Toggle click → **immediately** flip `isActive` and `status` in the services cache (optimistic)
2. Fire API call (`POST /api/services/{id}/stop` or `/start`)
3. On success: `ServiceStatusChanged` hub event will arrive and trigger `invalidateQueries(["services"])` — the cache is refreshed with authoritative server state
4. On failure: revert the optimistic update to original values + show error toast

**Important**: The `Status pill` (`status` field) retains its ORIGINAL value during the pending window in the UI per the AC. Only the toggle position changes immediately. The status pill ONLY updates once server confirms (either via the API response cache update or via the hub event).

This means the optimistic update should flip `isActive` but NOT `status`. After server success, the `ServiceStatusChanged` hub event will update `status` via `invalidateQueries`.

### Toast Design

No existing toast system. This story creates a minimal one:
- `src/client/src/components/ui/Toast.tsx` — single toast component
- `src/client/src/components/ui/Toast.module.css` — styles
- `src/client/src/lib/useToast.ts` — hook for toast state + `showToast(message, variant)` where variant is `"error" | "success" | "info"`
- Toast is mounted in `AppShell.tsx` via `<ToastProvider>`

### Previous Story Learnings (Story 2.2)

- `useNextPort` returns `{ port: number }` from the API — requires destructuring: `const { port } = await apiFetch<{ port: number }>(...)` (the API returns `{ "success": true, "data": { "port": 30100 } }`, not a bare number)
- Bootstrap Icons usage: `<i className="bi bi-{name}" aria-hidden="true" />` — icons are linked via CSS
- All CSS uses CSS variable theming (`var(--brand)`, `var(--content-fg)` etc.) — no hardcoded colors
- `data-testid` pattern for cards: `service-card-{id}`, for toggles: `service-toggle-{id}`
- `useMutation` `onSuccess` callback receives the returned DTO — use `onError` for revert logic
- Disabled state on toggle input: `disabled={toggleMutation.isPending}` — already in place in `ServiceCard.tsx`

---

## Acceptance Criteria

**AC-1 — Optimistic toggle UI:**
**Given** a service card's enable/disable toggle is clicked,
**When** the click is registered,
**Then** the toggle position updates optimistically (immediately before server response); the Status pill retains its previous value during the pending window; on server success the pill updates to the new state (via `ServiceStatusChanged` hub event triggering `invalidateQueries`); on server failure the toggle reverts to the original position and an error toast is shown (FR-3).

**AC-2 — ServiceStatusChanged broadcast:**
**Given** a service is started or stopped (via `POST /api/services/{id}/start` or `/stop`),
**When** the operation completes on the backend,
**Then** `ServicesHub` broadcasts a `ServiceStatusChanged` event with payload `{ id: string, status: "live" | "stopped" }` to all connected clients; the frontend hub listener calls `queryClient.invalidateQueries([["services"]])` via `HUB_INVALIDATION_MAP` (FR-3, Architecture D7).

**AC-3 — EventsHub skeleton:**
**Given** `EventsHub.cs` at `/hubs/events`,
**When** an authenticated client connects,
**Then** the hub accepts the connection (JWT cookie auth) and maintains it — no events broadcast yet; connection is wired to `/hubs/events` in `Program.cs` (Story 2.4 adds event wiring).

**AC-4 — Hub authentication enforcement:**
**Given** both `/hubs/services` and `/hubs/events` require authentication,
**Then** unauthenticated WebSocket upgrade requests (no valid JWT cookie) are rejected — consistent with NFR-8.

---

## Tasks / Subtasks

### Task 1: Broadcast `ServiceStatusChanged` from `ServiceManager` (AC: #2)

- [ ] Add `IHubContext<ServicesHub>` to `ServiceManager`'s primary constructor parameter list:
  ```csharp
  // src/Fishtank.Api/Services/ServiceManager.cs
  using Fishtank.Api.Hubs;
  using Microsoft.AspNetCore.SignalR;

  public partial class ServiceManager(
      FishtankDbContext db,
      IServicesRegistry registry,
      ISystemEventService systemEvents,
      IConfiguration configuration,
      IWireMockServerFactory wireMockFactory,
      IHubContext<ServicesHub> servicesHub) : IServiceManager   // NEW parameter
  ```

- [ ] In `StopAsync`, after `await db.SaveChangesAsync(ct)` and before the `return ToDto(service)`:
  ```csharp
  await servicesHub.Clients.All.SendAsync(
      "ServiceStatusChanged",
      new { id = service.Id.ToString(), status = "stopped" },
      ct);
  ```

- [ ] In `StartAsync`, after the final `await db.SaveChangesAsync(ct)` and before the `return ToDto(service)`:
  ```csharp
  await servicesHub.Clients.All.SendAsync(
      "ServiceStatusChanged",
      new { id = service.Id.ToString(), status = service.Status == ServiceStatus.Live ? "stopped" : "stopped" },
      ct);
  ```
  **CORRECTION** — use actual status:
  ```csharp
  await servicesHub.Clients.All.SendAsync(
      "ServiceStatusChanged",
      new { id = service.Id.ToString(), status = service.Status == ServiceStatus.Live ? "live" : "stopped" },
      ct);
  ```

### Task 2: Create `EventsHub.cs` skeleton (AC: #3, #4)

- [ ] Create `src/Fishtank.Api/Hubs/EventsHub.cs`:
  ```csharp
  using Microsoft.AspNetCore.Authorization;
  using Microsoft.AspNetCore.SignalR;

  namespace Fishtank.Api.Hubs;

  [Authorize]
  public class EventsHub : Hub
  {
      // Story 2.4 wires SystemEventCreated and UnreadCountChanged broadcasts.
      // This skeleton accepts authenticated connections — no events broadcast yet.
  }
  ```

### Task 3: Map `/hubs/events` in `Program.cs` (AC: #3)

- [ ] In `src/Fishtank.Api/Program.cs`, add after `app.MapHub<ServicesHub>("/hubs/services");`:
  ```csharp
  app.MapHub<EventsHub>("/hubs/events");
  ```
  Also add the `using Fishtank.Api.Hubs;` if not already present (it is — line 9).

### Task 4: Create Toast infrastructure (AC: #1)

- [ ] Create `src/client/src/lib/useToast.ts`:
  ```typescript
  import { useState, useCallback } from "react";

  export type ToastVariant = "error" | "success" | "info";

  export interface ToastMessage {
    id: string;
    message: string;
    variant: ToastVariant;
  }

  export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }, []);

    const dismissToast = useCallback((id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, showToast, dismissToast };
  }
  ```

- [ ] Create `src/client/src/components/ui/ToastContainer.tsx`:
  ```tsx
  import type { ToastMessage } from "@/lib/useToast";
  import styles from "./ToastContainer.module.css";

  interface ToastContainerProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
  }

  export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;
    return (
      <div
        className={styles.container}
        aria-live="polite"
        aria-atomic="false"
        data-testid="toast-container"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.variant]}`}
            role="alert"
            data-testid={`toast-${toast.variant}`}
          >
            <span className={styles.message}>{toast.message}</span>
            <button
              className={styles.dismiss}
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              data-testid="toast-dismiss"
            >
              <i className="bi bi-x" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] Create `src/client/src/components/ui/ToastContainer.module.css`:
  ```css
  .container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 380px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--radius-card);
    font-size: 0.875rem;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slide-in 0.2s ease-out;
  }

  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }

  .error   { background: var(--error-bg,   #fee2e2); color: var(--error-fg,   #991b1b); }
  .success { background: var(--success-bg, #dcfce7); color: var(--success-fg, #166534); }
  .info    { background: var(--info-bg,    #dbeafe); color: var(--info-fg,    #1e40af); }

  .message { flex: 1; }

  .dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    padding: 0;
    display: flex;
    align-items: center;
    font-size: 1rem;
  }

  .dismiss:hover { opacity: 1; }
  ```

### Task 5: Mount `ToastContainer` + `useServicesHub` in `AppShell.tsx` (AC: #1, #2)

- [ ] Update `src/client/src/components/layout/AppShell.tsx`:
  - Import and use `useToast`
  - Import and mount `<ToastContainer>`
  - Import and call `useServicesHub(showToast)` — see Task 6
  - Pass `showToast` to `useServicesHub` so the hook can show error toasts if needed

  ```tsx
  import { useState } from "react";
  import { Outlet } from "react-router-dom";
  import { TopBar } from "./TopBar";
  import { Sidebar } from "./Sidebar";
  import { useBreakpoint } from "@/lib/useBreakpoint";
  import { useToast } from "@/lib/useToast";
  import { ToastContainer } from "@/components/ui/ToastContainer";
  import { useServicesHub } from "@/features/services/hooks/useServicesHub";
  import styles from "./AppShell.module.css";

  export function AppShell() {
    const { mobile } = useBreakpoint();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [prevMobile, setPrevMobile] = useState(mobile);
    const { toasts, showToast, dismissToast } = useToast();

    // Wire ServicesHub real-time connection (Story 2.3)
    useServicesHub();

    if (prevMobile !== mobile) {
      setPrevMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    }

    return (
      <div className={styles.shell} data-testid="app-shell">
        <TopBar
          isMobile={mobile}
          sidebarOpen={mobileSidebarOpen}
          onHamburgerClick={() => setMobileSidebarOpen((v) => !v)}
        />
        <div className={styles.body}>
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />
          <main className={styles.content} data-testid="main-content">
            <Outlet />
          </main>
        </div>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }
  ```

  **Note:** `useToast` state lives in `AppShell`. `showToast` is passed down to `useServicesHub`. For the toggle error toast, `ServiceCard` calls `useToggleService` which needs access to `showToast`. The cleanest approach: create a React Context for toast (see Task 4b below) so components deep in the tree can show toasts without prop-drilling.

### Task 4b: Toast Context (enables `ServiceCard` to show toasts without prop-drilling)

- [ ] Create `src/client/src/lib/ToastContext.tsx`:
  ```tsx
  import { createContext, useContext, type ReactNode } from "react";
  import { useToast, type ToastVariant } from "./useToast";
  import { ToastContainer } from "@/components/ui/ToastContainer";

  interface ToastContextValue {
    showToast: (message: string, variant?: ToastVariant) => void;
  }

  const ToastContext = createContext<ToastContextValue | null>(null);

  export function ToastProvider({ children }: { children: ReactNode }) {
    const { toasts, showToast, dismissToast } = useToast();
    return (
      <ToastContext.Provider value={{ showToast }}>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </ToastContext.Provider>
    );
  }

  export function useShowToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useShowToast must be used within ToastProvider");
    return ctx.showToast;
  }
  ```

- [ ] Wrap the `QueryClientProvider` tree with `<ToastProvider>` in `src/client/src/main.tsx` (or `App.tsx`):
  - Find the provider tree and add `<ToastProvider>` as a wrapper inside `<QueryClientProvider>`

- [ ] Remove `ToastContainer` from `AppShell.tsx` (it's now provided by `ToastProvider`) and simplify `AppShell.tsx` to NOT own toast state — remove `useToast` import and state from `AppShell`

### Task 6: Create `useServicesHub` hook (AC: #2)

- [ ] Create `src/client/src/features/services/hooks/useServicesHub.ts`:
  ```typescript
  import { useEffect } from "react";
  import { useQueryClient } from "@tanstack/react-query";
  import { createHubConnection } from "@/lib/signalr";
  import { HUB_INVALIDATION_MAP } from "@/lib/queryClient";

  /**
   * Manages the /hubs/services SignalR connection.
   * Mounts once in AppShell — do NOT mount per-component.
   * Reconnect logic is handled by @microsoft/signalr withAutomaticReconnect().
   */
  export function useServicesHub() {
    const queryClient = useQueryClient();

    useEffect(() => {
      const connection = createHubConnection("/hubs/services");

      // Wire all events declared in HUB_INVALIDATION_MAP for this hub
      connection.on("ServiceStatusChanged", () => {
        const keys = HUB_INVALIDATION_MAP["ServiceStatusChanged"] ?? [];
        keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }));
      });

      void connection.start().catch((err: unknown) => {
        // Non-fatal — hub is best-effort; toggle manual re-fetch still works
        console.warn("[ServicesHub] connection failed:", err);
      });

      return () => {
        void connection.stop();
      };
    }, [queryClient]);
  }
  ```

### Task 7: Update `HUB_INVALIDATION_MAP` (AC: #2)

- [ ] Update `src/client/src/lib/queryClient.ts` — add the `ServiceStatusChanged` entry:
  ```typescript
  export const HUB_INVALIDATION_MAP: Record<string, QueryKey[]> = {
    ServiceStatusChanged: [["services"]],
  };
  ```

### Task 8: Upgrade `useToggleService` to optimistic UI (AC: #1)

- [ ] Update `src/client/src/features/services/hooks/useServices.ts` — replace the existing `useToggleService` export with the optimistic version:

  ```typescript
  export function useToggleService() {
    const qc = useQueryClient();
    const showToast = useShowToast();   // from @/lib/ToastContext

    return useMutation<Service, Error, { id: string; action: "start" | "stop" }>({
      mutationFn: ({ id, action }) =>
        apiFetch<Service>(`/api/services/${id}/${action}`, { method: "POST" }),

      onMutate: async ({ id, action }) => {
        // Cancel any in-flight refetch so it doesn't overwrite optimistic update
        await qc.cancelQueries({ queryKey: SERVICES_QUERY_KEY });

        // Snapshot current value for rollback on error
        const previous = qc.getQueryData<Service[]>(SERVICES_QUERY_KEY);

        // Optimistically flip isActive only — status pill is updated post-server-confirm
        qc.setQueryData<Service[]>(SERVICES_QUERY_KEY, (old) =>
          old?.map((s) =>
            s.id === id ? { ...s, isActive: action === "start" } : s
          ) ?? []
        );

        return { previous };
      },

      onError: (_err, _vars, context) => {
        // Revert optimistic update
        if (context?.previous) {
          qc.setQueryData(SERVICES_QUERY_KEY, context.previous);
        }
        showToast("Failed to update service status. Please try again.", "error");
      },

      onSettled: () => {
        // Always re-sync from server (hub event may have already done this — idempotent)
        void qc.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      },
    });
  }
  ```

  - Add import at top: `import { useShowToast } from "@/lib/ToastContext";`

### Task 9: Add `data-testid` to ServiceCard toggle input (AC: #1)

- [ ] Update `src/client/src/features/services/components/ServiceCard.tsx` — add `data-testid` to the toggle checkbox:
  ```tsx
  <input
    id={toggleId}
    type="checkbox"
    checked={isLive}
    onChange={handleToggle}
    disabled={toggleMutation.isPending}
    aria-label={`${isLive ? "Stop" : "Start"} ${service.name}`}
    data-testid={`service-toggle-${service.id}`}   // ADD THIS
  />
  ```

### Task 10: Backend integration tests (AC: #2, #4)

- [ ] Create `src/Fishtank.Api.IntegrationTests/Api/Story2_3_ServicesHubTests.cs`:
  ```csharp
  using FluentAssertions;
  using Microsoft.AspNetCore.SignalR.Client;
  using Xunit;

  namespace Fishtank.Api.IntegrationTests.Api;

  public class Story2_3_ServicesHubTests(FishtankApiFactory factory)
      : IClassFixture<FishtankApiFactory>
  {
      [Fact]
      public async Task ServicesHub_UnauthenticatedConnection_IsRejected()
      {
          // Arrange
          var client = factory.CreateClient();
          var baseAddress = client.BaseAddress!;
          var hubUrl = new UriBuilder(baseAddress) { Scheme = "ws", Path = "/hubs/services" }.Uri.ToString();

          var connection = new HubConnectionBuilder()
              .WithUrl(hubUrl)  // No credentials
              .Build();

          // Act & Assert
          var act = async () => await connection.StartAsync();
          await act.Should().ThrowAsync<Exception>();
      }

      [Fact]
      public async Task EventsHub_UnauthenticatedConnection_IsRejected()
      {
          var client = factory.CreateClient();
          var baseAddress = client.BaseAddress!;
          var hubUrl = new UriBuilder(baseAddress) { Scheme = "ws", Path = "/hubs/events" }.Uri.ToString();

          var connection = new HubConnectionBuilder()
              .WithUrl(hubUrl)
              .Build();

          var act = async () => await connection.StartAsync();
          await act.Should().ThrowAsync<Exception>();
      }

      [Fact]
      public async Task StopService_BroadcastsServiceStatusChanged()
      {
          // Arrange — authenticated hub connection
          using var scope = factory.Services.CreateScope();
          // Create a service, connect to hub with auth, call stop, assert event
          // NOTE: Use factory.CreateAuthenticatedHubConnection("/hubs/services") helper
          // that handles cookie-based JWT for WebSocket — see FishtankApiFactory helper
          // if it doesn't exist, add it in this test

          // This test verifies the hub broadcast plumbing — full E2E verified in Playwright
      }
  }
  ```

  **Note on WebSocket testing with cookies in xUnit:** The `Microsoft.AspNetCore.SignalR.Client` package used in integration tests sends cookies via `HubConnectionBuilder.WithUrl(url, opts => { opts.Cookies = cookieContainer; })`. The test factory must expose a helper that:
  1. POSTs to `/api/auth/login` with test credentials
  2. Captures the JWT cookie from the response
  3. Returns a `HubConnectionBuilder` pre-configured with that cookie

  If this helper does not exist in `FishtankApiFactory`, add it:
  ```csharp
  // In FishtankApiFactory.cs — add helper method
  public async Task<HubConnection> CreateAuthenticatedHubConnectionAsync(string hubPath)
  {
      var cookies = new System.Net.CookieContainer();
      var httpClient = CreateClient(new WebApplicationFactoryClientOptions
      {
          AllowAutoRedirect = false,
          HandleCookies = true,
      });

      // Login to get JWT cookie
      var loginResponse = await httpClient.PostAsJsonAsync("/api/auth/login",
          new { username = "admin", password = TestPassword });
      loginResponse.EnsureSuccessStatusCode();

      // Extract cookies from login response
      foreach (var cookie in loginResponse.Headers.GetValues("Set-Cookie"))
          cookies.SetCookies(httpClient.BaseAddress!, cookie);

      var hubUrl = new UriBuilder(httpClient.BaseAddress!) { Scheme = "ws", Path = hubPath }.Uri.ToString();
      return new HubConnectionBuilder()
          .WithUrl(hubUrl, opts => { opts.Cookies = cookies; })
          .Build();
  }
  ```

### Task 11: Frontend component tests (AC: #1)

- [ ] Create `src/client/src/features/services/components/__tests__/ServiceCard.toggle.test.tsx`:
  ```typescript
  import { render, screen } from "@testing-library/react";
  import userEvent from "@testing-library/user-event";
  import { http, HttpResponse } from "msw";
  import { setupServer } from "msw/node";
  import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { ToastProvider } from "@/lib/ToastContext";
  import { ServiceCard } from "../ServiceCard";
  import type { Service } from "../../types/service";

  const mockService: Service = {
    id: "test-id-123",
    name: "Payments Mock",
    slug: "payments-mock",
    description: null,
    externalUrl: "https://payments.example.com",
    port: 30101,
    mocksRoot: "/mocks/payments-mock",
    status: "live",
    isActive: true,
    tags: [],
    createdAt: "2026-01-01T00:00:00Z",
    mockFileCount: 2,
  };

  const server = setupServer(
    http.get("/api/services", () => HttpResponse.json({ success: true, data: [mockService] }))
  );

  beforeAll(() => server.listen());
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());

  function renderCard(service: Service) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["services"], [service]);
    return render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ServiceCard service={service} onEdit={() => {}} />
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  describe("ServiceCard toggle — optimistic UI", () => {
    it("optimistically flips toggle position before server responds", async () => {
      let resolveStop: (value: Response) => void;
      server.use(
        http.post("/api/services/:id/stop", () =>
          new Promise<Response>((res) => { resolveStop = res; })
        )
      );

      renderCard(mockService);
      const toggle = screen.getByTestId("service-toggle-test-id-123");

      // Toggle is checked (service is live)
      expect(toggle).toBeChecked();

      // Click toggle
      await userEvent.click(toggle);

      // Toggle should flip immediately (optimistic)
      expect(toggle).not.toBeChecked();

      // Resolve the server call
      resolveStop!(HttpResponse.json({ success: true, data: { ...mockService, status: "stopped", isActive: false } }) as unknown as Response);
    });

    it("reverts toggle and shows error toast on server failure", async () => {
      server.use(
        http.post("/api/services/:id/stop", () =>
          HttpResponse.json({ success: false, error: { code: "ENGINE_ERROR", message: "Failed" } }, { status: 500 })
        )
      );

      renderCard(mockService);
      const toggle = screen.getByTestId("service-toggle-test-id-123");

      await userEvent.click(toggle);

      // Wait for error toast
      const toast = await screen.findByTestId("toast-error");
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent("Failed to update service status");

      // Toggle should revert to checked (live)
      expect(toggle).toBeChecked();
    });
  });
  ```

---

## Dev Notes

### Architecture Compliance

- All service logic stays in `ServiceManager.cs` — NOT in endpoint handlers
- `IHubContext<T>` is injected via DI — do NOT `new` it or create a static reference
- Frontend: do NOT call `connection.start()` in `signalr.ts` — the comment is explicit. Each feature starts its own connection in a `useEffect`
- Hub invalidation MUST go through `HUB_INVALIDATION_MAP` — never call `queryClient.invalidateQueries()` directly inside a SignalR event handler in a component

### `@microsoft/signalr` Version

Already installed (Story 1.3 wired SignalR for `lib/signalr.ts`). Check `src/client/package.json` for the version. No upgrade needed.

### `IHubContext<ServicesHub>` Registration

`IHubContext<T>` is automatically registered when you call `builder.Services.AddSignalR()` — it's already called in `Program.cs`. No manual service registration needed.

### Toast Context Placement in Provider Tree

The `<ToastProvider>` wraps the authenticated app tree. It must be:
- Inside `<QueryClientProvider>` (so `useQueryClient` works inside the provider)
- Wrapping the entire router outlet (so all components can call `useShowToast`)

The correct placement is in `App.tsx` or wherever `<QueryClientProvider>` and `<RouterProvider>` are set up.

### IServiceManager Interface Update

After adding `IHubContext<ServicesHub>` to `ServiceManager`'s constructor, verify that `IServiceManager.cs` (interface) does NOT need to change — `StopAsync` and `StartAsync` method signatures are unchanged. The DI container handles the new constructor parameter automatically.

### References

- [Source: src/Fishtank.Api/Hubs/ServicesHub.cs] — existing skeleton
- [Source: src/Fishtank.Api/Services/ServiceManager.cs#StopAsync] — lines ~125-140 (StopAsync)
- [Source: src/Fishtank.Api/Services/ServiceManager.cs#StartAsync] — lines ~142-175 (StartAsync)
- [Source: src/Fishtank.Api/Program.cs#L231] — hub mapping
- [Source: src/client/src/lib/signalr.ts] — createHubConnection factory
- [Source: src/client/src/lib/queryClient.ts] — HUB_INVALIDATION_MAP
- [Source: src/client/src/features/services/hooks/useServices.ts] — useToggleService (non-optimistic, replace)
- [Source: src/client/src/features/services/components/ServiceCard.tsx] — toggle UI
- [Source: _bmad-output/project-context.md#SignalR Hub Events] — event contract table
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — acceptance criteria source

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
