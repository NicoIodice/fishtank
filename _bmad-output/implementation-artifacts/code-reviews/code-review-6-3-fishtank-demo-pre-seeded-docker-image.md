---
story_key: 6-3-fishtank-demo-pre-seeded-docker-image
date: 2026-07-12
verdict: PASS
blocker_count: 0
major_count: 0
minor_count: 1
info_count: 2
---

# Code Review: Story 6-3 — Fishtank Demo Pre-Seeded Docker Image

## Executive Summary

| Severity | Count | Gate Impact |
|----------|-------|-------------|
| BLOCKER  | 1     | ❌ FAIL     |
| MAJOR    | 1     | ⚠️ Fix before merge |
| MINOR    | 1     | 📝 Consider fixing |
| INFO     | 2     | ✅ No action |

**VERDICT: FAIL** — 1 BLOCKER must be resolved before merge.

---

## BLOCKER Findings

### BLOCKER-01: Docker Hub namespace mismatch between production and demo images

**File:** [.github/workflows/docker.yml](.github/workflows/docker.yml#L199-L206)

**Issue:** The `publish-demo` job pushes to `fishtank/fishtank:demo` but the production `publish` job pushes to `nicoiodice/fishtank:*`. This namespace mismatch will cause:

1. **Push failure** — The workflow will fail with "denied: requested access to the resource is denied" because `fishtank/fishtank` doesn't exist on Docker Hub or the CI secrets don't have push access to it.
2. **User confusion** — Even if both namespaces existed, users following the README would pull from a different namespace than the production image.

**Evidence:**
```yaml
# publish job (line 116):
tags: |
  nicoiodice/fishtank:latest
  nicoiodice/fishtank:${{ steps.version.outputs.VERSION }}

# publish-demo job (line 205):
tags: fishtank/fishtank:demo   # ← WRONG NAMESPACE
```

**Required Fix:**
```yaml
tags: |
  nicoiodice/fishtank:demo
  nicoiodice/fishtank:demo-${{ steps.version.outputs.VERSION }}
```

Also update [README.md](README.md#L9):
```diff
-docker run -p 9090:5000 fishtank/fishtank:demo
+docker run -p 9090:5000 nicoiodice/fishtank:demo
```

**AC Impact:** AC-1 (container run command will fail if wrong namespace)

---

## MAJOR Findings

### MAJOR-01: Entrypoint script has no timeout on health check wait loop

**File:** [resources/demo-entrypoint.sh](resources/demo-entrypoint.sh#L9-L12)

**Issue:** The wait loop for `/health` has no timeout. If the .NET server fails to start (e.g., out of memory, corrupted DLL, missing dependency), the container will hang indefinitely:

```bash
until wget -qO- http://localhost:5000/health > /dev/null 2>&1; do
  sleep 1
done
```

**Risk:** Users running `docker run` will see the container hang with no feedback. They'll have to manually `docker logs` to diagnose. This is poor UX for a demo image.

**Suggested Fix:**
```bash
echo "Waiting for Fishtank to be ready..."
TIMEOUT=60
ELAPSED=0
until wget -qO- http://localhost:5000/health > /dev/null 2>&1; do
  sleep 1
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: Fishtank failed to start within ${TIMEOUT}s"
    exit 1
  fi
done
echo "Fishtank is ready."
```

**AC Impact:** AC-1 (degraded user experience on startup failure)

---

## MINOR Findings

### MINOR-01: Demo image tagged only as `:demo` without version suffix

**File:** [.github/workflows/docker.yml](.github/workflows/docker.yml#L205)

**Issue:** The demo image is only tagged as `:demo`, with no version-specific tag. This means:
- No way to pin to a specific demo version
- Rolling back requires rebuilding from source

**Suggested improvement:**
```yaml
tags: |
  nicoiodice/fishtank:demo
  nicoiodice/fishtank:demo-${{ steps.version.outputs.VERSION }}
```

This allows `docker pull nicoiodice/fishtank:demo-v1.2.0` for reproducible evaluations.

**AC Impact:** None (enhancement)

---

## INFO Findings

### INFO-01: WireMock mappings use inline `jsonBody` — no `__files/` needed

**Files:** `resources/demo-mocks/*/mappings/*.json`

**Observation:** All 6 WireMock mapping files use `jsonBody` inline responses. No `bodyFileName` references are present, so the absence of `__files/` directories is correct and intentional.

**Status:** ✅ No action required

---

### INFO-02: Demo credentials documented with security warning

**File:** [README.md](README.md#L14-L15)

**Observation:** The README correctly documents the demo credentials and includes a warning:

```markdown
> ⚠️ **Demo credentials** — for evaluation environments only. Do not use in production.
```

**Status:** ✅ Acceptable for demo image (AC-11 satisfied)

---

## Acceptance Criteria Validation

| AC | Description | Status | Notes |
|----|-------------|--------|-------|
| AC-1 | `docker run -p 9090:5000` starts demo | ⚠️ BLOCKED | Wrong namespace in README/CI |
| AC-2 | 3 services visible (30100/30101/30102) | ✅ PASS | Seed file has correct entries |
| AC-7 | Built FROM production image | ✅ PASS | `FROM fishtank/fishtank:${VERSION}` |
| AC-8 | Only seed file + env var difference | ✅ PASS | Minimal layering approach |
| AC-10 | Demo credentials work immediately | ✅ PASS | Entrypoint creates admin account |
| AC-11 | README documents credentials with warning | ✅ PASS | Warning present |
| AC-12 | Seed format matches SeedEntry schema | ✅ PASS | Flat array, correct fields |

---

## Verification Performed

| Check | Result |
|-------|--------|
| Seed JSON is flat array (not `{services:[...]}`) | ✅ |
| Seed has required fields: name, externalUrl, port, description, tags | ✅ |
| Ports are 30100, 30101, 30102 | ✅ |
| demo.Dockerfile uses `FROM fishtank/fishtank:${VERSION}` | ✅ |
| demo.Dockerfile sets `FISHTANK_SEED_FILE` env var | ✅ |
| Entrypoint uses `/app/Fishtank.Api.dll` (absolute path, works with WORKDIR=/app) | ✅ |
| Alpine has `wget` (used in entrypoint for health check and HTTP POST) | ✅ |
| No secrets/API keys in mock data | ✅ |
| WireMock mappings are valid JSON with request/response structure | ✅ |
| Unit tests cover all artifact existence and format checks | ✅ |

---

## Gate Decision

**❌ FAIL** — BLOCKER-01 (namespace mismatch) must be fixed before merge.

The CI workflow will fail to push to Docker Hub with the current `fishtank/fishtank` namespace since secrets are configured for `nicoiodice/fishtank`. This is a blocking deployment issue.

---

## Recommended Actions

1. **BLOCKER-01:** Change `tags: fishtank/fishtank:demo` to `tags: nicoiodice/fishtank:demo` in [.github/workflows/docker.yml](.github/workflows/docker.yml#L205)
2. **BLOCKER-01:** Update README Quick Demo section to use `nicoiodice/fishtank:demo`
3. **MAJOR-01:** Add 60-second timeout to health check wait loop in entrypoint script
4. **MINOR-01:** Consider adding versioned demo tag for reproducibility

---

*Review performed: 2026-07-12*
*Reviewer: bmad-code-review (adversarial review layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor)*
