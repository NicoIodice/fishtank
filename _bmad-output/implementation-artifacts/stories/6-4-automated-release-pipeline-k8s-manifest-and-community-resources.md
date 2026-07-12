---
story_key: 6-4-automated-release-pipeline-k8s-manifest-and-community-resources
epic_id: epic-6
title: Automated Release Pipeline, K8s Manifest & Community Resources
status: review
created: 2026-07-12
release: v1.0.0
branch: feature/6-4-automated-release-pipeline-k8s-manifest-and-community-resources
frs: [FR-34, FR-40, FR-41]
nfrs: [NFR-6, NFR-12]
risk_links: [R-E6-004, R-E6-006]
test_design: _bmad-output/test-artifacts/test-design/test-design-epic-6.md
dependencies:
  - 6-1-pipeline-reset-endpoint (done)
  - 6-2-openapi-spec-and-management-api-parity-verification (done)
  - 6-3-fishtank-demo-pre-seeded-docker-image (done)
completed: 2026-07-15
---

# Story 6-4: Automated Release Pipeline, K8s Manifest & Community Resources

## User Story

**As an** open-source contributor, operator, or first-time user,
**I want** Fishtank to have a complete release pipeline, Kubernetes reference manifest, and comprehensive community resources,
**So that** the project is easy to adopt, deploy in any environment, and contribute to.

---

## Acceptance Criteria

### AC-1: Release Workflow Trigger

**Given** a git tag matching `v*.*.*` is pushed to the repository,
**When** the release CI workflow runs,
**Then** it is triggered automatically by GitHub Actions on tag push (FR-34).

### AC-2: Release Workflow Pipeline Steps

**Given** the release CI workflow,
**When** it executes,
**Then** it runs the following steps in order (FR-34):
1. Checkout code
2. Build backend (dotnet build)
3. Run backend unit tests (dotnet test Fishtank.Api.UnitTests)
4. Run backend integration tests (dotnet test Fishtank.Api.IntegrationTests)
5. Build frontend (npm run build in src/client)
6. Run frontend unit tests (npm test in src/client)
7. Build Docker image with version tag from the git tag
8. Cross-platform smoke tests (AC-3 through AC-6)
9. Publish to Docker Hub (AC-7)

### AC-3: Linux Smoke Test

**Given** the release CI workflow,
**When** the Linux runner step executes,
**Then** it runs `docker run` with the built image and `GET /health` returns HTTP 200 (FR-40, R-E6-004).

### AC-4: macOS Apple Silicon Smoke Test

**Given** the release CI workflow,
**When** the macOS Apple Silicon (arm64) runner step executes,
**Then** it runs `docker run` with the built image and `GET /health` returns HTTP 200 (FR-40, R-E6-004).

### AC-5: macOS Intel Smoke Test

**Given** the release CI workflow,
**When** the macOS Intel (x64) runner step executes,
**Then** it runs `docker run` with the built image and `GET /health` returns HTTP 200 (FR-40, R-E6-004).

### AC-6: Windows Smoke Test

**Given** the release CI workflow,
**When** the Windows runner step executes,
**Then** it runs `docker run` with the built image and `GET /health` returns HTTP 200 (FR-40, R-E6-004).

### AC-7: Docker Hub Publish

**Given** all smoke tests pass,
**When** the Docker Hub publish step executes,
**Then** the following tags are published to `nicoiodice/fishtank` (FR-34):
- `nicoiodice/fishtank:latest` — updated to point to the new release
- `nicoiodice/fishtank:{version}` — versioned tag matching the git tag (e.g., `v1.0.0`)

### AC-8: Kubernetes Manifest File

**Given** `deployment.yaml` in the repository root,
**Then** it is a valid Kubernetes Deployment + Service manifest that passes `kubectl apply --dry-run=client` validation (FR-41, R-E6-006).

### AC-9: Kubernetes Readiness Probe

**Given** `deployment.yaml`,
**Then** it includes a readiness probe configuration pointing to `GET /health` (FR-41, R-E6-006).

### AC-10: Kubernetes Documented Placeholders

**Given** `deployment.yaml`,
**Then** it contains clearly documented placeholders for (FR-41):
- Image tag (e.g., `image: nicoiodice/fishtank:v1.0.0`)
- Volume mounts for `/data` (SQLite database) and `/mocks` (WireMock mappings)
- Environment variables from FR-36 (at minimum: `FISHTANK_JWT_SECRET`, `FISHTANK_MOCKS_ROOT`)

### AC-11: CONTRIBUTING.md Content

