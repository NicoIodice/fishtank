---
story_key: 6-3-fishtank-demo-pre-seeded-docker-image
epic_id: epic-6
title: Fishtank Demo Pre-Seeded Docker Image
status: done
created: 2026-07-12
frs: [FR-42, FR-34]
nfrs: []
risk_links: [R-E6-005]
test_design: _bmad-output/test-artifacts/test-design/test-design-epic-6.md
---

# Story 6-3: Fishtank Demo Pre-Seeded Docker Image

## User Story

**As a** first-time evaluator or workshop participant,
**I want** to pull a `fishtank-demo` Docker image and immediately explore a fully operational Fishtank instance with realistic example services,
**So that** I can understand what Fishtank does in under 5 minutes without any configuration.

---

## Acceptance Criteria

### Demo Image Startup & Pre-Seeded Services

1. **Given** `docker run -p 9090:5000 fishtank/fishtank:demo`,
   **When** the container starts,
   **Then** the management UI is accessible at `http://localhost:9090` and shows 3+ pre-seeded example services with realistic WireMock mappings and sample response files — zero configuration required (FR-42).
   > Note: The container listens on port 5000 internally (`ASPNETCORE_URLS=http://+:5000`). Map any host port to 5000: `-p 9090:5000`.

2. **Given** the demo image,
   **When** `GET /api/services` is called after startup,
   **Then** at least 3 services are returned:
   - **Weather API** (port 30100) — weather forecast mock service
   - **Payments Gateway** (port 30101) — payment processing mock service
   - **User Profile Service** (port 30102) — user data mock service

3. **Given** each demo service,
   **When** the service is started,
   **Then** the WireMock engine binds to its configured port and serves mock responses.

### Realistic Mock Mappings

4. **Given** the **Weather API** demo service,
   **Then** it has at minimum:
   - `GET /weather/current` → 200 with sample JSON: `{"city":"Seattle","temp_c":18,"condition":"Partly cloudy"}`
   - `GET /weather/forecast` → 200 with sample 5-day forecast JSON

5. **Given** the **Payments Gateway** demo service,
   **Then** it has at minimum:
   - `POST /payments/charge` → 200 with charge confirmation: `{"transaction_id":"txn_demo_001","status":"approved","amount":99.99}`
   - `POST /payments/refund` → 200 with refund confirmation

6. **Given** the **User Profile Service** demo service,
   **Then** it has at minimum:
   - `GET /users/me` → 200 with sample user profile JSON
   - `PUT /users/me` → 200 with updated profile response

### Image Build Strategy

7. **Given** the demo image,
   **Then** it is built FROM the production image (`fishtank/fishtank:{version}` or `fishtank/fishtank:latest`) — NOT a divergent Dockerfile (FR-42).
   > The demo image layers seed data on top of the production image to ensure identical runtime behavior.

8. **Given** the demo image build process,
   **Then** the only difference from production is:
   - Seed JSON file is COPY'd into the image at `/data/demo-seed.json`
   - `FISHTANK_SEED_FILE` env var is set to `/data/demo-seed.json`

### Docker Hub Tagging

9. **Given** the Docker Hub namespace `fishtank/fishtank`,
   **Then** tags are clearly distinguished (FR-34, FR-42):
   - `nicoiodice/fishtank:latest` — production image (latest version)
   - `nicoiodice/fishtank:{version}` — production image (specific version)
   - `nicoiodice/fishtank:demo` — demo image with pre-seeded data

### Default Demo Credentials

10. **Given** the demo image,
    **When** it starts for the first time,
    **Then** the first-run setup has already been completed with default credentials:
    - Username: `admin`
    - Password: `demofishtank1` (13 chars — meets the ≥12 char minimum enforced by `POST /api/auth/setup`)

11. **Given** the demo credentials,
    **Then** they are documented in `README.md` with a clear security warning:
    > ⚠️ **Demo credentials only** — username `admin`, password `demofishtank1`. These credentials are intended for evaluation environments only. Do NOT use in production. Change your password immediately after setup.

### Seed Data Format

12. **Given** the demo seed JSON file,
    **Then** its format matches the existing FR-5 seed file import schema (additive import by `Slug`) used by `POST /api/services/import`.

### Health & Functionality

13. **Given** the demo image,
    **When** `GET /health` is called after startup,
    **Then** HTTP 200 is returned — the container is healthy.

