# Fishtank

A Docker-native WireMock.NET management tool. Run mock services locally, record and replay traffic, manage mappings, and observe live network activity — all from a single container.

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
| Logging | Serilog → JSON stdout |

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

## Notes

- Port range for mock services: `30100–30199` (max 100 services in v1)
- No service deletion in v1 (soft-delete is in the schema; UI is not exposed)
- SQLite is the v1 datastore — single-instance only; Postgres is the post-v1 substitution path
- All JWT tokens are invalidated on container restart (boot-epoch mechanism)