**Given** `CONTRIBUTING.md` in the repository root,
**Then** it contains (FR-34):
- Architecture overview readable in ≤10 minutes
- Tech stack description (.NET 10, React 19, TypeScript, Vite, Tailwind, WireMock.NET)
- Project structure walkthrough
- Local dev setup instructions (manual and devcontainer option)
- PR workflow (feature branches → release branch → main)
- Link to SECURITY.md for vulnerability reporting

### AC-12: SECURITY.md Content

**Given** `SECURITY.md` in the repository root,
**Then** it contains (FR-34):
- Vulnerability reporting process (email or GitHub Security Advisories)
- Responsible disclosure policy with timeline expectations
- Supported versions table (which versions receive security updates)

### AC-13: Good First Issues

**Given** GitHub Issues at v1 launch,
**Then** at least 5 issues are labeled `good first issue` with (FR-34):
- Clear title and description
- Defined scope (small, focused changes)
- Explicit acceptance criteria
- Labels: `good first issue` + relevant area label (frontend/backend/docs)

### AC-14: README.md Updates

**Given** `README.md` in the repository root,
**Then** it contains (FR-34):
- Animated GIF or screen recording of core workflows at the top
- Quick-start command: `docker run -p 9090:5000 -v fishtank-data:/data nicoiodice/fishtank`
- Environment variable reference table (all FR-36 variables)
- Links to `CONTRIBUTING.md`, `SECURITY.md`, and `/openapi/v1.json`
- Linux `fs.inotify.max_user_watches` note with `sysctl` command

### AC-15: DevContainer Configuration

**Given** `.devcontainer/` directory in the repository,
**Then** it provides a working devcontainer configuration that allows:
- Frontend-only contributors to run the dev environment without .NET SDK installed locally
- The devcontainer includes: Node.js 22, .NET SDK 10.0, Docker CLI
- `postCreateCommand` runs `npm install` and `dotnet restore`

---

## Implementation Tasks

### Task 1: Create Release Workflow (`.github/workflows/release.yml`)

Create a new GitHub Actions workflow triggered by tag push:

```yaml
name: Release
on:
  push:
    tags:
      - 'v*.*.*'
```

**Steps to implement:**
1. Extract version from git tag (`GITHUB_REF_NAME`)
2. Checkout code
3. Setup .NET 10 SDK
4. Setup Node.js 22
5. Run `dotnet restore` and `dotnet build src/Fishtank.slnx`
6. Run `dotnet test src/Fishtank.Api.UnitTests`
7. Run `dotnet test src/Fishtank.Api.IntegrationTests`
8. Install npm dependencies and run `npm run build` in `src/client`
9. Run `npm test` in `src/client`
10. Build multi-arch Docker image: `linux/amd64,linux/arm64`
11. Push to GitHub Container Registry (for cross-platform smoke tests)

### Task 2: Implement Cross-Platform Smoke Tests

Add a matrix strategy for smoke tests across 4 runner types:

```yaml
smoke-test:
  needs: build
  strategy:
    matrix:
      include:
        - os: ubuntu-latest
          name: Linux
        - os: macos-latest
          name: macOS-ARM64
        - os: macos-13
          name: macOS-Intel
        - os: windows-latest
          name: Windows
```

Each job:
1. Pull the image from GHCR (built in previous step)
2. Run `docker run -d -p 5000:5000 --name fishtank-test <image>`
3. Wait for container health (retry `curl http://localhost:5000/health` up to 30s)
4. Assert HTTP 200 response
5. Stop and remove container

**Note:** macOS and Windows runners use Docker Desktop. The existing production image is `linux/amd64` but runs via emulation on Apple Silicon. If native ARM support is needed, ensure the build step creates a multi-arch manifest.

### Task 3: Docker Hub Publish Step

Add Docker Hub publish after all smoke tests pass:

```yaml
publish:
  needs: smoke-test
  if: success()
  runs-on: ubuntu-latest
  steps:
    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Push to Docker Hub
      run: |
        docker tag <image> nicoiodice/fishtank:${{ github.ref_name }}
        docker tag <image> nicoiodice/fishtank:latest
        docker push nicoiodice/fishtank:${{ github.ref_name }}
        docker push nicoiodice/fishtank:latest
```

**Secrets required:**
- `DOCKERHUB_USERNAME` — Docker Hub username
- `DOCKERHUB_TOKEN` — Docker Hub access token (not password)

### Task 4: Create Kubernetes Manifest (`deployment.yaml`)

Create `deployment.yaml` in repository root with:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fishtank
  labels:
    app: fishtank
