# Addendum — Fishtank PRD

> Items that carry real depth but belong in downstream documents (architecture, solution design, README, CONTRIBUTING.md) or earned a place in the conversation without fitting the PRD's requirements scope. Captured here rather than lost.

---

## A1. Architectural Gate — WireMock.NET Multi-Service In-Process Spike

The single highest-risk item before v1 implementation begins.

**The question:** WireMock.NET's standard usage is one process per service instance. Can a single Fishtank container manage multiple named WireMock instances in-process — each on its own port, with independent fault boundaries — or does each Service require a separate OS process?

**Why it matters:** If separate OS processes are required, the container architecture changes substantially:
- The management layer becomes an orchestrator for child processes, not an in-process host
- The inter-process communication model (API calls to each child process vs. in-process object model) affects the Management API surface, Resync behavior, and fault isolation design
- Container packaging (single image vs. supervisor process model) changes

**Spike outcome required:** A working prototype that starts 3+ WireMock.NET service instances on different ports from a single .NET process, handles a fault in one without affecting the others, and supports dynamic add/remove at runtime — OR clear evidence that this requires separate OS processes and a proposed alternative architecture.

**Spike owner:** engineering lead. **Due:** before any implementation work begins on FR-1 through FR-45.

---

## A2. Persistence Architecture — SQLite v1, Postgres Post-v1

**SQLite rationale for v1:**
- Zero deployment dependency — no separate database process, no connection string ceremony
- Single-file backup: `cp fishtank.db fishtank.db.backup`
- Perfectly suited to the v1 workload: low write concurrency (one user or small team interacting with the UI + occasional CI pipeline calls), moderate read volume, < 100 Services, activity log capped per Service
- Portable: the entire Fishtank state travels with the container volume

**Known SQLite constraint:** the Fishtank data volume must not be shared across multiple simultaneous running Fishtank instances. This is a v1 hard constraint, prominently documented.

**Postgres path (post-v1):**
- Triggered by: teams requiring horizontal scaling, high-availability deployments, or multi-instance shared state
- Implementation approach: a `DATABASE_URL` environment variable pointing to a Postgres connection string; the ORM / data layer is designed from v1 with this substitution in mind
- Not a v1 deliverable; not a v1 design constraint beyond "don't foreclose it"

**SQLite single-instance constraint messaging:**
The README, deployment guide, and `docker-compose.example.yml` must all carry a prominent note: "Do not share the Fishtank data volume across multiple running Fishtank instances simultaneously. For multi-instance deployments, Postgres support is available in post-v1 releases."

---

## A3. WireMock.NET Engine — Implementation Notes

**Engine choice rationale:** WireMock.NET is the v1 engine. The product is the management and orchestration layer — the engine is an implementation detail. The v1 architecture should not foreclose engine substitution in future versions. The management layer's internal abstractions should sit above "WireMock.NET-specific" API surface wherever possible.

**Standard mapping format:** Fishtank uses the standard WireMock JSON mapping format — the same format used by WireMock Java and WireMock Cloud. Existing WireMock mappings work in Fishtank without modification. This is a user-facing guarantee and a lock-in mitigation story.

**BodyAsFile resolution:** `BodyAsFile` is resolved relative to the directory containing the mapping file (i.e., `../responses/` from the `mappings/` subdirectory navigates up to the service root, then into `responses/`). This is WireMock.NET's file-relative resolution mode. Re-verify on WireMock.NET major version upgrades.

**UseTransformer default:** The Mock Suggestion modal defaults `Response.UseTransformer: true` for compatibility with `BodyAsFile` response serving. Teams not using WireMock.NET response templating can uncheck this before saving — it reduces server-side overhead for simple static responses.

---

## A4. TLS / HTTPS Approach

**v1 position:** Fishtank v1 serves plain HTTP. TLS termination is the responsibility of a reverse proxy.

**Recommended reverse proxy patterns for v1 documentation:**
- nginx: standard TLS termination with proxy_pass
- Traefik: automatic HTTPS via Let's Encrypt with Docker labels
- Caddy: zero-config HTTPS for local or public deployments

**v2 spike:** Evaluate built-in TLS support or a recommended Traefik sidecar pattern. Record decision and rationale in the v2 PRD.

**Note for deployment guide:** Fishtank must not be exposed on a public port without a reverse proxy in production. The `docker-compose.example.yml` should include a commented-out Traefik or Caddy sidecar example.