14. **Given** the demo image,
    **When** `GET /openapi/v1.json` is called,
    **Then** the OpenAPI spec is served — all production endpoints are available.

---

## Dev Notes

### Build Strategy: Layer on Production Image

The demo image MUST be built FROM the production image to ensure identical runtime behavior:

```dockerfile
# demo.Dockerfile (new file in repo root)
ARG VERSION=latest
FROM nicoiodice/fishtank:${VERSION}

# Copy demo WireMock mapping files into the mocks directory
# WireMock reads from {MocksRoot}/mappings/ and {MocksRoot}/__files/
# where MocksRoot = {FISHTANK_MOCKS_ROOT}/{slug} = /app/mocks/{slug}
COPY resources/demo-mocks/ /app/mocks/

# Copy demo seed file (creates Service DB records on first startup)
COPY resources/demo-seed.json /data/demo-seed.json

# Copy first-run setup script
COPY resources/demo-entrypoint.sh /usr/local/bin/demo-entrypoint.sh

# Must run as root to chmod, then switch back to fishtank user
USER root
RUN chown -R fishtank:fishtank /app/mocks /data && \
    chmod +x /usr/local/bin/demo-entrypoint.sh
USER fishtank

ENV FISHTANK_SEED_FILE=/data/demo-seed.json

ENTRYPOINT ["/usr/local/bin/demo-entrypoint.sh"]
```

> **Why a startup script?** `FISHTANK_ADMIN_PASSWORD` env var does NOT exist in the codebase. First-run account creation requires calling `POST /api/auth/setup`. The startup script starts the server, waits for `/health`, creates the admin if needed, then keeps the process running.

### First-Run Setup Script (`resources/demo-entrypoint.sh`)

```sh
#!/bin/sh
set -e

# Start the .NET server in background
dotnet /app/Fishtank.Api.dll &
SERVER_PID=$!

# Wait for /health to return 200
echo "Waiting for server to be ready..."
until wget -qO- http://localhost:5000/health > /dev/null 2>&1; do
  sleep 1
done

# Create the demo admin account if first-run setup is needed
NEEDS_SETUP=$(wget -qO- http://localhost:5000/api/setup/status | grep -c '"needsSetup":true' || true)
if [ "$NEEDS_SETUP" -gt "0" ]; then
  echo "Creating demo admin account..."
  wget -qO- --post-data='{"username":"admin","password":"demofishtank1"}' \
    --header='Content-Type: application/json' \
    http://localhost:5000/api/auth/setup > /dev/null
  echo "Demo admin account created."
fi

# Wait for the server process
wait $SERVER_PID
```

The key insight: the existing `FISHTANK_SEED_FILE` mechanism from FR-5 handles Service DB record creation automatically at container startup. The startup script handles admin account creation. No new backend code required.

### Seed File Location & Format

Create: `resources/demo-seed.json`.

The actual `SeedEntry` C# record (in `EngineStartup.cs`) is:
```csharp
private sealed record SeedEntry(string Name, string ExternalUrl, int Port, string? Description, string[]? Tags);
```

The file is deserialized as **a flat JSON array** (`SeedEntry[]`) — NOT an object with a `services` key. There are NO `mappings` or `responses` fields in `SeedEntry`. The correct format is:

```json
[
  {
    "name": "Weather API",
    "externalUrl": "http://external-weather-api.example.com",
    "port": 30100,
    "description": "Demo weather forecast service",
    "tags": ["demo", "weather"]
  },
  {
    "name": "Payments Gateway",
    "externalUrl": "http://external-payments.example.com",
    "port": 30101,
    "description": "Demo payment processing service",
    "tags": ["demo", "payments"]
  },
  {
    "name": "User Profile Service",
    "externalUrl": "http://external-user-api.example.com",
    "port": 30102,
    "description": "Demo user profile service",
    "tags": ["demo", "users"]
  }
]
```

> **Critical**: The seed file ONLY creates Service database records — it does NOT create WireMock mapping files. Mock endpoint responses come from physical JSON files on disk (see next section).

### WireMock Mapping Files (Separate from Seed)

WireMock is started with `ReadStaticMappings = true` and `FileSystemHandler = new LocalFileSystemHandler(service.MocksRoot)`. It reads mappings from `{MocksRoot}/mappings/*.json` and response bodies from `{MocksRoot}/__files/*`.

