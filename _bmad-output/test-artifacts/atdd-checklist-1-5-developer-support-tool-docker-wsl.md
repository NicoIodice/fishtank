---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-21'
workflowType: 'testarch-atdd'
storyId: '1.5'
storyKey: '1-5-developer-support-tool-docker-wsl'
storyFile: '_bmad-output/implementation-artifacts/1-5-developer-support-tool-docker-wsl.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-5-developer-support-tool-docker-wsl.md'
generatedTestFiles:
  - 'src/client/tests/e2e/story-1-5-support-tool.spec.ts'
  - 'src/client/tests/unit/lib/seam-contracts.test.ts'
---

# ATDD Checklist — Epic 1, Story 1.5: Developer Support Tool — Docker + WSL Setup

**Date:** 2026-06-21  
**Author:** Nico  
**Primary Test Level:** Node.js file-structure (Playwright) + Unit (Vitest)

---

## Story Summary

A Python-based interactive CLI tool at `support/tools/` that manages the full Fishtank Docker environment
on WSL. It provides a colour-coded menu for starting/stopping the container, checking prerequisites,
viewing logs, and running health checks — all using project-scoped Docker Compose commands that never
affect other containers on the developer's machine.

**As a** Fishtank developer (or contributor)  
**I want** a Python CLI tool at `support/tools/` that manages the Fishtank Docker environment  
**So that** I can start/stop/teardown/inspect Fishtank without memorising Docker commands

---

## Phase Gate Status

| Gate | Status | Notes |
|------|--------|-------|
| Test file created | ✅ | `tests/e2e/story-1-5-support-tool.spec.ts` (25 tests), `tests/unit/lib/seam-contracts.test.ts` (4 tests) |
| ACs referenced | ✅ | AC-1, AC-9, AC-11, AC-12, AC-13, AC-14; T-1-5-01, T-1-5-02 |
| TypeScript compile clean | ✅ | `tsc --noEmit` exits 0 |
| E2E tests RED | ✅ | 25/25 failing against current codebase (support/tools/ does not exist) |
| Unit tests (seam contracts) | ✅ GREEN | T-1-5-01, T-1-5-02 pass — seam contracts established in Story 1.3 |

---

## Acceptance Criteria Coverage

| AC | Description | Tests | Phase |
|----|-------------|-------|-------|
| AC-1 | Entrypoint fishtank_tool.py and launchers exist | 4 tests | RED |
| AC-9 | Teardown is project-scoped (no global docker rm -f) | 2 tests | RED |
| AC-11 | docker-compose.yml correctness (project_name, container name, health check) | 5 tests | RED |
| AC-12 | .env.example documents FISHTANK_PORT, FISHTANK_MOCKS_PATH, FISHTANK_DATA_PATH | 4 tests | RED |
| AC-13 | README.md has Prerequisites, WSL guide, teardown warning, Quick Start | 5 tests | RED |
| AC-14 | requirements.txt (rich + python-dotenv); subprocess not os.system; rich imported | 5 tests | RED |
| T-1-5-01 | queryClient.ts exports queryClient and HUB_INVALIDATION_MAP | 2 tests | GREEN (seam from 1.3) |
| T-1-5-02 | signalr.ts exports createHubConnection factory | 2 tests | GREEN (seam from 1.3) |

---

## Red-Phase Test Scaffolds Created

### File-Structure Tests — Playwright / Node.js (25 tests)

**File:** `src/client/tests/e2e/story-1-5-support-tool.spec.ts`  
**Type:** Node.js file-system assertions (no browser needed; Playwright runs tests in Node.js context)

