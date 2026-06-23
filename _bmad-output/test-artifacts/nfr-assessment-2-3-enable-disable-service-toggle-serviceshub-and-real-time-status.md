---
story_key: "2-3-enable-disable-service-toggle-serviceshub-and-real-time-status"
generated: "2026-06-23"
verdict: "PASS"
stepsCompleted: ["step-05-generate-report"]
lastStep: "step-05-generate-report"
lastSaved: "2026-06-23"
---

# NFR Assessment — Story 2.3
# Enable/Disable Service Toggle, ServicesHub & Real-Time Status

**Generated:** 2026-06-23  
**Story:** 2.3 — Enable/Disable Service Toggle, ServicesHub & Real-Time Status  
**Overall Gate Decision:** ✅ PASS — Zero BLOCKER items found

---

## NFR Evidence by Category

### Security

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| NFR-8 | Hub authentication enforcement | `[Authorize]` on `ServicesHub` and `EventsHub`; unauthenticated WebSocket upgrades return 401 — verified by `ServicesHub_UnauthenticatedRequest_Returns401` and `EventsHub_UnauthenticatedRequest_Returns401_WhenRegistered` integration tests | ✅ PASS |
| Input validation | Toggle action is constrained to `"start" \| "stop"` union type at TypeScript layer; backend routes map to specific handler methods — no free-form input injection surface | ✅ PASS |
| Broadcast scope | `servicesHub.Clients.All.SendAsync(...)` broadcasts only non-sensitive operational metadata `{ id, status }` — no PII or secrets emitted | ✅ PASS |

**Security gate: PASS**

---

### Performance

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Optimistic UI | Toggle state flips synchronously in `onMutate` before server responds — zero perceived latency for the user during the pending window | ✅ PASS |
| Server push not poll | `ServiceStatusChanged` hub event triggers `queryClient.invalidateQueries` — no polling loops introduced; real-time updates are push-driven | ✅ PASS |
| Query cancellation | `qc.cancelQueries` called in `onMutate` before setting optimistic state — prevents in-flight refetches from clobbering the optimistic update | ✅ PASS |

**Performance gate: PASS**

---

### Reliability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Hub connection degradation | `connection.start().catch(err => console.warn(...))` — SignalR connection failure is non-fatal; optimistic toggle + `onSettled` invalidation continue to function without hub | ✅ PASS |
| Optimistic revert | `onError` restores previous cache snapshot via `setQueryData(SERVICES_QUERY_KEY, context.previous)` — no stale/incorrect state left on server failure | ✅ PASS |
| Error feedback | Error toast shown on mutation failure (`showToast("Failed to update service status. Please try again.", "error")`) — user is informed of failures | ✅ PASS |
| Timer resource management | `useToast` tracks `setTimeout` IDs in `useRef`, cleared on `dismissToast` — no timer leaks after toast dismissal or component unmount | ✅ PASS |
| Broadcast after save | `ServiceStatusChanged` broadcast happens after `SaveChangesAsync` — DB is consistent before clients are notified; if broadcast fails, client-side `onSettled` invalidation provides fallback consistency | ✅ PASS (accepted trade-off) |

**Reliability gate: PASS**

---

### Maintainability

| NFR | Description | Evidence | Score |
|-----|-------------|----------|-------|
| Hub invalidation map | `HUB_INVALIDATION_MAP` in `queryClient.ts` is the single place to add/modify hub event → query key mappings — `ServiceStatusChanged: [["services"]]` | ✅ PASS |
| Toast infrastructure | `ToastContext` + `ToastProvider` pattern avoids prop drilling; `useShowToast` returns no-op outside provider for test isolation | ✅ PASS |
| ARIA accessibility | Error toasts use `role="alert"` (assertive); info/success use `role="status"` (polite); no dual-announcement pattern (container-level `aria-live` removed after code review) | ✅ PASS |
| Hub lifecycle | `useServicesHub` mounts once in `AppShell`, cleanup stops connection on unmount — no connection leaks | ✅ PASS |

**Maintainability gate: PASS**

---

## Remediation Log

No remediation actions required. Two items were proactively fixed during code review (Phase 7):

1. **Timer leak** (`useToast.ts`): auto-dismiss `setTimeout` IDs now tracked in `useRef` and cleared in `dismissToast` — prevents orphaned timers after dismiss.
2. **Dual ARIA announcement** (`ToastContainer.tsx`): removed container-level `aria-live` in favour of per-toast `role="alert"` (errors) / `role="status"` (info/success) — prevents screen reader double-announcement.

---

## Gate-Ready YAML

```yaml
nfr_gate:
  story_key: "2-3-enable-disable-service-toggle-serviceshub-and-real-time-status"
  verdict: PASS
  categories:
    security: PASS
    performance: PASS
    reliability: PASS
    maintainability: PASS
  blockers: 0
  concerns: 0
  generated: "2026-06-23"
```