With default `FISHTANK_MOCKS_ROOT=/app/mocks` and slug derived from service name, the paths are:
```
/app/mocks/weather-api/mappings/get-current-weather.json
/app/mocks/weather-api/mappings/get-forecast.json
/app/mocks/weather-api/__files/weather-current.json
/app/mocks/payments-gateway/mappings/post-charge.json
/app/mocks/payments-gateway/mappings/post-refund.json
/app/mocks/payments-gateway/__files/charge-response.json
/app/mocks/user-profile-service/mappings/get-profile.json
/app/mocks/user-profile-service/mappings/put-profile.json
/app/mocks/user-profile-service/__files/profile.json
```

Create these files in `resources/demo-mocks/` with this directory structure (mirroring the `/app/mocks/` layout). The demo Dockerfile COPYs `resources/demo-mocks/` → `/app/mocks/`.

Each WireMock mapping stub uses the standard WireMock.Net format:
```json
{
  "request": { "method": "GET", "urlPath": "/weather/current" },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "bodyFileName": "weather-current.json"
  }
}
```

> **Slug generation**: The `GenerateSlug()` method in `EngineStartup.cs` lowercases the name and replaces non-alphanumeric characters with hyphens. "Weather API" → `weather-api`, "Payments Gateway" → `payments-gateway`, "User Profile Service" → `user-profile-service`.

### Demo Service Specifications

| Service | Slug | Port | Description |
|---------|------|------|-------------|
| Weather API | `weather-api` | 30100 | Returns mock weather data (current, forecast) |
| Payments Gateway | `payments-gateway` | 30101 | Simulates payment processing (charge, refund) |
| User Profile Service | `user-profile-service` | 30102 | CRUD operations for user profiles |

### WireMock Mapping Examples

**Weather API — GET /weather/current:**
```json
{
  "request": {
    "method": "GET",
    "urlPath": "/weather/current"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": {
      "city": "Seattle",
      "temp_c": 18,
      "temp_f": 64,
      "condition": "Partly cloudy",
      "humidity": 72,
      "wind_kph": 12
    }
  }
}
```

**Payments Gateway — POST /payments/charge:**
```json
{
  "request": {
    "method": "POST",
    "urlPath": "/payments/charge"
  },
  "response": {
    "status": 200,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": {
      "transaction_id": "txn_demo_001",
      "status": "approved",
      "amount": 99.99,
      "currency": "USD",
      "timestamp": "2026-07-12T10:00:00Z"
    }
  }
}
```

### First-Run Setup (via Startup Script)

`FISHTANK_ADMIN_PASSWORD` does **NOT** exist as an env var. First-run admin account creation requires `POST /api/auth/setup`. The startup script (`resources/demo-entrypoint.sh`, described above in Build Strategy) handles this automatically on first container start. Users can log in immediately with `admin`/`demofishtank1`.

### CI Workflow Changes

Add a new job `publish-demo` to `.github/workflows/release.yml`:

```yaml
publish-demo:
  name: Publish Demo Image
  needs: [publish]  # Runs AFTER production image is pushed
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Build and push demo image
      uses: docker/build-push-action@v6
      with:
        context: .
        file: demo.Dockerfile
        push: true
        tags: fishtank/fishtank:demo
        build-args: |
          VERSION=${{ github.ref_name }}
```

### README Documentation

Add a new section to `README.md`:

```markdown
## Quick Demo

Try Fishtank instantly with our pre-seeded demo image:

\`\`\`bash
docker run -p 9090:5000 fishtank/fishtank:demo
\`\`\`

Open http://localhost:9090 and log in with:
- **Username:** admin
- **Password:** demofishtank1

⚠️ **Demo credentials only** — these are intended for evaluation environments only. Do NOT use in production.

The demo image includes three example services:
- **Weather API** (port 30100) — mock weather forecasts
- **Payments Gateway** (port 30101) — mock payment processing
- **User Profile Service** (port 30102) — mock user data
```

### No Backend Changes Required

This story re-uses existing infrastructure:
- **Seed import:** `FISHTANK_SEED_FILE` env var + existing FR-5 seed import logic
- **Admin password:** `FISHTANK_ADMIN_PASSWORD` env var (existing first-run setup)
- **All endpoints:** Production image already has all endpoints

The only new artifacts are:
1. `demo.Dockerfile` — layered Dockerfile
2. `demo-seed.json` — seed data file
3. CI job additions to `.github/workflows/release.yml`
4. README.md updates

