---
title: "Product Brief: Fishtank"
status: final
created: 2026-06-02
updated: 2026-06-03
---

# Product Brief: Fishtank

## Executive Summary

**Your application's external dependencies, visible and controllable during development.**

Fishtank is a self-hosted, containerised mock server manager built on WireMock.NET. It ships as a single Docker image — pull it, configure a volume, and you have a fully operational mock infrastructure with a browser-accessible management UI, live request monitoring, and zero dependency on external services or cloud subscriptions.

The core idea: your application talks to external services (a payments API, a social security department API, a logistics provider). Fishtank gives each of those a named service entry — with its own port, real upstream URL, and folder of mapping and response files. One Fishtank container serves all of them. The UI lets you add, edit, and remove those service definitions, manage their mappings, watch their traffic, and promote proxied requests to permanent stubs — all from a browser, without touching a file or making a raw API call. Your existing WireMock JSON mappings work without modification.

**WireMock Cloud is the only tool with comparable capabilities — Fishtank is what you choose when you need that experience self-hosted, with mappings in source control, at zero cost.**

It ships openly on Docker Hub and GitHub for anyone to use, self-host, and contribute to.

**Why now:** Docker-first development has become the default for teams building applications that depend on external services, and the volume of third-party API dependencies per application has grown steadily. The cost of managing mock infrastructure for those dependencies — without a dedicated management layer — has become visible and painful in a way it wasn't three years ago. The tooling market has not kept pace.

---

## The Problem

Teams building microservice architectures spend disproportionate time wrestling with mock infrastructure. The raw tools — WireMock.NET, WireMock OSS, Mockoon — are capable, but they impose steep operational friction:

- **One process per service.** Every mocked dependency requires its own container, its own port management, its own config lifecycle. A team with eight services runs eight mock containers. Orchestrating them is overhead, not work.
- **No management UI when containerised.** Desktop tools like Mockoon lose their entire interface in Docker. WireMock's admin surface is a REST API — useful for scripting, hostile for day-to-day use. Checking what fired, editing a stub, toggling a service: all require curl or a separate Postman collection.
- **Proxy-to-mock transition is manual and frictional.** Running in proxy mode to capture real traffic is the fastest way to build a mock library — but promoting a captured request to a permanent stub requires explicit API calls, manual file authoring, or tool-specific recording workflows. There is no "I see you proxied this twenty times — want to save it?" flow.
- **Config lives in files, nowhere else.** When a mock breaks a pipeline, rolling back means editing JSON files, redeploying, and hoping. There is no runtime toggle, no feature flag, no "disable this stub without touching the file."
- **Environment isolation is manual.** Dev mocks legitimately differ from QA mocks, which differ from staging mocks. There is no first-class concept of environment-scoped configuration — teams improvise with separate directories, separate containers, separate everything.

Developers avoid running mocks locally because setup is painful. QA engineers maintain brittle test environments because changing a mock requires deployment-level coordination. New team members onboard slowly because mock infrastructure is undocumented and tribal.

The pain peaks at a specific moment: a request behaves unexpectedly mid-development or mid-test run — returns the wrong status, the wrong body, or nothing at all. Investigating requires stopping everything, switching to a terminal, and constructing raw admin API calls to interrogate the mock state. The interruption is not the ten seconds it takes to type a curl command; it is the five minutes of lost context it costs to get back to the task. Fishtank eliminates that context switch.

---

## The Solution

Fishtank consolidates mock server management into a single container with three integrated layers:

**1. The mock/proxy engine** — A single WireMock.NET instance managing multiple named service definitions, each on its own port. A *service* in Fishtank represents one real external dependency your application calls — for example, a Finance API on port 8081 and a Social Security API on port 8082. Each service has a name, description, real upstream URL (for proxy mode), assigned port, and a dedicated folder of mapping and response files. Fishtank matches incoming requests against the service's mappings and returns mock responses; it proxies unmatched requests transparently to the configured upstream. Each service runs with a fault boundary — a crash or restart of one service does not affect others. WireMock.NET is the v1 engine; the internal architecture does not foreclose substitution with an alternative engine in future versions. Fishtank uses the standard WireMock mapping format — the same JSON structure used by WireMock Java and WireMock Cloud; existing WireMock mappings work in Fishtank without modification.

