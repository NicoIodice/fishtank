---
story_id: "1.5"
epic: 1
story_key: 1-5-developer-support-tool-docker-wsl
story_title: "Developer Support Tool — Docker + WSL Setup"
status: in-progress
priority: medium
non_blocking: true   # does not gate stories 1-1 through 1-4 or any Epic 2 story
baseline_commit: 986e0d2d50cee1892e76ba82243226c6feffdc80
---

# Story 1.5: Developer Support Tool — Docker + WSL Setup

## Story

**As a** Fishtank developer (or contributor),  
**I want** a Python-based interactive CLI tool at `support/tools/` that manages the full Fishtank Docker environment on WSL,  
**So that** I can install dependencies, start/stop the Fishtank container, tear down the environment cleanly, and onboard new contributors — all from a colourful, self-explanatory menu — without memorising Docker or WSL commands.

---

## Status

Ready for Dev

---

## Context

### Background

Fishtank runs as a Docker container (multi-stage Alpine image, see Architecture). During development and testing the developer needs to:

1. Ensure WSL2 + Docker Desktop prerequisites are met on their Windows host.
2. Build or pull the Fishtank image.
3. Start the container with the correct volume mounts, port mappings, and environment variables.
4. Inspect logs or health status.
5. Tear down **only** Fishtank containers — never touching other projects running on the same machine.

The tool lives in `support/tools/` inside the Fishtank repository so it is always co-located with the project and discoverable by contributors via the root README.

### WSL Context (important for implementation)

The developer already has an **Ubuntu** WSL distro (`wsl --list` name: `Ubuntu`) on the Windows machine that is also used by another professional project. Key constraints that drive design decisions:

- Docker Desktop for Windows WSL2 integration is **system-wide** — the Docker daemon is shared across all WSL distros. No separate Docker installation is needed inside the Ubuntu distro.
- The **other project** has a teardown command that may remove all containers globally (`docker rm -f $(docker ps -aq)` or equivalent). The Fishtank tool **must never** use global teardown; it must use **project-scoped** `docker compose --project-name fishtank down` so Fishtank containers can be cleaned up without affecting other projects.
- The tool should document this risk clearly in the README so contributors who run both projects understand the boundary.

### Tool Location

```
support/
└── tools/
    ├── fishtank_tool.py          # Main entry point — interactive CLI menu
    ├── run.bat                   # Windows CMD double-click launcher
    ├── run.ps1                   # Windows PowerShell launcher
    ├── run.sh                    # macOS / Linux / WSL bash launcher
    ├── requirements.txt          # Python deps (rich, python-dotenv)
    ├── docker-compose.yml        # Fishtank compose file (project-name: fishtank)
    ├── .env.example              # Documented environment variable template
    └── README.md                 # WSL setup guide + tool usage docs
```

---

## Acceptance Criteria

### AC-1 — Entrypoint and invocation
- [ ] Running `python support/tools/fishtank_tool.py` from the repo root on Windows (via WSL, Git Bash, or PowerShell calling `wsl python ...`) launches an interactive full-colour terminal menu.
- [ ] Three launcher executables are provided so contributors can start the tool without memorising the path or knowing Python:
  - `support/tools/run.bat` — Windows CMD / Explorer double-click
  - `support/tools/run.ps1` — Windows PowerShell
  - `support/tools/run.sh` — macOS / Linux / WSL (chmod +x set in repo via `.gitattributes`)
- [ ] Menu title and branding match the Fishtank name/theme (teal/cyan accent, no hard dependencies on third-party font packs).

### AC-2 — Menu structure
The top-level menu presents at minimum the following numbered options, each clearly labelled:

```
╔══════════════════════════════════════╗
║   🐟  FISHTANK  Support Tool          ║
╠══════════════════════════════════════╣
║  [1]  Check prerequisites            ║
║  [2]  Install / update dependencies  ║
║  [3]  Start Fishtank                 ║
║  [4]  Stop Fishtank                  ║
║  [5]  View logs                      ║
║  [6]  Health check                   ║
║  [7]  Teardown (remove containers)   ║
║  [8]  WSL setup guide                ║
║  [0]  Exit                           ║
╚══════════════════════════════════════╝
```

- [ ] Options are rendered with colour-coded status indicators (green = running, red = stopped/error, yellow = warning/unknown).
- [ ] Invalid input loops back to the menu with an error message rather than crashing.

