# Fishtank — Test Suite

## Overview

This directory contains the full test suite for Fishtank:

| Layer | Location | Framework | Purpose |
|---|---|---|---|
| **E2E / UI** | `src/client/tests/e2e/` | Playwright + playwright-utils | Full-stack browser tests |
| **Integration** | `src/Fishtank.Api.IntegrationTests/` | xUnit + WebApplicationFactory | API integration tests |
| **Unit** | `src/Fishtank.Api.UnitTests/` | xUnit | Fast, no-I/O unit tests |

---

## Prerequisites

- Node.js ≥ 20.19 (frontend / E2E)
- .NET 10 SDK (backend)
- The Fishtank app running locally (E2E tests only)

Copy `.env.example` to `.env` in the project root and fill in credentials before running E2E tests.

---

## Running E2E Tests (Playwright)

```bash
cd src/client

# Run all E2E tests (headless)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in debug/headed mode
npm run test:e2e:debug

# Open last HTML report
npm run test:e2e:report
```

The app must be running before executing E2E tests:

```bash
# Terminal 1 — start API
cd src && dotnet run --project Fishtank.Api

# Terminal 2 — start frontend dev server
cd src/client && npm run dev
```

---

## Running Backend Tests (.NET)

```bash
# All tests (unit + integration)
dotnet test src/Fishtank.slnx

# Unit tests only (fast, no host startup)
dotnet test src/Fishtank.Api.UnitTests

# Integration tests only
dotnet test src/Fishtank.Api.IntegrationTests

# With code coverage
dotnet test src/Fishtank.slnx --collect:"XPlat Code Coverage"
```

---

## Architecture

### Playwright (E2E)

```
src/client/
├── playwright.config.ts           # Timeouts, reporters, projects (Chromium + Firefox)
└── tests/
    ├── e2e/                       # Spec files — one feature per file
    │   └── services.spec.ts       # Example spec
    └── support/
        ├── fixtures/
        │   └── index.ts           # Merged test object (import test/expect from here)
        ├── auth/
        │   └── auth-provider.ts   # Fishtank JWT cookie provider
        ├── helpers/
        │   └── api-client.ts      # apiFetch<T>() — response-envelope aware
        ├── factories/
        │   └── service-factory.ts # createService() — Faker-based, override-friendly
        └── global-setup.ts        # Runs once before all tests; seeds auth state
```

**Always import `test` and `expect` from `tests/support/fixtures/index.ts`** — not directly from `@playwright/test`. This gives you all playwright-utils fixtures (apiRequest, interceptNetworkCall, networkErrorMonitor, etc.) automatically.

### xUnit (Integration + Unit)

```
src/
├── Fishtank.Api.IntegrationTests/
│   ├── Support/
│   │   ├── FishtankWebApplicationFactory.cs  # WebApplicationFactory<Program>
│   │   ├── IntegrationTestBase.cs            # Shared base — HttpClient, JsonOptions
│   │   └── TestAuthHelper.cs                 # Login helper for authenticated tests
│   └── Api/
│       └── HealthTests.cs                    # Example integration test
└── Fishtank.Api.UnitTests/
    └── Support/
        └── UnitTestBase.cs                   # Shared base for unit tests
```

All integration tests inherit from `IntegrationTestBase` and are decorated with `[Collection("Integration")]` — this ensures a single `FishtankWebApplicationFactory` instance is shared across the collection (no redundant app startups).

---

## Best Practices

### Selectors — always use `data-testid`

```typescript
// ✅ Good — stable, intent-revealing
page.getByTestId('add-service-button')

// ❌ Avoid — brittle, breaks on style changes
page.locator('.btn-primary')
page.locator('button:nth-child(2)')
```

### Network interception — intercept before navigation

```typescript
// ✅ Setup before goto — never miss the response
const call = interceptNetworkCall({ url: '**/api/services' });
await page.goto('/services');
const { status } = await call;
```

### Test isolation — factories over hardcoded data

```typescript
// ✅ Unique per test run — parallel-safe
const svc = createService({ name: 'payments-mock' });

// ❌ Shared state causes flakes in parallel
const svc = { name: 'my-service', port: 30100 };
```

### API seeding — use the API, not the UI

```typescript
// ✅ Fast — seed via API in beforeEach
await apiFetch(request, '/api/services', { method: 'POST', data: svc });
await page.goto('/services'); // UI is for verification only
```

---

## Authentication

Fishtank issues JWTs as **httpOnly cookies** — the JWT is never accessible from JavaScript.

- **Browser tests**: Playwright persists cookies automatically once logged in. Once auth endpoints exist, enable `storageState` in `playwright.config.ts` and uncomment `seedAuthStorageState()` in `global-setup.ts`.
- **API-only tests** (no browser): Use `TestAuthHelper.LoginAsync(client)` in xUnit tests; the `HttpClient` carries the cookie automatically on subsequent calls.
- **Multi-user**: Pass a `userIdentifier` to `authToken` fixture (`'admin'`, `'default'`).

---

## CI Integration

Playwright artifacts (screenshots, traces, videos) are uploaded on failure:

```yaml
# .github/workflows — add after the playwright test step
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: src/client/playwright-report/
    retention-days: 14
```

For .NET coverage:
```bash
dotnet test --collect:"XPlat Code Coverage" --results-directory coverage/
```

---

## Troubleshooting

### `@seontechnologies/playwright-utils` fails to install on Windows

The package has a Unix postinstall hook. Install with:

```bash
npm install -D @seontechnologies/playwright-utils --ignore-scripts
```

### Playwright browsers not found

```bash
cd src/client
npx playwright install chromium firefox
```

### Auth errors in E2E tests

- Confirm `.env` exists and credentials are correct
- Confirm the API is running at `API_URL`
- Enable verbose logging: `DEBUG_AUTH=true npm run test:e2e`

### xUnit: `Program` type not found in `WebApplicationFactory<Program>`

The `public partial class Program;` declaration at the bottom of `Program.cs` is required for top-level statement programs. Verify it is present.

### Tests flaking in CI

- Increase workers if parallel pollution is suspected: `workers: 1` in `playwright.config.ts`
- Check `networkErrorMonitor` output — unexpected 4xx/5xx from the API are the most common cause
- Review Playwright traces in `playwright-report/` for the failing test