---

## A5. Port Range Rationale (30100–30199)

The 30100–30199 range was chosen to:
- Avoid collision with common development service ports (3000, 5000, 8080, 8443, etc.)
- Provide a predictable, documented range that teams can open in firewall rules as a group
- Limit v1 complexity to 100 Services — a deliberate scope constraint, not a technical limitation

If a use case surfaces that genuinely requires > 100 Services before v2, the Engineering lead should evaluate expanding the range or making it configurable as a point release rather than waiting for v2.

---

## A6. Community & Contributor Strategy

*(Full strategy belongs in README, CONTRIBUTING.md, and GitHub Project — captured here for PRD traceability.)*

**At v1 launch, the repository must ship:**
- `CONTRIBUTING.md`: architecture overview in ≤ 10 minutes, tech stack, project structure, local dev setup (containerised devcontainer or compose-based so frontend contributors don't need the .NET SDK), PR workflow
- `SECURITY.md`: vulnerability reporting and responsible disclosure process
- `good first issue` backlog: curated from day one; minimum 5 issues at launch
- OpenAPI spec: enables frontend-only contributors to work independently of .NET source
- 48-hour issue triage SLA: at least one maintainer monitors GitHub notifications daily for the first six months
- A `fishtank-demo` Docker image (FR-42) for evaluators, training, and workshops

**Governance model:**
- Maintainer-governed: original team holds merge authority and maintains a public roadmap in GitHub Projects
- No formal RFC process for v1 — a GitHub Discussion thread before a large PR is sufficient
- Minimum one patch release per month for the first six months (even dependency updates) to keep the commit graph active

**Licence:** MIT. All contributors sign a CLA before their first PR is merged, preserving the project's ability to relicence or pursue commercial arrangements without legal ambiguity.

**Launch marketing sequence:**
- Coordinated posts to: r/dotnet, r/devops, Hacker News (Show HN), .NET Weekly, DevOps Weekly
- A dev.to or equivalent long-form post covering the problem and solution ships alongside the Docker Hub release
- A public demo (animated GIF or screen recording) at the top of the v1 README, immediately after the one-line description and before any prose

**Discord timing:** Open a Discord server once the community reaches a natural inflection point (meaningful GitHub Discussions activity or > 50 stars from non-team accounts), not at launch.

**Switching cost acknowledgement:** Documentation should include an explicit migration guide for teams replacing multi-container WireMock `docker-compose` setups — this is the single biggest adoption barrier to address.

---

## A7. Seed File JSON Schema (Draft)

The seed file schema is not formally specified in the PRD (Open Question 6). Draft structure for engineering discussion:

```json
{
  "services": [
    {
      "name": "Finance API",
      "description": "Internal finance service mock",
      "externalUrl": "https://api.finance.gov",
      "port": 30101,
      "tags": ["financial", "internal"]
    }
  ]
}
```

**Rules:**
- `name` is the canonical identity for deduplication on additive import (matched by generated slug)
- `externalUrl` is optional — a Service without an External URL cannot proxy unmatched requests but can serve Mappings
- `port` must be in 30100–30199 and must not collide with an existing Service's port on import
- Conflicts generate System Event warnings; the conflicting Service is skipped, not overwritten
- The seed file is read-only from Fishtank's perspective at all times

---

## A8. Rejected / Deferred Alternative Decisions

| Decision | Chosen | Rejected / Deferred | Rationale |
|---|---|---|---|
| Persistence — v1 | SQLite | Postgres | Zero-dependency, portable, single-file; Postgres complexity unjustified at v1 scale |
| Mock engine — v1 | WireMock.NET | Custom engine | WireMock format ubiquity; existing mappings work without modification |
| Distribution | Docker Hub | npm / NuGet / binary | Docker is the natural packaging unit for a multi-process server tool |
| TLS | Reverse proxy (external) | Built-in TLS | Deferred to v2 spike; existing reverse proxy patterns cover v1 use cases |
| Service deletion | Not in v1 | Include in v1 | Port range constraint (100 Services) makes deletion low-urgency; simplifies v1 implementation; targeted v2 |
| Multi-service management | In-process (subject to spike) | Multi-process supervisor | In-process preferred for simplicity; spike required to validate WireMock.NET supports it |
