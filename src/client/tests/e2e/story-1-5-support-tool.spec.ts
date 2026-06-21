import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ATDD acceptance test scaffolds for Story 1.5:
 * Developer Support Tool — Docker + WSL Setup.
 *
 * These are NODE-ONLY tests (no browser fixture used). Playwright's test
 * runner executes in Node.js, so we can use `fs` to verify the support tool
 * artifacts that this story must create.
 *
 * RED PHASE — all tests FAIL before implementation (support/tools/ does not
 * exist yet). They PASS once the support tool artifacts are created.
 *
 * ACs covered:
 *   AC-1  — Entrypoint fishtank_tool.py and launchers (run.bat, run.ps1, run.sh) exist
 *   AC-9  — Teardown is project-scoped (never global docker rm -f)
 *   AC-11 — docker-compose.yml: project_name fishtank, container fishtank-app, health check
 *   AC-12 — .env.example documents FISHTANK_PORT, FISHTANK_MOCKS_PATH, FISHTANK_DATA_PATH
 *   AC-13 — README.md exists with WSL guide, teardown warning, Prerequisites section
 *   AC-14 — requirements.txt has rich + python-dotenv; tool uses subprocess not os.system()
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Resolve repo root: src/client/tests/e2e/ → up 4 = repo root
const REPO_ROOT = join(__dirname, "../../../..");
const TOOLS_DIR = join(REPO_ROOT, "support", "tools");

// ---------------------------------------------------------------------------
// AC-1: Entrypoint and launchers
// RED:  support/tools/ directory does not exist → existsSync returns false
// GREEN: After implementation, all files exist at expected paths
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — Entrypoint and Launchers (AC-1)", () => {
  test("AC-1: fishtank_tool.py entrypoint exists at support/tools/", () => {
    expect(
      existsSync(join(TOOLS_DIR, "fishtank_tool.py")),
      "support/tools/fishtank_tool.py must exist — it is the main Python entry point (AC-1)",
    ).toBe(true);
  });

  test("AC-1: Windows CMD launcher run.bat exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, "run.bat")),
      "support/tools/run.bat must exist — Windows CMD / Explorer double-click launcher (AC-1)",
    ).toBe(true);
  });

  test("AC-1: PowerShell launcher run.ps1 exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, "run.ps1")),
      "support/tools/run.ps1 must exist — Windows PowerShell launcher (AC-1)",
    ).toBe(true);
  });

  test("AC-1: bash launcher run.sh exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, "run.sh")),
      "support/tools/run.sh must exist — macOS / Linux / WSL bash launcher (AC-1)",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-9: Project-scoped teardown guard
// RED:  fishtank_tool.py does not exist → readFileSync throws
// GREEN: Script exists and never uses global docker rm -f
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — Project-Scoped Teardown (AC-9)", () => {
  test("AC-9: fishtank_tool.py must not use global 'docker rm -f' teardown", () => {
    const content = readFileSync(join(TOOLS_DIR, "fishtank_tool.py"), "utf-8");
    expect(
      content,
      "fishtank_tool.py must NEVER use 'docker rm -f' or any global container removal command (AC-9). " +
        "Only 'docker compose --project-name fishtank down' is allowed for teardown.",
    ).not.toMatch(/docker\s+rm\s+-f/);
  });

  test("AC-9: fishtank_tool.py uses project-scoped compose down for teardown", () => {
    const content = readFileSync(join(TOOLS_DIR, "fishtank_tool.py"), "utf-8");
    // The teardown option must use 'docker compose ... down' scoped to the fishtank project
    expect(
      content,
      "fishtank_tool.py teardown must use 'docker compose' down scoped to the fishtank project (AC-9)",
    ).toMatch(/docker\s+compose.*--project-name\s+fishtank.*down/s);
  });
});

// ---------------------------------------------------------------------------
// AC-11: docker-compose.yml correctness
// RED:  File does not exist → existsSync returns false / readFileSync throws
// GREEN: File exists with project_name, container name, and health check
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — docker-compose.yml (AC-11)", () => {
  test("AC-11: support/tools/docker-compose.yml exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, "docker-compose.yml")),
      "support/tools/docker-compose.yml must exist (AC-11)",
    ).toBe(true);
  });

  test("AC-11: docker-compose.yml declares project_name: fishtank", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "docker-compose.yml"),
      "utf-8",
    );
    expect(
      content,
      "docker-compose.yml must set project name to 'fishtank' (name: or project_name:) to scope all containers to this project (AC-11)",
    ).toMatch(/(?:project_name|name)\s*:\s*fishtank/);
  });

  test("AC-11: docker-compose.yml names the container fishtank-app", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "docker-compose.yml"),
      "utf-8",
    );
    expect(
      content,
      "docker-compose.yml must use container_name: fishtank-app for predictable identification (AC-11)",
    ).toContain("fishtank-app");
  });

  test("AC-11: docker-compose.yml defines a health check for the container", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "docker-compose.yml"),
      "utf-8",
    );
    expect(
      content,
      "docker-compose.yml must define a healthcheck (test + interval + retries) for fishtank-app (AC-11)",
    ).toMatch(/healthcheck\s*:/);
  });

  test("AC-11: docker-compose.yml health check hits /health endpoint", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "docker-compose.yml"),
      "utf-8",
    );
    expect(
      content,
      "docker-compose.yml health check must call the /health endpoint (AC-11)",
    ).toMatch(/\/health/);
  });
});

