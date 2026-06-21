# Fishtank Support Tool

An interactive Python CLI that manages the Fishtank Docker environment on Windows (via WSL2 +
Docker Desktop). Run it to start/stop containers, check prerequisites, view logs, and run health
checks — all without memorising Docker commands.

---

## Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| **Windows** | 10 (21H2+) or 11 | Required for WSL2 + Docker Desktop |
| **WSL2** | Ubuntu distro | See [WSL Setup Guide](#wsl-setup-guide) below |
| **Docker Desktop** | Latest | With WSL2 integration enabled |
| **Python** | ≥ 3.9 | Install from https://www.python.org/ |

---

## WSL Setup Guide

### 1. Enable WSL2

**Windows 11:**
```powershell
wsl --install
```

**Windows 10** (requires restart after each step):
```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
# Restart, then:
wsl --set-default-version 2
```

### 2. Install Ubuntu

```powershell
wsl --install -d Ubuntu
```

Or install **Ubuntu** from the Microsoft Store. Open Ubuntu and create your UNIX user when prompted.

### 3. Enable Docker Desktop WSL2 Integration

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop → **Settings → Resources → WSL Integration**.
3. Enable **"Enable integration with my default WSL distro"** and toggle **Ubuntu** to ON.
4. Click **Apply & Restart**.

Verify in Ubuntu:
```bash
docker info     # should show Docker daemon details
docker compose version
```

### Using an Existing Ubuntu Distro

If you already have an Ubuntu WSL distro for another project, Fishtank uses the **same** distro
transparently — the Docker daemon is shared. There is no conflict.

> ⚠️ **Important:** If your other project uses a global Docker teardown command
> (e.g., removing all containers without a project scope), it **will** remove Fishtank containers too.
> The Fishtank Support Tool only ever runs:
> ```
> docker compose --project-name fishtank down
> ```
> which only affects Fishtank containers. Verify your other project's teardown is equally scoped.

---

## Quick Start

1. Copy `.env.example` to `.env` and adjust values if needed:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Launch the tool:
   ```powershell
   # PowerShell (recommended)
   .\run.ps1

   # CMD / double-click
   run.bat

   # WSL / macOS / Linux
   ./run.sh
   ```
3. Choose **[1] Check prerequisites** — all entries should be green.
4. Choose **[2] Install / update dependencies** to set up the Python `.venv`.
5. Choose **[3] Start Fishtank** to pull and start the container.

---

## Menu Reference

| Option | Action |
|--------|--------|
| **[1] Check prerequisites** | Reports WSL2, Docker, Compose, Python, .env status |
| **[2] Install / update dependencies** | Creates `.venv/` and installs `requirements.txt` |
| **[3] Start Fishtank** | `docker compose up -d` + health check |
| **[4] Stop Fishtank** | `docker compose stop` (containers stopped, volumes preserved) |
| **[5] View logs** | Streams last 100 lines then follows; `Ctrl+C` to exit |
| **[6] Health check** | `GET /health` — shows status code, body, response time |
| **[7] Teardown** | `docker compose down` (with optional `--volumes`); project-scoped only |
| **[8] WSL setup guide** | Inline step-by-step WSL2 + Docker Desktop guide |
| **[0] Exit** | Quit |

---

## Environment Variables

Documented in `.env.example`. Copy it to `.env` before running.

| Variable | Default | Description |
|----------|---------|-------------|
| `FISHTANK_PORT` | `5000` | Host port exposed by the container |
| `FISHTANK_MOCKS_PATH` | `./mocks` | Host path for the WireMock stubs volume |
| `FISHTANK_DATA_PATH` | `./data` | Host path for the SQLite data volume |
| `FISHTANK_ADMIN_PASSWORD` | _(unset)_ | Pre-set admin password; if unset, first-run screen prompts for one |
| `FISHTANK_JWT_EXPIRY_MINUTES` | _(unset)_ | JWT expiry; if unset, tokens expire on container restart |

---

## Volumes

The tool mounts two directories into the container:

| Mount | Variable | Default | Notes |
|-------|----------|---------|-------|
| `/mocks` | `FISHTANK_MOCKS_PATH` | `./mocks` | WireMock stub files (JSON) |
| `/data` | `FISHTANK_DATA_PATH` | `./data` | SQLite database (`fishtank.db`) |

**WSL path format:** If your paths are Windows-style (`C:\projects\...`), the tool converts them to
WSL format (`/mnt/c/projects/...`) automatically before passing them to Docker.

The `mocks/` and `data/` subdirectories inside `support/tools/` are included as empty placeholders
(`.gitkeep`). Docker will create the actual volume contents at runtime.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `docker: command not found` inside WSL | Docker Desktop WSL2 integration not enabled | Settings → Resources → WSL Integration → enable Ubuntu |
| Port conflict on start | Another process is using `FISHTANK_PORT` | Change `FISHTANK_PORT` in `.env` |
| Volume permission error | WSL user/group mismatch | Run `chmod 755 ./mocks ./data` inside WSL |
| `rich` not found | venv not active | Run option **[2]** to install dependencies |
| Health check: connection refused | Container not running | Run option **[3]** Start Fishtank |

---

## Project Scoping Note

Every Docker command this tool runs is scoped to `--project-name fishtank`. It will **never**
remove, stop, or modify containers belonging to other Compose projects on your machine.