### AC-3 — Option [1]: Check prerequisites
- [ ] Checks and reports status of each prerequisite:
  - WSL2 enabled and running (`wsl --status` or equivalent).
  - Docker Desktop running (tests `docker info` exit code).
  - Docker Compose available (`docker compose version`).
  - Python ≥ 3.9 (`python --version`).
  - `.env` file present in `support/tools/` (warns if missing, does not block).
- [ ] Prints a colour-coded pass/fail/warn table. All green = ready to proceed.

### AC-4 — Option [2]: Install / update dependencies
- [ ] Installs Python packages from `requirements.txt` via `pip install -r requirements.txt` inside a virtual environment (`support/tools/.venv/`).
- [ ] Virtual environment is created if it does not exist.
- [ ] Does **not** attempt to install system-level packages (apt, brew, choco). Those are documented in the README only. This prevents the tool needing sudo/admin.
- [ ] Prints a success/failure summary with colour.

### AC-5 — Option [3]: Start Fishtank
- [ ] Runs `docker compose --project-name fishtank -f support/tools/docker-compose.yml up -d`.
- [ ] Streams stdout/stderr from the compose command to the terminal in real time.
- [ ] After startup, automatically runs a health check against `http://localhost:{FISHTANK_PORT}/health` (port read from `.env`, defaulting to `5000`) and prints result.
- [ ] If the container is already running, prints a status message instead of starting a second instance.

### AC-6 — Option [4]: Stop Fishtank
- [ ] Runs `docker compose --project-name fishtank -f support/tools/docker-compose.yml stop`.
- [ ] Containers are stopped but **not** removed (volumes preserved).
- [ ] Prints confirmation.

### AC-7 — Option [5]: View logs
- [ ] Runs `docker compose --project-name fishtank -f support/tools/docker-compose.yml logs --tail=100 --follow` and streams output.
- [ ] User can exit log view with `Ctrl+C` and is returned to the main menu.

### AC-8 — Option [6]: Health check
- [ ] Calls `GET http://localhost:{FISHTANK_PORT}/health`.
- [ ] Displays HTTP status code, response body (pretty-printed JSON), and round-trip time.
- [ ] Colour-coded: green on 200, red on 503 or connection refused.

### AC-9 — Option [7]: Teardown (remove containers) — **project-scoped only**
- [ ] Prompts for confirmation: `"This will remove Fishtank containers and networks. Volumes are preserved. Continue? [y/N]"`.
- [ ] On confirmation, runs **only**: `docker compose --project-name fishtank -f support/tools/docker-compose.yml down`.
- [ ] Must **never** run `docker rm -f $(docker ps -aq)` or any command that targets containers outside the `fishtank` compose project.
- [ ] Prints a clear note in the confirmation prompt: `"Only Fishtank containers are affected. Other projects are untouched."`.
- [ ] Volumes are **not** removed by default. An additional prompt `"Also remove volumes? [y/N]"` enables `--volumes` flag. Default is N.

### AC-10 — Option [8]: WSL setup guide
- [ ] Displays the full WSL setup guide inline (rendered from `README.md` WSL section via `rich.Markdown`) — no browser needed.
- [ ] Covers: enabling WSL2 on Windows 11/10, installing Ubuntu, enabling Docker Desktop WSL2 integration, verifying Docker works inside WSL.
- [ ] Includes the **important note** about shared Docker daemon and the risk of global container teardown from other projects.

### AC-11 — docker-compose.yml
- [ ] `docker-compose.yml` in `support/tools/` correctly maps:
  - Fishtank management port (configurable via `.env`, default `5000`).
  - Mocks volume mount (configurable via `FISHTANK_MOCKS_PATH` in `.env`).
  - Data directory volume (configurable via `FISHTANK_DATA_PATH` in `.env`).
  - All env vars forwarded from `.env` to the container.
- [ ] Uses `project_name: fishtank` at the top of the compose file to guarantee project scoping regardless of the working directory.
- [ ] Container named `fishtank-app` for predictable identification.
- [ ] Health check defined: `test: ["CMD", "wget", "-qO-", "http://localhost:5000/health"]`, interval 10s, retries 3.

