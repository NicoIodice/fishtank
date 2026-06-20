# Changelog

All notable changes to Fishtank are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versions follow [Semantic Versioning](https://semver.org/).

> For automated release notes (grouped by PR type), see the
> [GitHub Releases](https://github.com/NicoIodice/fishtank/releases) page.

---

## [Unreleased] — v0.1.0 (Foundation)

_Theme: Pull the image, log in, confirm the container is healthy._

### Added

- **Docker image** — multi-stage Alpine build (`node:22-alpine` → `sdk:10.0-alpine` → `aspnet:10.0-alpine`); non-root `fishtank` user; published to Docker Hub as `nicoiodice/fishtank` (`story/1-1`)
- **`GET /health`** — returns HTTP 200 `Healthy`; excluded from SPA fallback; usable as Docker Compose healthcheck and Kubernetes readiness probe (`story/1-1`)
- **SPA fallback** — React shell served at `/`; `/api/**`, `/hubs/**`, `/openapi/**`, `/health` routes excluded from fallback to prevent masking backend errors (`story/1-1`)
- **CI pipeline** — GitHub Actions `test.yml`: lint, unit tests, integration tests; `docker.yml`: Docker build + smoke test on `story/**` and `release/**` branches; auto-publish to Docker Hub on PR merge from `release/v*.*.*` to `main` (`story/1-1`)
- **DevContainer** — `.devcontainer/devcontainer.json` with .NET 10 + Node 22 + Docker-in-Docker; one-click contributor environment in VS Code (`story/1-1`)
- **`CONTRIBUTING.md`** — architecture overview, local dev setup, test commands, PR workflow, commit conventions (`story/1-1`)
- **`SECURITY.md`** — vulnerability reporting process and scope (`story/1-1`)
- **`docker-compose.yml`** — local development environment using SDK images with hot reload (`story/1-1`)
- **`docker-compose.example.yml`** — end-user deployment reference with all environment variables documented (`story/1-1`)
- **`CHANGELOG.md`** — this file; Keep a Changelog format (`story/1-1`)
- **Release workflow** — `docker.yml` auto-tags on PR merge from `release/v*.*.*` to `main`; creates GitHub Release; no manual `git tag` needed (`chore`)
- **`releases.yaml`** — machine-readable release manifest read/written by BMad lifecycle orchestrator (`chore`)

---

## How to update this file

- **Each story PR** to a release branch should include a CHANGELOG entry under `[Unreleased]`.
- **Each hotfix PR** to `main` should include a `[vX.Y.Z] — YYYY-MM-DD` entry.
- **On release**: move `[Unreleased]` entries to the versioned section (e.g., `[v0.1.0] — 2026-XX-XX`) as part of the final story or the PR to `main`.

### Entry format

```
### Added       — new features
### Changed     — changes to existing functionality
### Deprecated  — features to be removed in a future version
### Removed     — features removed in this version
### Fixed       — bug fixes
### Security    — security fixes (always include CVE/GHSA reference if applicable)
### Dependencies — library/runtime version changes (include old → new)
```

### Linking to stories

Add `(story/X-Y)` at the end of each entry to link it to the originating story. Example:

```markdown
- **Feature name** — description (`story/1-2`)
```