// ---------------------------------------------------------------------------
// AC-12: .env.example documents required variables
// RED:  File does not exist → existsSync returns false / readFileSync throws
// GREEN: File exists with all required variable declarations
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — .env.example (AC-12)", () => {
  test("AC-12: support/tools/.env.example exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, ".env.example")),
      "support/tools/.env.example must exist and be committed to the repo (AC-12)",
    ).toBe(true);
  });

  test("AC-12: .env.example documents FISHTANK_PORT", () => {
    const content = readFileSync(
      join(TOOLS_DIR, ".env.example"),
      "utf-8",
    );
    expect(
      content,
      ".env.example must document FISHTANK_PORT with a default value (AC-12)",
    ).toContain("FISHTANK_PORT");
  });

  test("AC-12: .env.example documents FISHTANK_MOCKS_PATH", () => {
    const content = readFileSync(
      join(TOOLS_DIR, ".env.example"),
      "utf-8",
    );
    expect(
      content,
      ".env.example must document FISHTANK_MOCKS_PATH for the mocks volume mount (AC-12)",
    ).toContain("FISHTANK_MOCKS_PATH");
  });

  test("AC-12: .env.example documents FISHTANK_DATA_PATH", () => {
    const content = readFileSync(
      join(TOOLS_DIR, ".env.example"),
      "utf-8",
    );
    expect(
      content,
      ".env.example must document FISHTANK_DATA_PATH for the data volume mount (AC-12)",
    ).toContain("FISHTANK_DATA_PATH");
  });
});

// ---------------------------------------------------------------------------
// AC-13: README.md with required sections
// RED:  File does not exist → existsSync returns false / readFileSync throws
// GREEN: File exists with all required headings and content
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — README.md (AC-13)", () => {
  test("AC-13: support/tools/README.md exists", () => {
    expect(
      existsSync(join(TOOLS_DIR, "README.md")),
      "support/tools/README.md must exist (AC-13)",
    ).toBe(true);
  });

  test("AC-13: README.md includes Prerequisites section", () => {
    const content = readFileSync(join(TOOLS_DIR, "README.md"), "utf-8");
    expect(
      content,
      "README.md must have a Prerequisites section covering Windows version, WSL2, Docker Desktop, Python (AC-13)",
    ).toMatch(/##\s*Prerequisites/i);
  });

  test("AC-13: README.md includes WSL Setup Guide section", () => {
    const content = readFileSync(join(TOOLS_DIR, "README.md"), "utf-8");
    expect(
      content,
      "README.md must have a WSL Setup Guide section with step-by-step instructions (AC-13)",
    ).toMatch(/##.*WSL.*Setup/i);
  });

  test("AC-13: README.md warns about global Docker teardown risk from other projects", () => {
    const content = readFileSync(join(TOOLS_DIR, "README.md"), "utf-8");
    expect(
      content,
      "README.md must contain the important ⚠️ warning about global Docker teardown risk " +
        "from other projects sharing the same WSL distro (AC-13)",
    ).toMatch(/docker\s+rm.*-f|\bImportant\b.*teardown|teardown.*global/is);
  });

  test("AC-13: README.md has Quick Start section", () => {
    const content = readFileSync(join(TOOLS_DIR, "README.md"), "utf-8");
    expect(
      content,
      "README.md must have a Quick Start section (AC-13)",
    ).toMatch(/##.*Quick\s*Start/i);
  });
});

// ---------------------------------------------------------------------------
// AC-14: Code quality — Python tool implementation
// RED:  fishtank_tool.py / requirements.txt do not exist → reads throw
// GREEN: Files exist, tool uses subprocess (not os.system), rich is imported
// ---------------------------------------------------------------------------

test.describe("Story 1-5: Support Tool — Code Quality (AC-14)", () => {
  test("AC-14: requirements.txt exists in support/tools/", () => {
    expect(
      existsSync(join(TOOLS_DIR, "requirements.txt")),
      "support/tools/requirements.txt must exist listing Python dependencies (AC-14)",
    ).toBe(true);
  });

  test("AC-14: requirements.txt includes rich", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "requirements.txt"),
      "utf-8",
    );
    expect(
      content,
      "requirements.txt must include 'rich' for colour/panel output (AC-14)",
    ).toMatch(/^rich/im);
  });

  test("AC-14: requirements.txt includes python-dotenv", () => {
    const content = readFileSync(
      join(TOOLS_DIR, "requirements.txt"),
      "utf-8",
    );
    expect(
      content,
      "requirements.txt must include 'python-dotenv' for .env loading (AC-14)",
    ).toMatch(/^python-dotenv/im);
  });

  test("AC-14: fishtank_tool.py uses subprocess (not os.system) for shell commands", () => {
    const content = readFileSync(join(TOOLS_DIR, "fishtank_tool.py"), "utf-8");
    expect(
      content,
      "fishtank_tool.py must never use os.system() — use subprocess.run() or subprocess.Popen() instead (AC-14)",
    ).not.toContain("os.system(");
    expect(
      content,
      "fishtank_tool.py must use subprocess.run() or subprocess.Popen() for shell commands (AC-14)",
    ).toMatch(/subprocess\.(run|Popen)/);
  });

  test("AC-14: fishtank_tool.py imports rich for colour output", () => {
    const content = readFileSync(join(TOOLS_DIR, "fishtank_tool.py"), "utf-8");
    expect(
      content,
      "fishtank_tool.py must import rich for all colour/panel output (AC-14)",
    ).toMatch(/from rich|import rich/);
  });
});