> **⚠️ Architectural gate:** Multi-service in-process management must be validated via a proof-of-concept spike before v1 scope is locked. If WireMock.NET requires separate OS processes per service instance, the architecture requires redesign. This spike is the highest-priority pre-implementation task.

**2. The management UI** — A React/TypeScript single-page application served directly from the container at a configurable port. The complete management surface — services, mappings, request activity, users, settings — is accessible from any browser without touching a file or making a raw API call.

**3. The persistence layer** — A SQLite database (volume-mounted, portable) storing services configuration, users, auth tokens, network activity logs, audit trail, and system events. SQLite is the right v1 choice: zero-dependency, portable, and trivially backed up. It is a known scaling constraint — multiple Fishtank instances cannot share one SQLite file. A pluggable persistence layer (supporting Postgres or equivalent) is a post-v1 architectural goal for teams requiring horizontal scaling or high-availability deployments. Mapping and response files remain on the filesystem — volume-mounted from the end user's project — keeping them in source control where they belong, while the database handles all dynamic state.

The result is a tool that works identically on a developer's laptop and a shared QA environment, configurable via environment variables and a JSON seed file, with service definitions and mappings managed through a UI that writes directly to the volume-mounted filesystem.

**Migration from existing setups** is additive by design: teams with existing WireMock mapping files can point Fishtank at those directories as service folders and immediately manage them through the UI, without rewriting a single mapping file.

---

## What Makes This Different

**No direct OSS or self-hosted competitor.** No existing tool combines a browser-accessible management UI, multi-service management from a single container, proxy-to-mock promotion, and Docker Hub-first distribution *(verified via Docker Hub, GitHub, Product Hunt, and broad web search, June 2026)*. WireMock Cloud is the only tool that matches Fishtank's named service management and browser UI capabilities — Fishtank is what you choose when you need that experience self-hosted, with mappings in source control, at zero cost. The WireMock.NET engine is an implementation detail — the product is the management and orchestration layer, relevant to any team mocking HTTP services regardless of their application stack.

**Why the gap exists.** WireMock's architecture is fundamentally one-process-per-service — building a multi-service manager on top requires non-trivial in-process orchestration. This effort has no obvious commercial return for an independent tool vendor (the market is developers, not procurement teams), which is why no funded product has filled it. The gap is real precisely because it is unglamorous infrastructure work with community, not SaaS, economics.

**One container, all your external service mocks.** Define each external dependency your application calls as a named Fishtank service — Finance API, Social Security API, Payments Gateway. Each gets its own port, its own mapping folder, its own traffic log. All managed from one UI, in one container.

**Mocks live in source control, not a database.** Mock definitions carry no proprietary format and no lock-in. Mapping and response files sit in the user's project, version-controlled alongside the code that depends on them.

**Record mode turns proxy traffic into a mock library.** Enable record mode, exercise the API — every proxied request becomes a permanent mapping file automatically. No API calls, no file authoring.

**Feature toggles are runtime, not deploy-time.** Rolling back a broken feature is a toggle flip in the Admin Console, not a redeployment.

**Zero-config pull-and-run.** `docker pull`, set a volume, optionally seed with a JSON config file — fully operational with no registration, no cloud account, no YAML ceremony.

**The UI is additive, not mandatory.** Every management operation available in the browser is also available via Fishtank's REST API — teams that prefer fully headless, automation-first workflows can script service configuration, trigger resyncs, and query activity logs without opening a browser.

**Standard mapping format, zero lock-in.** Fishtank uses the WireMock JSON mapping format — the same format used by WireMock Java and WireMock Cloud. Existing mappings work without modification. If you ever stop using Fishtank, your mapping files work with any other WireMock-compatible tool.

---

## Who This Serves