spec:
  replicas: 1
  selector:
    matchLabels:
      app: fishtank
  template:
    metadata:
      labels:
        app: fishtank
    spec:
      containers:
        - name: fishtank
          image: nicoiodice/fishtank:v1.0.0  # <-- UPDATE VERSION TAG
          ports:
            - containerPort: 5000
          env:
            - name: FISHTANK_JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: fishtank-secrets
                  key: jwt-secret
            - name: FISHTANK_MOCKS_ROOT
              value: /mocks
          volumeMounts:
            - name: data
              mountPath: /data
            - name: mocks
              mountPath: /mocks
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 20
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: fishtank-data-pvc  # <-- CREATE PVC
        - name: mocks
          persistentVolumeClaim:
            claimName: fishtank-mocks-pvc  # <-- CREATE PVC
---
apiVersion: v1
kind: Service
metadata:
  name: fishtank
spec:
  selector:
    app: fishtank
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: ClusterIP
```

Include YAML comments documenting:
- How to create the required Kubernetes Secret
- PVC requirements for data and mocks volumes
- Optional: Ingress configuration example

### Task 5: Update CONTRIBUTING.md

Ensure CONTRIBUTING.md contains (already partially exists):

1. **Architecture Overview** (~10 minute read)
   - High-level diagram or description
   - Backend: C# 13, .NET 10, ASP.NET Core Minimal APIs, SignalR, EF Core + SQLite
   - Frontend: React 19, TypeScript, Vite 8, Tailwind CSS v4, shadcn/ui
   - Mock engine: WireMock.NET 2.x

2. **Project Structure** — describe `src/` layout

3. **Local Dev Setup**
   - Option 1: DevContainer (recommended)
   - Option 2: Manual (.NET 10 SDK, Node.js 22, Docker)

4. **Running Tests** — backend unit, integration, frontend, E2E

5. **PR Workflow**
   - Feature branches from release branch
   - PR naming conventions
   - CI checks must pass

6. **CHANGELOG Guidelines** — what to include/exclude

### Task 6: Create/Update SECURITY.md

Create or update `SECURITY.md` with:

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities via GitHub Security Advisories:
https://github.com/nicoiodice/fishtank/security/advisories/new

Alternatively, email security concerns to: [security email]

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: Next release

### Disclosure Policy

We follow responsible disclosure:
1. Reporter notifies maintainer privately
2. Maintainer confirms and assesses impact
3. Fix is developed and tested
4. Fix is released with security advisory
5. Public disclosure after patch is available
```

### Task 7: Create Good First Issues (5+)

Create 5+ GitHub Issues with `good first issue` label. Suggestions:

1. **[Docs] Add API endpoint examples to OpenAPI descriptions**
   - Scope: Update `docs/openapi.json` with `example` fields
   - Labels: `good first issue`, `documentation`

2. **[Frontend] Add loading skeleton to Services page**
   - Scope: Replace spinner with skeleton cards during load
   - Labels: `good first issue`, `frontend`, `enhancement`

3. **[Frontend] Add keyboard shortcut for global search**
   - Scope: Ctrl+K opens search (similar to VS Code)
   - Labels: `good first issue`, `frontend`, `enhancement`

4. **[Backend] Add request body size to activity log**
   - Scope: Include `contentLength` field in activity rows
   - Labels: `good first issue`, `backend`, `enhancement`

5. **[Docs] Document all error codes in README**
   - Scope: Create error code reference table
   - Labels: `good first issue`, `documentation`

### Task 8: Update README.md

Add/update the following sections:

1. **Hero Section** — animated GIF at top (use `resources/demo.gif` or screen recording)

2. **Quick Start**
   ```bash
   docker run -d -p 9090:5000 \
     -v fishtank-data:/data \
     -v $(pwd)/mocks:/mocks \
     -e FISHTANK_JWT_SECRET=your-secret-key-32-chars-minimum \
     nicoiodice/fishtank:latest
   ```

3. **Environment Variables Table** — all FR-36 vars with defaults

4. **Documentation Links**
   - API Reference: `/openapi/v1.json`
   - Contributing: `CONTRIBUTING.md`
   - Security: `SECURITY.md`

5. **Linux Configuration Note**
   ```markdown
   ### Linux Host Configuration
   
   If running many services (50+), increase the inotify watch limit:
   
   ```bash
   # Temporary (until reboot)
   sudo sysctl fs.inotify.max_user_watches=65536
   
   # Permanent (create file)
   echo "fs.inotify.max_user_watches=65536" | sudo tee /etc/sysctl.d/99-fishtank.conf
   sudo sysctl --system
   ```
   ```