### AC-12 — `.env.example` and `.env`
- [ ] `.env.example` documents all supported variables with type, default, and description comments:
  ```dotenv
  # Fishtank management port exposed on the host
  FISHTANK_PORT=5000

  # Absolute path on the HOST (Windows or WSL) to the mocks folder
  # Example (WSL path): /mnt/c/projects/fishtank-mocks
  FISHTANK_MOCKS_PATH=./mocks

  # Absolute path on the HOST to the Fishtank data directory
  FISHTANK_DATA_PATH=./data

  # Admin password (if unset, first login forces password change)
  # FISHTANK_ADMIN_PASSWORD=

  # JWT expiry in minutes (default: container lifetime)
  # FISHTANK_JWT_EXPIRY_MINUTES=
  ```
- [ ] `.env` is listed in `.gitignore` (ensure not committed). `.env.example` IS committed.

### AC-13 — README.md (`support/tools/README.md`)
The README covers all of the following sections with clear headings:

1. **Overview** — what the tool does, one paragraph.
2. **Prerequisites** — Windows version, WSL2, Docker Desktop (with download links), Python ≥ 3.9.
3. **WSL Setup Guide** — step-by-step:
   - Enable WSL2 (`wsl --install` on Windows 11 / legacy steps on Windows 10).
   - Install Ubuntu from Microsoft Store or `wsl --install -d Ubuntu`.
   - Open Ubuntu terminal and verify: `docker info` (confirm Docker Desktop WSL integration is on).
   - Note about shared Docker daemon: one Docker Desktop instance serves all WSL distros.
4. **Using an Existing Ubuntu Distro** — note that if `Ubuntu` already exists for another project, Fishtank uses the **same** distro transparently. No conflict. However:
   > ⚠️ **Important:** If your other project uses a global Docker teardown command (e.g., `docker rm -f $(docker ps -aq)`), it **will** remove Fishtank containers too. The Fishtank tool uses project-scoped teardown (`docker compose --project-name fishtank down`) and never touches other containers. Verify your other project's teardown is equally scoped.
5. **Quick Start** — copy `.env.example` → `.env`, run `python fishtank_tool.py`, choose [1] then [3].
6. **Menu Reference** — table of all options with description.
7. **Environment Variables** — table matching `.env.example`.
8. **Volumes** — explains the two required mounts and warns about WSL path format (`/mnt/c/...` vs Windows `C:\...`).
9. **Troubleshooting** — common issues:
   - `docker: command not found` in WSL → Docker Desktop WSL integration not enabled.
   - Port conflict → another process using the configured port.
   - Volume permission error → WSL user/group mismatch.

### AC-14 — Code quality
- [ ] Tool is a single self-contained Python 3.9+ script (no framework beyond `rich` and `python-dotenv`).
- [ ] Uses `rich` for all colour/panel output (`rich.console.Console`, `rich.panel.Panel`, `rich.table.Table`, `rich.markdown.Markdown`).
- [ ] Uses `subprocess.run()` or `subprocess.Popen()` for shell commands — never `os.system()`.
- [ ] All subprocess calls use explicit argument lists (no `shell=True`) to prevent shell injection.
- [ ] `.env` loading via `python-dotenv` (`load_dotenv()`).
- [ ] Script exits cleanly on `KeyboardInterrupt` (Ctrl+C) with a friendly message rather than a traceback.

---

## Technical Notes

### Python dependencies (`requirements.txt`)

```
rich>=13.7
python-dotenv>=1.0
requests>=2.31        # for health check HTTP call
```

### Colour palette (aligned with Fishtank UI themes)

Use `rich` named colours; no hardcoded ANSI codes:

| Use            | Rich colour            |
|----------------|------------------------|
| Success / live | `bright_green`         |
| Error / stopped| `bright_red`           |
| Warning        | `bright_yellow`        |
| Accent / brand | `cyan1` (teal-ish)     |
| Muted info     | `grey62`               |
| Header border  | `cyan1`                |

### subprocess pattern (no `shell=True`)

```python
import subprocess, shlex

def run_compose(args: list[str]) -> int:
    cmd = [
        "docker", "compose",
        "--project-name", "fishtank",
        "-f", str(COMPOSE_FILE),
        *args,
    ]
    result = subprocess.run(cmd)
    return result.returncode
```

### WSL path handling note

When paths in `.env` are Windows-style (`C:\...`), they must be converted to WSL-style (`/mnt/c/...`) before being passed to Docker volumes. Include a `to_wsl_path()` helper:

