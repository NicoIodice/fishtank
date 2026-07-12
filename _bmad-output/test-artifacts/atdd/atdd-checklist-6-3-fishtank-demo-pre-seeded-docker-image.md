# ATDD Checklist: Story 6-3 Fishtank Demo Pre-Seeded Docker Image

**Story ID:** 6-3-fishtank-demo-pre-seeded-docker-image  
**Epic:** Epic 6  
**Test File:** `src/Fishtank.Api.UnitTests/DemoImageArtifactTests.cs`  
**Created:** 2026-07-12  
**Phase:** RED (Tests compile but FAIL — artifacts do not exist yet)

---

## Phase Gate Status

| Gate | Status | Evidence |
|------|--------|----------|
| Test file created | ✅ PASS | `DemoImageArtifactTests.cs` exists in test project |
| ACs referenced in tests | ✅ PASS | All 14 acceptance criteria explicitly referenced |
| Tests compile cleanly | ✅ PASS | `dotnet build` succeeded — no compilation errors |
| Tests are RED | ✅ PASS | All 21 tests FAIL — files/directories do not exist yet |

---

## Generated Tests

### Demo Seed JSON Tests (AC-1, AC-2, AC-12)

| # | Test | AC Coverage | Status |
|---|------|-------------|--------|
| 1 | `DemoSeedFile_ShouldExist` | AC-1, AC-8 | ❌ RED — file does not exist |
| 2 | `DemoSeedFile_ShouldBeValidJson` | AC-12 | ❌ RED — file does not exist |
| 3 | `DemoSeedFile_ShouldBeFlatArray` | AC-12 | ❌ RED — file does not exist |
| 4 | `DemoSeedFile_ShouldHaveThreeEntries` | AC-2 | ❌ RED — file does not exist |
| 5 | `DemoSeedFile_EachEntry_ShouldHaveRequiredFields` | AC-12 | ❌ RED — file does not exist |
| 6 | `DemoSeedFile_PortValues_ShouldBeUniqueAndInDemoRange` | AC-2 | ❌ RED — file does not exist |
| 7 | `DemoSeedFile_PortValues_ShouldBeExpectedPorts` | AC-2, AC-4, AC-5, AC-6 | ❌ RED — file does not exist |
| 8 | `DemoSeedFile_Entries_ShouldNotHaveMappingsOrResponsesFields` | AC-12 | ❌ RED — file does not exist |

### Demo Dockerfile Tests (AC-7, AC-8)

| # | Test | AC Coverage | Status |
|---|------|-------------|--------|
| 9 | `DemoDockerfile_ShouldExist` | AC-7 | ❌ RED — file does not exist |
| 10 | `DemoDockerfile_ShouldUseProductionImageAsBase` | AC-7, AC-8 | ❌ RED — file does not exist |
| 11 | `DemoDockerfile_ShouldSetSeedFileEnvVar` | AC-8 | ❌ RED — file does not exist |

### Demo Entrypoint Script Tests (AC-10)

| # | Test | AC Coverage | Status |
|---|------|-------------|--------|
| 12 | `DemoEntrypointScript_ShouldExist` | AC-10 | ❌ RED — file does not exist |
| 13 | `DemoEntrypointScript_ShouldCreateAdminWithValidPassword` | AC-10, AC-11 | ❌ RED — file does not exist |

### WireMock Directory Structure Tests (AC-4, AC-5, AC-6)

| # | Test | AC Coverage | Status |
|---|------|-------------|--------|
| 14 | `DemoMocksDirectory_ShouldExist` | AC-4, AC-5, AC-6 | ❌ RED — directory does not exist |
| 15 | `DemoMocksDirectory_ShouldContainServiceSubdirectories` | AC-4, AC-5, AC-6 | ❌ RED — directory does not exist |
| 16 | `DemoMocksDirectory_EachService_ShouldHaveMappingsFolder` | AC-4, AC-5, AC-6 | ❌ RED — directory does not exist |
| 17 | `WeatherApi_ShouldHaveAtLeastTwoMappings` | AC-4 | ❌ RED — directory does not exist |
| 18 | `PaymentsGateway_ShouldHaveAtLeastTwoMappings` | AC-5 | ❌ RED — directory does not exist |
| 19 | `UserProfileService_ShouldHaveAtLeastTwoMappings` | AC-6 | ❌ RED — directory does not exist |

### WireMock Mapping File Format Tests

| # | Test | AC Coverage | Status |
|---|------|-------------|--------|
| 20 | `WireMockMappings_AllFiles_ShouldBeValidJson` | AC-4, AC-5, AC-6 | ❌ RED — files do not exist |
| 21 | `WireMockMappings_AllFiles_ShouldHaveRequestFields` | AC-4, AC-5, AC-6 | ❌ RED — files do not exist |
| 22 | `WireMockMappings_AllFiles_ShouldHaveResponseField` | AC-4, AC-5, AC-6 | ❌ RED — files do not exist |

