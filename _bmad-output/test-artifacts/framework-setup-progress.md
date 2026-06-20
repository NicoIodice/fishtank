---
stepsCompleted: ['step-01-preflight', 'step-02-select-framework', 'step-03-scaffold-framework', 'step-04-docs-and-scripts', 'step-05-validate-and-summary']
lastStep: 'step-05-validate-and-summary'
lastSaved: '2026-06-20'
---

# Test Framework Setup — Progress

## Step 1: Preflight Checks

**Detected Stack:** `fullstack`

- **Frontend indicators found:** `src/client/package.json` (React 19, Vite 8, TypeScript strict)
- **Backend indicators found:** `src/Fishtank.Api.IntegrationTests/Fishtank.Api.IntegrationTests.csproj`, `src/Fishtank.Api.UnitTests/Fishtank.Api.UnitTests.csproj`, `src/Fishtank.Api/Fishtank.Api.csproj`

**Prerequisites check:**
- ✅ `package.json` exists at `src/client/`
- ✅ No existing E2E framework (`playwright.config.*`, `cypress.config.*` — none found)
- ✅ Backend `.csproj` manifests present
- ✅ Architecture docs available: `_bmad-output/project-context.md`, `_bmad-output/planning-artifacts/architecture.md`

**Project Context:**
- Frontend: React 19, Vite 8 (Rolldown), TypeScript ~6.0, `@/` path alias
- Frontend unit testing: Vitest 4 + RTL + msw + jsdom — already installed in devDependencies (unit/component layer only; no E2E yet)
- Backend: C# 13 / .NET 10.0 LTS
- Backend test framework: xUnit 2.9 + FluentAssertions + Respawn + MVC.Testing — scaffolded (placeholder `UnitTest1.cs` only, no real tests)
- Auth: JWT in httpOnly cookies (`credentials: 'include'` always)
- Real-time: SignalR hub

---

## Step 2: Framework Selection

**Frontend E2E:** **Playwright**

Rationale:
- Fullstack project with API + UI integration requirements
- Multi-browser support needed
- SignalR/WebSocket testing capability (Playwright supports network interception)
- CI parallelism important for a growing suite
- Vite dev server integration available via `@playwright/test`

**Backend:** **xUnit** (already scaffolded — no new installation needed)

- Packages already present: `xunit`, `Microsoft.AspNetCore.Mvc.Testing`, `Respawn`, `FluentAssertions`
- Scope of this framework setup: flesh out the xUnit project structure (base classes, fixtures, helpers)
