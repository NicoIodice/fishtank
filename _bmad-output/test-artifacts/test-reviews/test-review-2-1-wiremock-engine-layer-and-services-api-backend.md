---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-quality-evaluation', 'step-03f-aggregate-scores', 'step-04-generate-report']
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-22'
workflowType: 'testarch-test-review'
overallGrade: 'B+'
overallScore: 87
verdict: 'PASS'
---

# Test Quality Review — Story 2-1: WireMock Engine Layer and Services API Backend

**Date:** 2026-06-22  
**Story:** `2-1-wiremock-engine-layer-and-services-api-backend`  
**Overall Grade:** B+ (87/100)  
**Verdict:** PASS ✅

> **Coverage Note:** Test coverage is assessed in `traceability-matrix-2-1-...md` (gate: PASS). This review assesses quality dimensions only: determinism, isolation, maintainability, and performance.

---

## Score Summary

| Dimension | Score | Grade | Key Findings |
|-----------|-------|-------|--------------|
| Determinism | 95/100 | A | One advisory: fixed port constants; no random/time deps |
| Isolation | 90/100 | A- | Per-test DB reset via `ResetDatabaseAsync()` + registry cleanup; `IAsyncLifetime` pattern correct |
| Maintainability | 75/100 | C+ | Integration test file is 640 lines (HIGH); otherwise good naming and structure |
| Performance | 88/100 | B+ | 51 integration tests in ~39s is acceptable; no hard waits; TCP polling with 500ms timeout bounded |
| **Overall** | **87/100** | **B+** | One maintainability HIGH; no blockers |

---

## Dimension 1: Determinism

**Score: 95/100 — Grade: A**

### Passed Checks

- ✅ No `Random`, `Math.random()`, `new Date()` (uncontrolled) in test files
- ✅ Port constants `TestPort1 = 30190`, `TestPort2 = 30191`, `TestPort3 = 30192` are fixed, not dynamically assigned
- ✅ DB seed in tests uses hardcoded names ("Service Alpha", "Service Beta") — ordering assertions are reliable
- ✅ `ThrowingWireMockFactory` is deterministic (always throws, or always fails on specific port)
- ✅ Unit test DB uses `Guid.NewGuid().ToString()` per-instance (isolates InMemory databases, not a non-determinism issue)
- ✅ xUnit Theory inputs are compile-time constants — no parameterized randomness
- ✅ No `Task.Delay(N)` hard waits in integration tests; `TryTcpConnectAsync` uses bounded timeout with `Task.WhenAny`

### Violations

| Severity | File | Description | Suggestion |
|----------|------|-------------|------------|
| LOW | ServiceManagerTests.cs | `DateTimeOffset.UtcNow.AddDays(-1)` in seed data | Acceptable in unit tests (not an ordering dependency; just marks rows as deleted). No action required. |

---

## Dimension 2: Isolation

**Score: 90/100 — Grade: A-**

### Passed Checks

- ✅ `IntegrationTestBase.InitializeAsync()` calls `Factory.ResetDatabaseAsync()` before every test — shared DB state cleared
- ✅ `ResetDatabaseAsync` (E3 patch) also calls `TryRemove` on all registry entries — WireMock server state cleared
- ✅ Tests that need different host configs use `Factory.WithWebHostBuilder(...)` — create isolated hosts, don't mutate shared factory
- ✅ `IAsyncLifetime` pattern correctly implemented — `DisposeAsync` disposes HttpClient
- ✅ AC-2 and AC-10 use isolated sub-factories so `ThrowingWireMockFactory` doesn't affect other tests
- ✅ Unit tests use per-instance `Guid.NewGuid()` InMemory DB — no state leaks between unit tests
- ✅ `NSubstitute` mocks are per-test-instance — no shared substitute state

### Violations

| Severity | File | Description | Suggestion |
|----------|------|-------------|------------|
| MEDIUM | Story2_1_ServicesTests.cs | Tests that use `Factory.WithWebHostBuilder()` create a new `TestServer` on each call — if many tests do this it adds startup time. Currently only 2 tests use it; acceptable. | If this pattern grows beyond 5 tests, consider a separate `[Collection]` with a pre-configured factory. |
| LOW | ServiceManagerTests.cs | `Dispose()` only disposes `_db` — `_registry` and `_events` NSubstitute objects are not explicitly reset. | NSubstitute does not maintain state across instances; no action required for current tests. |

---

## Dimension 3: Maintainability

**Score: 75/100 — Grade: C+**