---

## Implementation Tasks

| # | Task | Description |
|---|------|-------------|
| 1 | **Create demo seed JSON** | Author `resources/demo-seed.json` as a flat JSON array `[{"name":..., "externalUrl":..., "port":..., "description":..., "tags":[...]}]` — NO `services` wrapper, NO `mappings`/`responses` fields (see Seed File Format above) |
| 2 | **Create demo WireMock files** | Create `resources/demo-mocks/` directory with WireMock mapping stubs and `__files/` response bodies for all 3 demo services (see WireMock Mapping Files section). Weather API: 2 mappings; Payments Gateway: 2 mappings; User Profile Service: 2 mappings |
| 3 | **Create demo startup script** | Author `resources/demo-entrypoint.sh`: starts server, waits for `/health`, calls `POST /api/auth/setup` if `needsSetup=true`. Password must be ≥12 chars: `demofishtank1` |
| 4 | **Create demo Dockerfile** | Create `demo.Dockerfile` FROM production image: COPY `resources/demo-mocks/` → `/app/mocks/`, COPY seed file, COPY entrypoint script, set permissions, set `FISHTANK_SEED_FILE`, override ENTRYPOINT |
| 5 | **Validate locally** | Build demo image locally (`docker build -f demo.Dockerfile -t fishtank:demo .`), run `docker run -p 9090:5000 fishtank:demo`, verify 3 services visible, test each mock endpoint responds |
| 6 | **Add CI workflow job** | Add `publish-demo` job to `.github/workflows/release.yml` that builds and pushes `fishtank/fishtank:demo` after the main publish job |
| 7 | **Update README** | Add Quick Demo section: `docker run -p 9090:5000 fishtank/fishtank:demo`, open `http://localhost:9090`, credentials `admin`/`demofishtank1`, security warning |

---

## Definition of Done

- [ ] `resources/demo-seed.json` exists as a flat JSON array with 3 services (correct SeedEntry format)
- [ ] `resources/demo-mocks/` contains WireMock mapping files for all 3 services (2+ mappings + `__files/` responses each)
- [ ] `resources/demo-entrypoint.sh` startup script calls `POST /api/auth/setup` with `admin`/`demofishtank1`
- [ ] `demo.Dockerfile` builds successfully from production image
- [ ] Demo image starts and `GET /health` returns 200
- [ ] `GET /api/services` returns 3 pre-seeded services
- [ ] Each demo service can be started and serves mock responses
- [ ] Demo credentials (`admin`/`demofishtank1`) allow immediate login
- [ ] README.md documents Quick Demo with security warning
- [ ] CI job `publish-demo` added to release workflow
- [ ] Docker Hub shows `fishtank/fishtank:demo` tag (after first release)
- [ ] All P0 tests from test-design-epic-6.md Story 6-3 section pass
- [ ] Code review completed with no blocking findings

---

## Out of Scope

- **Automated seed data refresh** — Demo seed data is static; no scheduled rebuild (documented as future enhancement if needed)
- **Multiple demo profiles** — Only one demo image with a fixed set of services (v1 simplicity)
- **Demo image versioning** — Only `:demo` tag, no `:demo-{version}` variants
- **Customizable demo data** — Users cannot override demo seed data at runtime (they should use production image + their own seed file)
- **Demo-specific UI branding** — Demo uses identical UI to production (no "Demo Mode" banner)
- **Windows container support** — Demo image is Linux-only (same as production)

---

## Test Notes

### Integration Tests (from test-design-epic-6.md)

**P0 (Release Gate):**
- Demo image starts and `/health` returns 200
- Demo image shows 3+ pre-seeded services in `GET /api/services`
- Demo service "Weather API" has functional mapping → `GET /weather/current` returns sample JSON
- Demo credentials documented in README with security warning

**P1 (High):**
- Demo service "Payments Gateway" has functional mapping → `POST /payments/charge` returns confirmation
- Demo image uses same base as production image (Dockerfile inspection)
- Default demo credentials allow login
- Docker Hub tags: `fishtank/fishtank:demo` distinct from `fishtank/fishtank:latest`

**P2 (Medium):**
- Demo image first-run experience: zero configuration required

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| R-E6-005: Demo seed data incomplete | Integration test validates 3+ services with functional mappings |