**The backend/full-stack developer** runs Fishtank locally alongside their service. Their project's `docker-compose.yml` mounts a `mocks/` folder — the same setup on every machine, in every project. When a dependency changes behaviour, they open the UI, edit the mapping, and resync in seconds. *Adoption moment: starting a new microservice project, or when a broken mock silently fails a pipeline and the team needs runtime visibility fast.*

**The QA/test engineer** deploys Fishtank into dev, QA, staging, and UAT environments. Each environment has its own volume-mounted `mocks/` folder committed to the project repo — environment-specific mocks, deterministic and reproducible. Pipelines consume mocks; the QA engineer controls what's active. *Adoption moment: onboarding to a project where mock infrastructure is undocumented and tribal, or scaling QA coverage across more services than the current setup can manage.*

**The team debugging together.** A developer and a QA engineer are both looking at a failing test. The mock returned something unexpected — but which mock, which mapping, and was it even hit? With Fishtank open in a browser shared between them, the activity log shows the request that fired, the mapping that matched (or didn't), and the response that was returned. The shared UI turns a frustrating guessing game into a thirty-second diagnosis. This collaborative scenario — two people interrogating mock state together in real time — is Fishtank's most compelling use case and the clearest signal that mock infrastructure should be a team-visible, always-on service, not a developer's local curiosity.

Secondary: **open-source contributors** — developers who hit a missing feature and build it. The architecture (React frontend, .NET backend, SQLite, WireMock.NET engine) is accessible to any .NET or TypeScript developer.

---

## Validation

Pre-launch validation signals that the pain is not unique to the team that built Fishtank:

- Teams building applications with multiple external dependencies describe the same workarounds in developer forums and GitHub issues on WireMock and Mockoon repositories: hand-crafted folder structures, curl-based admin scripts, Postman collections for stub management — confirming that the need for a management layer is real and widely felt
- The team that built Fishtank encountered this pain across multiple client projects — applications with three to eight external service dependencies, each requiring its own mock configuration that no tool managed coherently

*Post-launch addition: this section should be updated with external adoption signals — Docker Hub pull milestones, GitHub stars from non-team accounts, and any direct feedback from teams outside the original organisation.*

---

## Core Feature Set (v1)

**Services Management**
- Define services representing real external dependencies: Name, Description, Real upstream URL, Port, Mapping path — stored to DB
- Example: `finance` service on port 8081 proxying `https://api.finance.gov`; `social_security` service on port 8082 proxying `https://api.socialsecurity.gov`
- Service tags: assign one or more free-form tags to services (e.g., `financial`, `identity`, `logistics`) for grouping and filtering in the UI — improves navigation for projects with many external dependencies
- JSON seed file: additive import on startup and on-demand resync; new services imported, existing skipped, conflicts surfaced as warnings
- Enable/disable individual services on the fly (WireMock.NET service restart, container stays up)

**Network Activity**
- Real-time request log per service: method, path, status, response time, mock vs proxied indicator
- Auto-refresh configurable per section (interval in ms, enable/disable)
- Clear activity action
- Click any row to view full request + response detail in a popup
- Activity log retention is capped (configurable max entries per service); oldest entries pruned automatically — the SQLite database does not grow unboundedly
- **Sensitive header redaction:** `Authorization`, `Cookie`, and `Set-Cookie` headers are redacted by default in all activity log entries; an explicit opt-in setting enables capture for debugging purposes — redaction is the secure default, capture is the override

**Mock Suggestions & Recording**
- "Save as Mock" action button on every proxied request row
- Detail popup with Save button — creates mapping + response file on disk
- Record mode toggle — auto-promotes all proxied requests to mappings as they arrive

**Mappings & Responses Management**
- Browse mappings per service in the UI
- Create, edit, delete mappings via UI — written immediately to volume-mounted filesystem; edits are intentional filesystem writes and will appear as uncommitted changes in the project repo — this is by design: mapping changes made via the UI are meant to be reviewed and committed like any other project file
- "Resync Mappings" button — reloads files from disk into UI + restarts WireMock.NET process; target resync time is sub-second for typical mapping sets; a progress indicator is shown for larger sets to confirm the operation is in flight
- Pipeline reset API: a `POST /admin/reset` endpoint clears runtime state (activity log, in-memory counters) and reloads mappings from disk without restarting the container — intended for CI/CD pipelines that need a clean mock state between test runs; this endpoint requires a valid API key (configurable via env var) so it cannot be called by unauthenticated processes that can reach the Fishtank port

**Warnings & Errors Tab**
- Prominent dedicated tab surfacing: config file conflicts, import mismatches, failed mock loads, restart failures, and any system-level error
- Engine crash events include the root cause (stack trace excerpt and offending mapping file path where determinable) — a crashed service is never surfaced as merely "stopped" without a reason
- Startup checks surface immediately: if the configured mocks volume path is not readable/writable at startup, or if the SQLite database is inaccessible, a warning entry is created before any service attempts to start
- All filesystem write operations (save mapping, save response, record-mode captures) confirm success or failure explicitly in the UI — optimistic updates that mask write failures are not permitted; a failed write produces an immediate Warnings tab entry
- Badge/indicator in navigation to draw attention when unread warnings exist

**Global Settings**
- Path settings (MappingsPath, ResponsesPath, ServicesPath)
- Dark / light mode
- Auto-refresh settings per section
- Response headers configuration (which headers to capture and store)
- Feature toggle management

**Authentication & Users**
- Username + password login; JWT token persisted in browser — valid until container restart by default; token expiry is configurable via environment variable for security-sensitive or regulated deployments that require shorter session lifetimes; in shared environments (QA, staging) a container restart will log out all active sessions simultaneously — operators should schedule restarts outside active test runs and document this behaviour in the deployment guide
- **Auto-registration is OFF by default** — the first visit to a fresh Fishtank instance prompts for admin account setup only; auto-registration (allowing any new username to self-create an account) is an explicit opt-in via env var or Admin Console toggle, not the default
- Auto-registration toggle available in Admin Console for invite-only or open-registration modes once enabled
- Default admin account (`admin`); password configurable via env var at deploy time; if unset, forced password change is required on first login before any access
- Admin Console: user management, feature toggles, system metrics, health dashboard, audit log viewer, warnings viewer

**Feature Toggles**
- All features ON by default in every release
- Stored in DB; each feature overridable via env var at deploy time
- Togglable at runtime via Admin Console without restart

**Deployment & Distribution**
- Single Docker image on Docker Hub; GitHub repository with automated release pipeline
- Volume mounts: project mocks folder (service subdirectories containing mappings and responses) and Fishtank data directory (database, logs)
- Optional JSON config seed file for service bootstrapping; the seed file also serves as a recovery mechanism — a team that keeps their seed file in source control can restore full service configuration after a database corruption event by restarting the container with the seed file present
- All runtime behaviour configurable via environment variables
- **Persistence:** SQLite (zero-dependency, single file, works out of the box); volume-mounted for portability and backup; Postgres support via `DATABASE_URL` is a post-v1 addition
- SQLite single-instance constraint: the Fishtank data volume must not be shared across multiple running Fishtank containers simultaneously; Postgres support (post-v1) will address multi-instance deployments
- Structured logging to console and rolling daily log files
- Validated on Linux, macOS (Apple Silicon and Intel), and Windows via Docker Desktop; host-networking differences and volume permission quirks documented in the README
- Cross-platform CI smoke test runs on every release: automated `docker run` validation on Linux, macOS, and Windows runners confirms the image starts, serves the UI, and accepts a basic request before any release is published
- Kubernetes-compatible: the Docker image deploys as a standard K8s workload; a reference `deployment.yaml` manifest ships in the repository for teams running shared K8s environments (QA, staging)
- `docker-compose.example.yml` ships in the repository root: a complete, copy-pasteable setup with both required volume mounts, all common environment variables with inline comments, and a seed file reference
- `/health` readiness endpoint: returns HTTP 200 when the container is fully initialised and all configured services are running — usable as a Docker Compose healthcheck and a Kubernetes readiness probe; returns HTTP 503 with a structured error body if the database is inaccessible or the mocks volume is unreadable
- SQLite single-instance constraint: the Fishtank data volume must not be shared across multiple running Fishtank containers simultaneously; Postgres support (post-v1) will address multi-instance deployments
- **Container security:** the Fishtank image runs as a non-root user; the UID is documented so operators can set correct volume mount permissions without running as root
- **Seed file:** the JSON seed file path should be mounted read-only at runtime (`ro` flag in compose/K8s); Fishtank reads it at startup only and must not write to it; this prevents volume-permission-based injection of attacker-controlled service definitions
- **TLS / HTTPS:** Fishtank v1 serves plain HTTP; TLS termination is the responsibility of a reverse proxy (nginx, Traefik, Caddy) placed in front of Fishtank for any non-localhost deployment. *[Spike: evaluate built-in TLS support or a recommended Traefik sidecar pattern for v2; document the reverse-proxy deployment pattern in README at v1 launch.]*
- **CORS:** the backend API is configured with a strict CORS policy — only the origin serving the bundled React UI is permitted by default; cross-origin access requires explicit `ALLOWED_ORIGINS` env var configuration
- **Rate limiting:** the login endpoint is rate-limited to prevent brute-force credential attacks; limit and window are configurable via env var

---

## Out of Scope for v1
- Cloud-hosted or multi-tenant SaaS version
- AI-powered mock inference (suggestions are deterministic capture, not ML-generated)
- OpenAPI/Swagger import for mock generation
- Role-based access control beyond admin vs. standard user
- GraphQL or gRPC mock support (HTTP/REST only for v1)
- Mobile-optimised UI (desktop browser primary)
- Plugin/extension system
- Helm chart for Kubernetes deployment (a reference `deployment.yaml` ships; a full Helm chart is a post-v1 community contribution)
- Cross-repository mock synchronisation: each Fishtank instance manages mocks for one project's volume; coordinating mock changes across multiple repos is a post-v1 feature
- Pluggable persistence beyond SQLite: Postgres support via `DATABASE_URL` is a post-v1 addition; additional database backends are a post-v1 community contribution

---

## Success Criteria

1. The team that built Fishtank uses it daily across all projects — raw WireMock.NET JSON config files are no longer authored by hand
2. At least 3 development teams outside the original organisation are actively using Fishtank in a project within 6 months of launch — evidenced by Docker Hub pulls from non-team accounts, GitHub stars, or direct community reports
3. External contributors open PRs on GitHub — features are built by people who don't work on the original team
4. The zero-config Docker pull-and-run experience works without reading documentation — a developer who has never heard of Fishtank can be operational within five minutes on Linux, macOS (including Apple Silicon), and Windows with Docker Desktop; known host-networking edge cases are documented; first-run volume and port errors produce human-readable messages with a documented fix, not a stack trace
5. A public demo — at minimum an animated GIF or short screen recording of the management UI — appears at the top of the v1 README (immediately after the one-line description, before any prose), and on the landing page; prospective users can evaluate the UI within 10 seconds of opening the repository without pulling the image
6. The GitHub repository is contributor-ready at launch: a `CONTRIBUTING.md` covering architecture overview, local dev setup, and PR workflow; a curated backlog of `good first issue` tickets; a defined 48-hour acknowledgement SLA for all new issues and PRs (an auto-responder or issue template serves as a backstop for off-hours coverage); a `SECURITY.md` defining the vulnerability reporting and responsible disclosure process
7. The management UI ships with a consistent design system or component library applied throughout; no placeholder text, no unlabelled icon-only buttons, and all destructive actions require a confirmation dialog — UI polish is a v1 exit criterion, not a post-launch backlog item
8. All public-facing touchpoints at launch (README headline, Docker Hub description, GitHub repository About, launch posts) lead with "mock server management" — not ".NET" or "WireMock.NET"; the engine is referenced in the architecture section only

---

## Vision

In two to three years, Fishtank is the default answer to “how do we mock our external service dependencies?” for any team building applications that rely on third-party or internal APIs — the same way Postman became the default answer for “how do we test our APIs?” It is not just a tool individuals use; it is what teams commit to `docker-compose.yml` in project templates, reference in onboarding docs, and fork as the base for internal platform tooling.

**Post-v1 direction:** a thriving open-source community produces integrations — OpenAPI import, contract testing hooks, CI/CD pipeline plugins, a Helm chart for first-class Kubernetes deployment — and Fishtank becomes the observable proxy layer that teams rely on to understand how their services communicate across the microservice lifecycle.

**Sustainability model.** Fishtank is community OSS — no SaaS tier, no paid features, no VC backing. Sustainability comes from community ownership: the more teams adopt it, the more contributors appear, and the less the maintenance burden falls on the original team. A managed/hosted tier is not ruled out post-v1 if community demand and contributor capacity make it viable, but it is not a design constraint on v1. The Postman comparison is an aspiration for reach and ubiquity, not a revenue blueprint. If the original maintainer team steps back, the MIT licence and simple architecture ensure any team can fork, continue, and redistribute without friction — the tool does not become inoperable when maintenance lapses.

**Competitive moat.** First-mover advantage in OSS accretes quickly: the dominant tool in a niche accumulates the Stack Overflow answers, the blog posts, the `docker-compose.yml` templates, and the contributor muscle memory. Fishtank's moat is the ecosystem that forms around it — integrations, community mappings libraries, CI plugin ecosystem — not the code itself, which any sufficiently motivated team could replicate. The goal is to become the obvious default before a better-funded alternative notices the gap.

---

## Community & Contributor Strategy

OSS adoption is an active investment, not a consequence of quality. Fishtank's community baseline at v1 launch:

- **Contributor onboarding:** `CONTRIBUTING.md` covers architecture in ≤ 10 minutes — tech stack, project structure, how to run locally, and how to open a PR; a containerised local dev setup (devcontainer or compose-based) allows TypeScript/frontend contributors to run the full stack without installing the .NET SDK locally
- **API contract:** The backend exposes a documented internal REST API; an OpenAPI spec ships with the repository so frontend-only contributors can understand and extend the API boundary without reading .NET source code
- **Issue hygiene:** All reported bugs triaged within 48 hours; a curated `good first issue` backlog maintained from day one
- **Discussion channel:** GitHub Discussions enabled at launch; a Discord server opened once the community reaches a natural inflection point rather than prematurely
- **Maintainer commitment:** At least one maintainer monitors GitHub notifications daily during the first six months post-launch; a minimum of one patch release per month is published for the first six months — even if only dependency updates or doc fixes — to keep the commit graph active and signal that the project is alive
- **Switching cost acknowledgement:** Documentation includes an explicit migration guide for teams replacing multi-container WireMock compose setups — lowers the single biggest adoption barrier
- **Launch marketing:** v1 launch includes coordinated posts to r/dotnet, r/devops, Hacker News (Show HN), and at least one relevant newsletter (e.g., .NET Weekly, DevOps Weekly); a dev.to or equivalent long-form post covering the problem and solution ships alongside the Docker Hub release
- **Governance model:** Fishtank is maintainer-governed: the original team holds merge authority and maintains a public roadmap in GitHub Projects; contributors are encouraged to open an issue or discussion before investing in a large PR to align with the roadmap and avoid wasted effort; there is no formal RFC process for v1 — a discussion thread is sufficient
- **Licence and CLA:** Fishtank is released under the MIT licence — permissive, commercial-friendly, and maximally accessible to contributors and integrators; all contributors are required to sign a Contributor Licence Agreement (CLA) before their first PR is merged, preserving the project's ability to relicence or pursue commercial arrangements in future without legal ambiguity
- **Demo image:** a `fishtank-demo` tag on Docker Hub ships pre-seeded with realistic example services (a weather API, a payments gateway, a user profile service); zero configuration required — `docker run` and open the browser to see Fishtank fully operational with sample data; intended for developer training, API integration workshops, and first-time evaluators who want to explore the UI before committing to a project setup