```python
import re

def to_wsl_path(win_path: str) -> str:
    """Convert Windows-style path to WSL /mnt/... path if needed."""
    m = re.match(r"^([A-Za-z]):\\(.*)", win_path)
    if m:
        drive = m.group(1).lower()
        rest = m.group(2).replace("\\", "/")
        return f"/mnt/{drive}/{rest}"
    return win_path  # already Unix-style or relative
```

### docker-compose.yml template

```yaml
# support/tools/docker-compose.yml
# Project-scoped to 'fishtank' — teardown never touches other projects.
name: fishtank

services:
  app:
    container_name: fishtank-app
    image: fishtank:latest          # replace with Docker Hub image once published
    ports:
      - "${FISHTANK_PORT:-5000}:5000"
    volumes:
      - "${FISHTANK_MOCKS_PATH:-./mocks}:/mocks"
      - "${FISHTANK_DATA_PATH:-./data}:/data"
    environment:
      - FISHTANK_DB_PATH=/data/fishtank.db
      - FISHTANK_MOCKS_ROOT=/mocks
      - FISHTANK_ADMIN_PASSWORD=${FISHTANK_ADMIN_PASSWORD:-}
      - FISHTANK_JWT_EXPIRY_MINUTES=${FISHTANK_JWT_EXPIRY_MINUTES:-}
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    restart: unless-stopped
```

### Run wrapper scripts

**`support/tools/run.bat`** (Windows CMD — double-click or `run` from cmd.exe):
```bat
@echo off
SETLOCAL
cd /d "%~dp0"

REM Check if Python is available natively first; fall back to WSL.
where python >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    python fishtank_tool.py %*
) ELSE (
    REM Python not on PATH — try via WSL
    where wsl >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        wsl python fishtank_tool.py %*
    ) ELSE (
        echo ERROR: Python not found natively and WSL is not available.
        echo Install Python 3.9+ or enable WSL2 and try again.
        pause
        exit /b 1
    )
)
ENDLOCAL
```

**`support/tools/run.ps1`** (Windows PowerShell):
```powershell
# Runs the Fishtank support tool from any directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir
try {
    # Prefer native Python; fall back to WSL
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python fishtank_tool.py @args
    } elseif (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl python fishtank_tool.py @args
    } else {
        Write-Error "Python not found natively and WSL is not available. Install Python 3.9+ or enable WSL2."
        exit 1
    }
} finally {
    Pop-Location
}
```

**`support/tools/run.sh`** (macOS / Linux / WSL bash):
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Activate venv if it exists
if [ -f ".venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi

python fishtank_tool.py "$@"
```

> **Note:** Ensure `run.sh` has execute permission. The repo should include a `.gitattributes` entry:
> ```
> support/tools/run.sh text eol=lf
> ```
> After cloning run `chmod +x support/tools/run.sh` once on macOS/Linux/WSL.

---

## Out of Scope (explicitly excluded from this story)

- No CI integration for this tool (it is a local developer aid, not part of the application build pipeline).
- No Windows-native Docker support (Docker Desktop + WSL2 is the only supported configuration in v1).
- No automatic installation of WSL, Docker Desktop, or Python — the README documents those; the tool only checks they exist.
- No Kubernetes manifest management (that is Epic 6 / FR-41).
- No management of the **other project's** containers or teardown logic — the tool is Fishtank-only.

---

## Dependencies

- Story 1.1 must define the final Dockerfile and image name before `docker-compose.yml` can reference the correct image tag. Until 1.1 is done, use `image: fishtank:local-dev` as a placeholder.
- This story has **no blocking dependency** on any other Epic 1 story for its Python tool scaffold; it can be started in parallel.

---

## Dev Notes

- Keep `fishtank_tool.py` as a **single file**. Resist splitting into modules — this is a local helper script, not an application. Under ~400 lines is the target.
- Do not add logging to a file from this tool. Console output via `rich` is sufficient.
- Test the tool manually by running each menu option end-to-end before marking done. No automated tests required for this story.
- Ensure `support/tools/mocks/` and `support/tools/data/` directories exist (or are gitignored with a `.gitkeep`) so Docker volumes mount without error on first run.
- Add `support/tools/.venv/` and `support/tools/.env` to the root `.gitignore`.
