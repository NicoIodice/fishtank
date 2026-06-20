# Fishtank Roadmap

This roadmap maps each planned release to the feature set it delivers. Releases follow [Semantic Versioning](https://semver.org/). Each minor version corresponds to a completed epic.

A tag push (`git tag v0.2.0 && git push --tags`) triggers:
1. Docker image published to [Docker Hub](https://hub.docker.com/r/nicoiodice/fishtank) as `nicoiodice/fishtank:v0.2.0` and `:latest`
2. GitHub Release created automatically with changelog and quick-start instructions

---

## v0.1.0 — Foundation (Epic 1)

**Theme:** Pull the image, log in, confirm the container is healthy.

| Feature | Description |
|---|---|
| Docker image | Multi-stage Alpine build, non-root user, published to Docker Hub |
| Health endpoint | `GET /health` → 200 Healthy |
| Authentication | Login with username + password; JWT in httpOnly cookie |
| Rate-limited login | Brute-force protection on `POST /api/auth/login` |
| First-run setup | Fresh instance redirects to admin account creation screen |
| App shell | Top bar, collapsible sidebar, responsive layout (4 breakpoints), 4 themes |
| SQLite persistence | EF Core auto-migrate at startup; data volume mounted |
| Structured logging | Serilog JSON stdout + rolling daily files |
| CI pipeline | GitHub Actions: lint, unit tests, integration tests, Docker smoke test |
| DevContainer | `.devcontainer/` for one-click contributor setup |

**Releasable?** Yes — usable as an authenticated empty shell. No mock services yet.

---

## v0.2.0 — Services Management (Epic 2)

**Theme:** Define mock services and have WireMock start serving requests immediately.

| Feature | Description |
|---|---|
| Create / edit services | Name, description, External URL, port (30100–30199 range), tags |
| Enable / disable services | Toggle at runtime without container restart |
| Browse services | Card grid + sortable table; 3→2→1 column responsive |
| Seed file import | Bulk-import services from a JSON file at startup or on-demand |
| WireMock engine | Per-service WireMock.NET instance on dedicated port; isolated fault boundaries |
| System Events | Infrastructure events (port conflicts, startup failures) logged and surfaced in UI |
| Notification bell | Real-time badge for unread warnings/errors via SignalR |
| Service cache | View in-memory cache state per service; clear individual or all |

**Releasable?** Yes — first version where you can actually proxy or mock HTTP traffic.

---

## v0.3.0 — Network Activity (Epic 3)

**Theme:** See every request hitting your mock services in real time.

| Feature | Description |
|---|---|
| Real-time activity log | Every request pushed to UI in <500ms via SignalR |
| Filter and sort | By search query, service, and type (Mocked / Proxied) |
| Row detail | Full request/response in Modal, Right Drawer, or Bottom Panel (user preference) |
| Sensitive header redaction | `Authorization`, `Cookie`, `X-Api-Key`, `secret`/`token` headers redacted by default |
| Auto-refresh | Configurable interval or manual refresh; LIVE/PAUSED indicator |
| Proxy counter pill | Running proxied request count with per-service breakdown |
| Clear log | One-click clear; no confirmation required |
| Virtual scrolling | 10,000+ rows at 60fps |

**Releasable?** Yes — observability story is now complete.

---

## v0.4.0 — Mappings & Mock Capture (Epic 4)

**Theme:** Edit mock files in the browser and record real traffic into permanent stubs.

| Feature | Description |
|---|---|
| File explorer | Folder tree: Mocks Root → service folders → mappings/ → responses/ |
| File CRUD | Create, edit, rename, duplicate, delete Mapping and Response files |
| Dual-mode editor | Form view (guided) + Raw JSON tab (CodeMirror) |
| Resync | Reload all file changes from disk with conflict detection |
| Save proxied request as mock | One-click from activity log or row detail |
| Record mode | Auto-promote all proxied traffic to Mapping + Response files |
| Unsaved change guard | Navigation and sign-out blocked until unsaved edits are resolved |

**Releasable?** Yes — core mock management workflow is now fully usable.

---

## v0.5.0 — Admin Console (Epic 5)

**Theme:** Manage users, control feature availability, and review the audit trail.

| Feature | Description |
|---|---|
| User management | Create, view, deactivate user accounts; instant JWT invalidation on deactivate |
| Feature toggles | Enable/disable any feature at runtime (no restart); broadcast to all active sessions |
| Health dashboard | Active services, request counts, database status, uptime |
| Audit log viewer | Full trail of user-initiated and system-generated actions |
| Auto-registration | Opt-in toggle for self-service account creation |
| Settings: Appearance | Theme selector (all 4 themes); row detail style preference |

**Releasable?** Yes — multi-user and operational control story complete.

---

## v1.0.0 — Release Polish & Distribution (Epic 6)

**Theme:** Production-ready, cross-platform, documented, community-ready.

| Feature | Description |
|---|---|
| OpenAPI spec | Finalized, served at `/openapi/v1.json`, versioned with the app |
| Pipeline reset endpoint | `POST /admin/reset` — clears activity log + reloads mappings (requires API key) |
| Demo Docker image | `nicoiodice/fishtank:demo` — pre-seeded with realistic example services |
| Kubernetes manifest | Reference `deployment.yaml` in repository root |
| Cross-platform CI smoke tests | Linux, macOS (Apple Silicon + Intel), Windows on every release |
| Custom SVG logo | Final logo replacing the `bi-droplet-half` placeholder (pre-ship gate) |
| WCAG 2.1 AA audit | Full contrast audit across all 4 themes (pre-ship gate) |
| README | Animated demo at top, one-command quick-start, full env var reference |
| Good first issue backlog | Minimum 5 curated issues for new contributors |

**Releasable?** Yes — this is the public v1 launch.

---

## Post-v1.0.0 (Backlog)

Ideas tracked for future minor/patch releases after v1.0:

- Multi-instance support (separate SQLite volumes per team)
- Webhook notifications for service status changes
- Fishtank Cloud (managed hosting)
- VS Code extension for inline mock management
- Import/export of full service configurations

---

## How releases work

1. **Develop stories** in `story/**` branches created from the release branch (`release/v0.2.0`).
   CI runs full tests + Docker smoke test on every push.
2. **Merge each story** via PR: `story/**` → `release/v0.2.0`.
   Never merge a story branch directly to `main`.
3. **When all stories are done**, open a PR: `release/v0.2.0` → `main`.
4. **After the PR merges**, GitHub Actions automatically:
   - Extracts the version (`v0.2.0`) from the release branch name
   - Builds the Docker image with `APP_VERSION=v0.2.0`
   - Pushes `nicoiodice/fishtank:v0.2.0` and `:latest` to Docker Hub
   - Creates a GitHub Release with auto-generated changelog
5. **No manual `git tag` needed** — the CI handles tagging.
6. Update `CHANGELOG.md` by moving `[Unreleased]` entries to `[v0.2.0]`.

> **Hotfixes** follow the same pattern using `hotfix/v0.2.1` branches from `main`.

See [docs/ci-secrets-checklist.md](docs/ci-secrets-checklist.md) for the Docker Hub setup required before the first release.