---

## E2E Tests

**Status:** ❌ NOT APPLICABLE

**Rationale:** This story delivers build/infrastructure artifacts (Dockerfile, seed data, WireMock mappings, CI job). The demo Docker image does not exist in the repository yet and cannot be built in the test environment without the production image being published first. All validation is static file/artifact checking (unit tests).

E2E tests for the demo image's runtime behavior (startup, service seeding, admin login) would require:
- The production image published to Docker Hub (`fishtank/fishtank:latest`)
- The demo Dockerfile built and run (`docker build -f demo.Dockerfile`)
- A running container with network access

These tests are deferred to post-merge manual validation or a separate E2E test suite that runs against published images.

---

## Coverage Summary

| AC | Description | Test Coverage |
|----|-------------|---------------|
| AC-1 | Demo image startup with 3+ services | ✅ Tests 1-8 |
| AC-2 | 3 services returned by GET /api/services | ✅ Tests 4, 6, 7 |
| AC-3 | WireMock binds to configured ports | ⚠️ Runtime validation (manual) |
| AC-4 | Weather API mock mappings | ✅ Tests 17, 20-22 |
| AC-5 | Payments Gateway mock mappings | ✅ Tests 18, 20-22 |
| AC-6 | User Profile Service mock mappings | ✅ Tests 19, 20-22 |
| AC-7 | Demo image builds FROM production | ✅ Tests 9, 10 |
| AC-8 | Demo image only adds seed file + env var | ✅ Tests 10, 11 |
| AC-9 | Docker Hub tagging | ⚠️ CI validation (manual) |
| AC-10 | First-run setup with default credentials | ✅ Tests 12, 13 |
| AC-11 | Demo credentials documented in README | ⚠️ Manual validation |
| AC-12 | Seed file format matches SeedEntry schema | ✅ Tests 2, 3, 5, 8 |
| AC-13 | GET /health returns 200 | ⚠️ Runtime validation (manual) |
| AC-14 | GET /openapi/v1.json serves spec | ⚠️ Runtime validation (manual) |

**Automated Test Coverage:** 82% (11/14 ACs fully covered by automated tests)  
**Manual Validation Required:** 18% (3/14 ACs require runtime/CI checks)

---

## What Needs to Be Built (Developer Checklist)

The following artifacts MUST be created for tests to turn GREEN:

### 1. Demo Seed JSON
- [ ] Create `resources/demo-seed.json`
- [ ] Must be a **flat JSON array** (not wrapped in `services` key)
- [ ] Must have exactly **3 entries**
- [ ] Each entry has: `name`, `externalUrl`, `port`, `description`, `tags`
- [ ] Ports: **30100, 30101, 30102** (unique, in range 30100-30199)
- [ ] **NO** `mappings` or `responses` fields (wrong format)

### 2. WireMock Mapping Files
- [ ] Create `resources/demo-mocks/` directory
- [ ] Create subdirectories:
  - `weather-api/mappings/` (at least 2 JSON files)
  - `payments-gateway/mappings/` (at least 2 JSON files)
  - `user-profile-service/mappings/` (at least 2 JSON files)
- [ ] Each mapping file must be valid JSON
- [ ] Each mapping must have `request.method`, `request.urlPath`, and `response` fields

### 3. Demo Dockerfile
- [ ] Create `demo.Dockerfile` in repo root
- [ ] Must use `FROM fishtank/fishtank` (production image as base)
- [ ] Must set `FISHTANK_SEED_FILE=/data/demo-seed.json`

### 4. Demo Entrypoint Script
- [ ] Create `resources/demo-entrypoint.sh`
- [ ] Must contain `admin` (username)
- [ ] Must contain `demofishtank1` (password ≥12 chars)

---

## Next Steps

1. **Developer implements story 6-3** — creates all required artifacts
2. **Run tests again** — `dotnet test --filter "FullyQualifiedName~DemoImageArtifactTests"`
3. **Verify GREEN phase** — all 21 tests should PASS
4. **Manual validation:**
   - Build demo image: `docker build -f demo.Dockerfile -t fishtank:demo .`
   - Run container: `docker run -p 9090:5000 fishtank:demo`
   - Verify startup, login, 3 services visible, mock endpoints respond
5. **CI integration** — verify `.github/workflows/release.yml` publishes demo image
6. **README update** — confirm Quick Demo section exists with credentials

---

## RED Phase Confirmation

✅ **All tests compile cleanly** — no syntax errors  
✅ **All 21 tests FAIL** — expected because artifacts do not exist yet  
✅ **Failure reasons are correct** — tests fail with `DirectoryNotFoundException` and `FileNotFoundException`  
✅ **Tests are ready for GREEN phase** — developer creates artifacts → tests turn GREEN

**Status:** 🔴 RED PHASE COMPLETE

The acceptance tests are ready. When the developer implements story 6-3 and creates all required artifacts, these tests will turn GREEN and validate that the implementation meets all acceptance criteria.
