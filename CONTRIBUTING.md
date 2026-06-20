# Contributing to Fishtank

Thank you for your interest in contributing! This document covers everything you need to get started.

## Architecture Overview (< 10 minutes)

Fishtank is a Docker-native WireMock.NET management UI. The high-level architecture:

| Layer | Technology |
|---|---|
| Backend | C# 13 · .NET 10.0 LTS · ASP.NET Core Minimal APIs · SignalR · EF Core + SQLite |
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · shadcn/ui · React Query |
| Mock engine | WireMock.NET 2.x |
| Auth | JWT in httpOnly cookies |
| Logging | Serilog → structured JSON stdout |
| Container | Multi-stage Alpine Docker; non-root user `fishtank` |

Full architectural decisions are documented in [`_bmad-output/planning-artifacts/architecture.md`](_bmad-output/planning-artifacts/architecture.md).

## Project Structure

```
fishtank/
├── src/
│   ├── Fishtank.slnx                      # .NET solution
│   ├── Fishtank.Api/                      # ASP.NET Core host — API + SPA + SignalR
│   ├── Fishtank.Api.UnitTests/            # xUnit — fast, no I/O
│   ├── Fishtank.Api.IntegrationTests/     # xUnit + WebApplicationFactory
│   └── client/                            # Vite + React + TypeScript SPA
├── Dockerfile                             # Multi-stage Alpine build
├── docker-compose.yml                     # Dev environment
├── docker-compose.example.yml             # End-user deployment reference
└── .github/workflows/
    ├── test.yml                           # CI: lint + tests
    └── docker.yml                         # CI: Docker build + smoke test + publish
```

## Local Dev Setup

### Option 1: DevContainer (recommended)

Open the repository in VS Code and choose **Dev Containers: Reopen in Container**. The devcontainer installs .NET 10, Node 22, and Docker CLI automatically.

### Option 2: Manual Setup

**Prerequisites:**
- [.NET SDK 10.0.301](https://dotnet.microsoft.com/download)
- [Node.js ≥ 22](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/)

**Run locally:**
```bash
# Backend
dotnet run --project src/Fishtank.Api

# Frontend (separate terminal)
cd src/client && npm run dev
```

## Running Tests

```bash
# Backend unit tests
dotnet test src/Fishtank.Api.UnitTests

# Backend integration tests
dotnet test src/Fishtank.Api.IntegrationTests

# Frontend unit tests
cd src/client && npm test

# Frontend E2E (requires running API + client)
cd src/client && npm run test:e2e

# All tests
dotnet test src/Fishtank.slnx
```

## PR Workflow

1. Branch from `main` using the `story/{story-key}` naming convention (e.g., `story/1-2-auth`)
2. Make your changes, ensuring all tests pass locally
3. Open a PR against `main`
4. CI (`test.yml`) must be green before merging
5. Request a review from a maintainer

## Good First Issues

New contributors should look for issues labelled [`good first issue`](https://github.com/NicoIodice/fishtank/labels/good%20first%20issue) in the issue tracker. These are scoped, well-defined tasks suitable for first contributions.

> **Note to maintainers:** After repository creation, manually add `good first issue`, `bug`, `enhancement`, `documentation`, and `security` labels via GitHub's label editor.