### Task 9: Create DevContainer Configuration

Create/update `.devcontainer/devcontainer.json`:

```json
{
  "name": "Fishtank Dev",
  "image": "mcr.microsoft.com/devcontainers/dotnet:1-8.0",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "22"
    },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "postCreateCommand": "cd src/client && npm install && cd ../.. && dotnet restore src/Fishtank.slnx",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-dotnettools.csdevkit",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss"
      ]
    }
  },
  "forwardPorts": [5000, 5173],
  "remoteUser": "vscode"
}
```

**Note:** The base image may need to be updated to .NET 10 when a devcontainer image is available. Use `mcr.microsoft.com/devcontainers/dotnet:1-10.0` when released.

---

## Dev Notes

### Existing CI Infrastructure

The repository already has:
- `.github/workflows/test.yml` — runs on PR/push, executes tests
- `.github/workflows/docker.yml` — builds and tests Docker image

The release workflow (`release.yml`) should be a NEW file that triggers only on tag push. It can reuse patterns from the existing workflows.

### Multi-Architecture Build Consideration

The current Dockerfile builds `linux/amd64` only. For macOS Apple Silicon native support:
- Use `docker buildx build --platform linux/amd64,linux/arm64`
- Push a manifest list to Docker Hub
- Smoke tests will pull the appropriate architecture

If native ARM builds are problematic (some .NET native dependencies may not build on ARM), document that Apple Silicon runs via Rosetta emulation.

### Secrets Configuration

Required GitHub Secrets for release workflow:
- `DOCKERHUB_USERNAME` — Docker Hub username (already exists if docker.yml is working)
- `DOCKERHUB_TOKEN` — Docker Hub access token

### Cross-Platform Runner Notes

- **Linux (ubuntu-latest)**: Standard Docker, no issues expected
- **macOS ARM (macos-latest)**: Uses Docker Desktop, may need `--platform linux/amd64` flag
- **macOS Intel (macos-13)**: Uses Docker Desktop, native x64
- **Windows (windows-latest)**: Uses Docker Desktop with Linux containers mode

### Kubernetes Manifest Validation

Before merging, validate the manifest locally:
```bash
kubectl apply -f deployment.yaml --dry-run=client
```

Or use `kubectl-validate` tool for schema validation.

### README Demo GIF

Options for creating the demo recording:
1. Use `asciinema` + `svg-term-cli` for terminal-based demo
2. Use screen recording software (OBS, Kap) for UI walkthrough
3. Place output in `resources/demo.gif` and reference from README

---

## Dependencies

| Story | Status | Dependency Type |
|-------|--------|-----------------|
| 6-1-pipeline-reset-endpoint | done | Prerequisite — pipeline reset endpoint used in CI |
| 6-2-openapi-spec-and-management-api-parity-verification | done | Prerequisite — OpenAPI spec must be complete |
| 6-3-fishtank-demo-pre-seeded-docker-image | done | Prerequisite — demo image referenced in release pipeline |

---

## Test References

See [test-design-epic-6.md](../../test-artifacts/test-design/test-design-epic-6.md) section "Story 6-4: Automated Release Pipeline, K8s Manifest & Community Resources" for complete test scenarios.

### Priority Test Summary

| Priority | Test Count | Focus Areas |
|----------|------------|-------------|
| P0 | 5 | Release trigger, Linux smoke, Docker Hub publish, K8s manifest validation, CONTRIBUTING.md |
| P1 | 9 | Cross-platform smoke tests (3), K8s readiness probe, README content, SECURITY.md, good first issues |
| P2 | 3 | Devcontainer, full release E2E, K8s deployment E2E |

---

## Definition of Done Checklist

- [ ] All acceptance criteria (AC-1 through AC-15) pass verification
- [ ] Release workflow triggers on tag push and completes successfully
- [ ] All 4 cross-platform smoke tests pass (Linux, macOS ARM, macOS Intel, Windows)
- [ ] Docker Hub images published with version and latest tags
- [ ] `deployment.yaml` passes `kubectl apply --dry-run=client` validation
- [ ] `CONTRIBUTING.md` contains all required sections
- [ ] `SECURITY.md` contains vulnerability reporting process
- [ ] 5+ GitHub Issues labeled `good first issue`
- [ ] `README.md` updated with quick-start, env var table, and Linux inotify note
- [ ] `.devcontainer/` provides working dev environment
- [ ] Story status updated to `done` in `sprint-status.yaml`
- [ ] Epic 6 status updated to `done` in `sprint-status.yaml` (this is the last story)