| Test | Priority | Status | Failure Reason (RED) |
|------|----------|--------|----------------------|
| AC-1: fishtank_tool.py entrypoint exists | P0 | RED | `support/tools/` directory does not exist |
| AC-1: run.bat launcher exists | P1 | RED | `support/tools/` directory does not exist |
| AC-1: run.ps1 launcher exists | P1 | RED | `support/tools/` directory does not exist |
| AC-1: run.sh launcher exists | P1 | RED | `support/tools/` directory does not exist |
| AC-9: no global docker rm -f | P0 | RED | `fishtank_tool.py` does not exist |
| AC-9: project-scoped compose down | P0 | RED | `fishtank_tool.py` does not exist |
| AC-11: docker-compose.yml exists | P0 | RED | `support/tools/` directory does not exist |
| AC-11: project_name: fishtank declared | P0 | RED | `docker-compose.yml` does not exist |
| AC-11: container named fishtank-app | P0 | RED | `docker-compose.yml` does not exist |
| AC-11: healthcheck defined | P1 | RED | `docker-compose.yml` does not exist |
| AC-11: healthcheck hits /health | P1 | RED | `docker-compose.yml` does not exist |
| AC-12: .env.example exists | P1 | RED | `support/tools/` directory does not exist |
| AC-12: FISHTANK_PORT documented | P1 | RED | `.env.example` does not exist |
| AC-12: FISHTANK_MOCKS_PATH documented | P1 | RED | `.env.example` does not exist |
| AC-12: FISHTANK_DATA_PATH documented | P1 | RED | `.env.example` does not exist |
| AC-13: README.md exists | P1 | RED | `support/tools/` directory does not exist |
| AC-13: Prerequisites section | P1 | RED | `README.md` does not exist |
| AC-13: WSL Setup Guide section | P1 | RED | `README.md` does not exist |
| AC-13: Global teardown warning | P0 | RED | `README.md` does not exist |
| AC-13: Quick Start section | P1 | RED | `README.md` does not exist |
| AC-14: requirements.txt exists | P1 | RED | `support/tools/` directory does not exist |
| AC-14: rich in requirements.txt | P1 | RED | `requirements.txt` does not exist |
| AC-14: python-dotenv in requirements.txt | P1 | RED | `requirements.txt` does not exist |
| AC-14: subprocess not os.system | P0 | RED | `fishtank_tool.py` does not exist |
| AC-14: rich imported in tool | P1 | RED | `fishtank_tool.py` does not exist |

### Seam Contract Tests — Vitest Unit (4 tests)

**File:** `src/client/tests/unit/lib/seam-contracts.test.ts`  
**Type:** Vitest unit (jsdom environment)  
**Note:** These tests are GREEN immediately — seam contracts established in Story 1.3.

| Test | Priority | Status | Notes |
|------|----------|--------|-------|
| T-1-5-01: queryClient exported | P3 | ✅ GREEN | Regression guard for `queryClient.ts` |
| T-1-5-01: HUB_INVALIDATION_MAP exported | P3 | ✅ GREEN | Map starts empty; Epic 2+ adds entries |
| T-1-5-02: createHubConnection exported as function | P3 | ✅ GREEN | Regression guard for `signalr.ts` |
| T-1-5-02: createHubConnection returns HubConnection | P3 | ✅ GREEN | Validates factory contract (no .start() called) |

---

## Developer Activation Instructions

When implementing story 1.5, the Playwright tests will automatically switch from RED → GREEN as each
artifact is created. No test modifications required — the tests already assert expected behavior.

**To activate the tests:** simply create the files they reference:
1. `support/tools/fishtank_tool.py`
2. `support/tools/run.bat`, `run.ps1`, `run.sh`
3. `support/tools/docker-compose.yml`
4. `support/tools/.env.example`
5. `support/tools/README.md`
6. `support/tools/requirements.txt`

---

## data-testid Contract Table

Not applicable — this story delivers no web UI components.

---

## Notes

- **Execution mode:** Sequential (single agent)
- **Stack detected:** fullstack
- **Browser automation:** Not used (Node.js file-system tests only — no browser context needed)
- **Framework:** Playwright test runner (Node.js context) + Vitest (jsdom)