### Passed Checks

- ✅ Test names follow `<Method>_<Condition>_<ExpectedBehavior>` convention consistently
- ✅ Theory tests use `[InlineData]` with descriptive display names
- ✅ `ThrowingWireMockFactory` is well-encapsulated in a file-scoped sealed class with `failPortOnly` parameter
- ✅ Constants (`TestPort1/2/3`) reduce magic numbers in test bodies
- ✅ Helper `GetAuthenticatedClientAsync()` and `CreateAuthenticatedClientForFactoryAsync()` reduce duplication
- ✅ `TryTcpConnectAsync` extracted as a private helper — not duplicated
- ✅ Unit tests are grouped by functional category with `// ─── heading ─────` separators
- ✅ Unit test file is 166 lines — well within single-responsibility threshold
- ✅ Each test has a `DisplayName` attribute for readable test runner output

### Violations

| Severity | File | Line | Description | Suggestion |
|----------|------|------|-------------|------------|
| HIGH | Story2_1_ServicesTests.cs | 1–640 | File is 640 lines — exceeds 100-line single-responsibility guideline | Split into 2–3 files: `Story2_1_CreateServiceTests.cs`, `Story2_1_UpdateStopStartTests.cs`, `Story2_1_SystemEventsAndPortTests.cs`. Not required for this story; log in deferred-work. |
| MEDIUM | Story2_1_ServicesTests.cs | ~200 | `ThrowingWireMockFactory` defined at the bottom of the same 640-line file | Move to `Support/ThrowingWireMockFactory.cs` when splitting the file (deferred with file split). |
| LOW | Story2_1_ServicesTests.cs | ~400 | Long tests (AC-10 ~30 lines) — could use extracted arrange/act helpers for the 3-service setup pattern | Low priority; test clarity is adequate. |

---

## Dimension 4: Performance

**Score: 88/100 — Grade: B+**

### Passed Checks

- ✅ Full 51-test integration suite runs in ~39s — well within a 5-minute CI budget
- ✅ No `Thread.Sleep` or `Task.Delay(N)` unconditional waits
- ✅ `TryTcpConnectAsync` bounded at 500ms with `Task.WhenAny` — cannot hang
- ✅ Single shared `FishtankWebApplicationFactory` via `[Collection("Integration")]` — host started once per suite, not per test
- ✅ Per-test DB reset uses EF Core `ExecuteDeleteAsync` / truncation (not full schema recreation) — fast
- ✅ `WithWebHostBuilder()` tests create a separate host only when needed (2 tests)
- ✅ Unit tests in `ServiceManagerTests.cs` run in ~3s with InMemory provider

### Violations

| Severity | File | Description | Suggestion |
|----------|------|-------------|------------|
| MEDIUM | Story2_1_ServicesTests.cs | AC-1 test waits up to 2s via `TryTcpConnectAsync` polling loop for WireMock port to become live. On CI, process startup time is variable. | Current 2000ms timeout is acceptable; increase to 5000ms if CI flakiness observed. |
| LOW | Story2_1_ServicesTests.cs | AC-10 test spins up 2 extra services and makes 3+ network calls. It's the slowest test (~1s). | Acceptable for a P0 NFR test. Note it in a comment for future optimisation. |

---

## Critical Findings

None — no blockers. Proceed to done phase.

---

## Warnings (3 total)

| # | Dimension | Severity | Item | Action |
|---|-----------|----------|------|--------|
| W1 | Maintainability | HIGH | `Story2_1_ServicesTests.cs` is 640 lines | Split file in a future cleanup story; log in deferred-work |
| W2 | Maintainability | MEDIUM | `ThrowingWireMockFactory` inside main test file | Move to `Support/` when splitting |
| W3 | Performance | MEDIUM | AC-1 TCP polling 2s timeout may be flaky on slow CI | Increase to 5000ms if CI flakiness observed |

---

## Recommendations

1. **W1** — File split: When test count in `Story2_1_ServicesTests.cs` grows past 20 tests (currently 20), split by concern. Add to deferred-work backlog.
2. **W3** — CI timeout: If the xUnit test run shows intermittent AC-1 failures on CI with "expected TCP connection but port not ready", bump `TryTcpConnectAsync` call in AC-1 from `2000` → `5000`.

---

## Gate Decision

**PASS ✅** — No blocking quality issues. W1 (file size) is a deferred maintainability concern, not a blocker. All tests are deterministic, properly isolated, and perform within acceptable CI bounds.
