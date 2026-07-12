# Fishtank

A Docker-native WireMock.NET management tool. Run mock services locally, record and replay traffic, manage mappings, and observe live network activity — all from a single container.

## Quick Demo

Try Fishtank instantly with our pre-seeded demo image — no configuration needed:

```bash
docker run -p 9090:5000 nicoiodice/fishtank:demo
```

Open **http://localhost:9090** and log in with:
- **Username:** `admin`
- **Password:** `demofishtank1`

> ⚠️ **Demo credentials** — for evaluation environments only. Do not use in production.

The demo includes three pre-seeded example services:
| Service | Port | Description |
|---------|------|-------------|
| Weather API | 30100 | Mock weather forecasts |
| Payments Gateway | 30101 | Mock payment processing |
| User Profile Service | 30102 | Mock user data |

## Quick start

```bash
docker run -p 5000:5000 \
  -e FISHTANK_JWT_SECRET=your-secret-min-32-chars \
  -v ./mocks:/mocks \
  nicoiodice/fishtank:latest
```

Then open **http://localhost:5000** in your browser.

See [`docker-compose.example.yml`](docker-compose.example.yml) for a full deployment reference including persistent storage and all configurable environment variables.

## Adding Fishtank to an existing Docker Compose project

If you already have a project with a `docker-compose.yml` (e.g. inside a `local-dev/` folder at the project root or any other folder), follow these steps.

### 1 — Generate a secret

`FISHTANK_JWT_SECRET` is the key used to sign JWT tokens. Generate a random string of at least 32 characters:

**PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

**WSL / Linux / macOS:**
```bash
openssl rand -base64 32
```

**Python (cross-platform):**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2 — Create `.env`

Store the secret in an `.env` file next to your compose file. **Never commit this file.**

```
FISHTANK_JWT_SECRET=<your generated secret>
```

Add it to `.gitignore`:
```
.env
fishtank-data/
fishtank-mocks/
```

### 3 — Add the service to your `docker-compose.yml`

```yaml
services:

  # ... your existing services stay here unchanged ...

  fishtank:
    image: nicoiodice/fishtank:latest
    container_name: fishtank
    ports:
      - "5000:5000"
    volumes:
      - ./fishtank-data:/data
      - ./fishtank-mocks:/mocks
    environment:
      - FISHTANK_JWT_SECRET=${FISHTANK_JWT_SECRET}
      - FISHTANK_DB_PATH=/data/fishtank.db
      - FISHTANK_MOCKS_ROOT=/mocks
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
```

The `fishtank-data/` and `fishtank-mocks/` folders are created automatically on first run.

### 4 — Start

```bash
docker compose up -d
```

### 5 — First-run admin setup

Open **http://localhost:5000**. On a fresh database you will be redirected to the setup screen to create your admin account (password must be ≥ 12 characters). After that you are taken directly to the app.

### Verify

```bash
docker compose ps                   # fishtank should show "healthy"
curl http://localhost:5000/health   # → Healthy
```

## Stack
| Layer | Technology |
|---|---|
| Backend | C# 13 · .NET 10.0 LTS · ASP.NET Core Minimal APIs · SignalR · EF Core + SQLite |
| Frontend | React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · shadcn/ui |
| Mock engine | WireMock.NET |
| Auth | JWT in httpOnly cookies |
| Logging | Serilog → JSON stdout + rolling daily log files |

## Repository structure

```
fishtank/
├── src/
│   ├── Fishtank.slnx                      # .NET solution (SDK-style, .NET 10)
│   ├── Fishtank.Api/                      # ASP.NET Core host — API + SignalR + SPA static serving
│   ├── Fishtank.Api.UnitTests/            # xUnit — fast, no I/O
│   ├── Fishtank.Api.IntegrationTests/     # xUnit + WebApplicationFactory + SQLite :memory:
│   └── client/                            # Vite + React + TypeScript SPA
├── global.json                            # Pins .NET SDK to 10.0.301
├── Dockerfile                             # Multi-stage: build client → build server → runtime
├── docker-compose.yml                     # Dev: .NET API + Vite dev server
├── docker-compose.example.yml             # End-user deployment reference
└── README.md
```

## Prerequisites

- [.NET SDK 10.0.301](https://dotnet.microsoft.com/download)
- [Node.js ≥ 20.19](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for container runs)

## Getting started

### Backend

```bash
# From repo root
dotnet build src/Fishtank.slnx
dotnet run --project src/Fishtank.Api
```

The API starts on `https://localhost:5001` (or `http://localhost:5000`) and serves the OpenAPI spec at `/openapi/v1.json`.

> **Required env var:** `FISHTANK_JWT_SECRET` must be ≥ 32 characters. The app exits on startup if it is missing or too short.

### Frontend

```bash
cd src/client
npm run dev
```

Vite dev server starts on `http://localhost:5173` and proxies `/api` + `/hubs` to the .NET API.

> **First-time setup:** After `npm install`, initialise shadcn/ui components:
> ```bash
> npx shadcn@latest init -t vite
> ```

### Run all tests

```bash
# .NET unit tests
dotnet test src/Fishtank.Api.UnitTests

# .NET integration tests
dotnet test src/Fishtank.Api.IntegrationTests

# Frontend unit tests
cd src/client && npm test

# Frontend coverage
cd src/client && npm run coverage
```

## Docker

```bash
# Build and run (mirrors production)
docker compose up --build
```

The container serves both the API and the compiled SPA on port `8080`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FISHTANK_JWT_SECRET` | _(required)_ | JWT signing key — minimum 32 characters. App exits on startup if missing or too short. |
| `FISHTANK_DB_PATH` | `/data/fishtank.db` | SQLite database file path. |
| `FISHTANK_MOCKS_ROOT` | `/mocks` | Root directory for WireMock mapping files inside the container. |
| `FISHTANK_MOCKS_HOST_PATH` | `mocks` | Host-side mocks path shown in the UI (display only). |
| `FISHTANK_MANAGEMENT_PORT` | `5000` | Port for the management UI. |
| `FISHTANK_JWT_EXPIRY_HOURS` | _(unset)_ | JWT expiry in hours. If unset, tokens are invalidated on container restart. |
| `FISHTANK_ADMIN_PASSWORD` | _(unset)_ | Pre-set admin password. If unset, first login forces a password change. |
| `FISHTANK_ALLOWED_ORIGINS` | _(unset)_ | Comma-separated additional CORS origins. |
| `FISHTANK_LOGIN_RATE_LIMIT` | `5` | Max login attempts per rate window. |
| `FISHTANK_LOGIN_RATE_WINDOW` | `60` | Login rate window in seconds. |
| `FISHTANK_LOG_PATH` | `/data/logs` | Directory for rolling daily log files. Must be writable by the container user. |
| `FISHTANK_LOG_RETENTION_DAYS` | `7` | Number of days to retain log files. Older files are deleted automatically. |
| `FISHTANK_SERVICES_ROOT` | `/mocks` | Root directory for service instance directories (WireMock processes). |
| `FISHTANK_ACTIVITY_MAX_ENTRIES` | `10000` | Maximum number of activity log entries to retain in memory. |
| `FISHTANK_AUTO_REGISTER` | `false` | Automatically register default admin user on first startup. |
| `FISHTANK_CAPTURE_FULL_HEADERS` | `false` | Capture full HTTP headers in activity logs (false for privacy by default). |
| `FISHTANK_PIPELINE_RESET_KEY` | _(unset)_ | API key for `/api/admin/reset` endpoint (CI/test pipelines only). |
| `FISHTANK_TOGGLE_{NAME}` | _(varies)_ | Feature toggle overrides (e.g., `FISHTANK_TOGGLE_RECORDING=true`). |
| `FISHTANK_DEBUG_ERRORS` | `false` | Expose full exception details in error responses (development only). |

## Notes

- Port range for mock services: `30100–30199` (max 100 services in v1)
- No service deletion in v1 (soft-delete is in the schema; UI is not exposed)
- SQLite is the v1 datastore — single-instance only; Postgres is the post-v1 substitution path
- All JWT tokens are invalidated on container restart (boot-epoch mechanism)

