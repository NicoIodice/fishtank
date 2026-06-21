#!/usr/bin/env python3
"""
Fishtank Support Tool — interactive CLI for managing the Fishtank Docker environment.

Usage:
    python fishtank_tool.py

Requirements:
    pip install -r requirements.txt

See README.md for full setup instructions.
"""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap: try to activate the local .venv before loading third-party deps
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent
_VENV_ACTIVATE = _SCRIPT_DIR / ".venv" / "Scripts" / "activate_this.py"
if not _VENV_ACTIVATE.exists():
    _VENV_ACTIVATE = _SCRIPT_DIR / ".venv" / "bin" / "activate_this.py"
if _VENV_ACTIVATE.exists():
    exec(open(_VENV_ACTIVATE).read(), {"__file__": str(_VENV_ACTIVATE)})  # noqa: S102

try:
    from dotenv import load_dotenv
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.table import Table
    from rich import box
except ImportError:
    print(
        "ERROR: Dependencies not installed.\n"
        "Run option [2] Install / update dependencies first, or:\n"
        "    pip install -r requirements.txt"
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
_ENV_FILE = _SCRIPT_DIR / ".env"
load_dotenv(_ENV_FILE)

COMPOSE_FILE = _SCRIPT_DIR / "docker-compose.yml"
PROJECT_NAME = "fishtank"
FISHTANK_PORT = int(os.getenv("FISHTANK_PORT", "5000"))
HEALTH_URL = f"http://localhost:{FISHTANK_PORT}/health"

console = Console()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def to_wsl_path(win_path: str) -> str:
    """Convert Windows-style C:\\... path to /mnt/c/... WSL path if needed."""
    m = re.match(r"^([A-Za-z]):\\(.*)", win_path)
    if m:
        drive = m.group(1).lower()
        rest = m.group(2).replace("\\", "/")
        return f"/mnt/{drive}/{rest}"
    return win_path


def run_compose(args: list[str], stream: bool = True) -> int:
    """Run docker compose scoped to the fishtank project. Never targets other projects."""
    cmd = [
        "docker", "compose",
        "--project-name", PROJECT_NAME,
        "-f", str(COMPOSE_FILE),
        *args,
    ]
    if stream:
        result = subprocess.run(cmd)
    else:
        result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode


def header() -> None:
    console.print(
        Panel.fit(
            "[bold cyan1]🐟  FISHTANK  Support Tool[/bold cyan1]",
            border_style="cyan1",
        )
    )


def pause() -> None:
    console.input("\n[grey62]Press Enter to return to the menu...[/grey62]")

# ---------------------------------------------------------------------------
# Menu options
# ---------------------------------------------------------------------------

def check_prerequisites() -> None:
    """Option [1]: Check and report status of each prerequisite."""
    console.rule("[cyan1]Checking Prerequisites[/cyan1]")
    table = Table(box=box.ROUNDED, show_header=True, header_style="bold cyan1")
    table.add_column("Prerequisite", style="bold")
    table.add_column("Status")
    table.add_column("Detail")

    checks = [
        ("WSL2",            _check_wsl),
        ("Docker Desktop",  _check_docker),
        ("Docker Compose",  _check_compose),
        ("Python ≥ 3.9",    _check_python),
        (".env file",       _check_env),
    ]

    all_pass = True
    for name, fn in checks:
        ok, detail = fn()
        if not ok:
            all_pass = False
        status = "[bright_green]✔ OK[/bright_green]" if ok else "[bright_red]✘ FAIL[/bright_red]"
        table.add_row(name, status, detail)

    console.print(table)
    if all_pass:
        console.print("[bright_green]All prerequisites satisfied — you are ready to proceed![/bright_green]")
    else:
        console.print("[bright_yellow]⚠ Fix the failing prerequisites before starting Fishtank.[/bright_yellow]")
    pause()


def _check_wsl() -> tuple[bool, str]:
    r = subprocess.run(["wsl", "--status"], capture_output=True, text=True)
    if r.returncode == 0:
        return True, "WSL2 running"
    return False, "WSL not found or not running"


def _check_docker() -> tuple[bool, str]:
    r = subprocess.run(["docker", "info"], capture_output=True, text=True)
    if r.returncode == 0:
        return True, "Docker daemon reachable"
    return False, "Docker not running — start Docker Desktop"


def _check_compose() -> tuple[bool, str]:
    r = subprocess.run(["docker", "compose", "version"], capture_output=True, text=True)
    if r.returncode == 0:
        return True, r.stdout.strip().split("\n")[0]
    return False, "docker compose not found"


def _check_python() -> tuple[bool, str]:
    v = sys.version_info
    ok = v.major == 3 and v.minor >= 9
    return ok, f"Python {v.major}.{v.minor}.{v.micro}"


def _check_env() -> tuple[bool, str]:
    if _ENV_FILE.exists():
        return True, str(_ENV_FILE)
    return False, f"Missing {_ENV_FILE} — copy .env.example → .env"


def install_dependencies() -> None:
    """Option [2]: Install / update Python deps in a local .venv."""
    console.rule("[cyan1]Installing Dependencies[/cyan1]")
    venv_dir = _SCRIPT_DIR / ".venv"
    req_file = _SCRIPT_DIR / "requirements.txt"

    if not venv_dir.exists():
        console.print("[bright_yellow]Creating virtual environment...[/bright_yellow]")
        result = subprocess.run([sys.executable, "-m", "venv", str(venv_dir)])
        if result.returncode != 0:
            console.print("[bright_red]Failed to create virtual environment.[/bright_red]")
            pause()
            return

    pip = venv_dir / "Scripts" / "pip.exe"
    if not pip.exists():
        pip = venv_dir / "bin" / "pip"

    console.print(f"[bright_yellow]Installing from {req_file}...[/bright_yellow]")
    result = subprocess.run([str(pip), "install", "-r", str(req_file)])
    if result.returncode == 0:
        console.print("[bright_green]✔ Dependencies installed successfully.[/bright_green]")
    else:
        console.print("[bright_red]✘ Dependency installation failed.[/bright_red]")
    pause()


def start_fishtank() -> None:
    """Option [3]: Start Fishtank container."""
    console.rule("[cyan1]Starting Fishtank[/cyan1]")

    # Check if already running
    r = subprocess.run(
        ["docker", "compose", "--project-name", PROJECT_NAME, "-f", str(COMPOSE_FILE), "ps", "-q"],
        capture_output=True, text=True,
    )
    if r.returncode == 0 and r.stdout.strip():
        console.print("[bright_yellow]⚠ Fishtank is already running.[/bright_yellow]")
        _print_health()
        pause()
        return

    console.print("[bright_yellow]Starting Fishtank container...[/bright_yellow]")
    rc = run_compose(["up", "-d"])
    if rc == 0:
        console.print("[bright_green]✔ Fishtank started.[/bright_green]")
        _print_health()
    else:
        console.print("[bright_red]✘ Failed to start Fishtank.[/bright_red]")
    pause()


def stop_fishtank() -> None:
    """Option [4]: Stop Fishtank container (keep volumes)."""
    console.rule("[cyan1]Stopping Fishtank[/cyan1]")
    rc = run_compose(["stop"])
    if rc == 0:
        console.print("[bright_green]✔ Fishtank stopped. Volumes preserved.[/bright_green]")
    else:
        console.print("[bright_red]✘ Stop command failed.[/bright_red]")
    pause()


def view_logs() -> None:
    """Option [5]: Stream Fishtank container logs. Ctrl+C to return."""
    console.rule("[cyan1]Viewing Logs — press Ctrl+C to exit[/cyan1]")
    try:
        run_compose(["logs", "--tail=100", "--follow"])
    except KeyboardInterrupt:
        console.print("\n[grey62]Log view exited. Returning to menu...[/grey62]")


def health_check() -> None:
    """Option [6]: HTTP health check against /health endpoint."""
    console.rule("[cyan1]Health Check[/cyan1]")
    _print_health()
    pause()


def _print_health() -> None:
    import time
    import requests  # local import — only needed when health check runs
    try:
        start = time.monotonic()
        resp = requests.get(HEALTH_URL, timeout=5)
        elapsed_ms = int((time.monotonic() - start) * 1000)
        color = "bright_green" if resp.status_code == 200 else "bright_red"
        console.print(
            f"[{color}]HTTP {resp.status_code}[/{color}]  "
            f"{HEALTH_URL}  "
            f"[grey62]{elapsed_ms}ms[/grey62]"
        )
        try:
            import json
            body = json.dumps(resp.json(), indent=2)
            console.print(f"[grey62]{body}[/grey62]")
        except Exception:
            console.print(f"[grey62]{resp.text[:500]}[/grey62]")
    except requests.exceptions.ConnectionError:
        console.print(f"[bright_red]✘ Connection refused — is Fishtank running? ({HEALTH_URL})[/bright_red]")
    except requests.exceptions.Timeout:
        console.print(f"[bright_red]✘ Request timed out after 5s ({HEALTH_URL})[/bright_red]")


def teardown() -> None:
    """Option [7]: Remove Fishtank containers (project-scoped only, never global)."""
    console.rule("[cyan1]Teardown[/cyan1]")
    console.print(
        "[bright_yellow]⚠ This will remove Fishtank containers and networks.[/bright_yellow]\n"
        "[grey62]Only Fishtank containers are affected. Other projects are untouched.[/grey62]"
    )
    confirm = console.input("Continue? [y/N]: ").strip().lower()
    if confirm != "y":
        console.print("[grey62]Teardown cancelled.[/grey62]")
        pause()
        return

    volumes_confirm = console.input("Also remove volumes (data + mocks)? [y/N]: ").strip().lower()
    cmd = ["down"]
    if volumes_confirm == "y":
        cmd = ["down", "--volumes"]
        console.print("[bright_yellow]Volumes will be removed.[/bright_yellow]")

    rc = run_compose(cmd)
    if rc == 0:
        console.print("[bright_green]✔ Teardown complete.[/bright_green]")
    else:
        console.print("[bright_red]✘ Teardown failed.[/bright_red]")
    pause()


_WSL_GUIDE_MD = """\
# WSL Setup Guide

## Overview

Fishtank runs as a Docker container. This guide explains how to set up WSL2 and Docker Desktop
on Windows so that the Fishtank Support Tool works correctly.

## 1. Enable WSL2 on Windows

**Windows 11** (one command):
```powershell
wsl --install
```

**Windows 10** (manual steps):
1. Enable the WSL feature: `dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart`
2. Enable Virtual Machine Platform: `dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart`
3. Restart your computer.
4. Set WSL 2 as default: `wsl --set-default-version 2`

## 2. Install Ubuntu

From PowerShell:
```powershell
wsl --install -d Ubuntu
```
Or install **Ubuntu** from the Microsoft Store.

Open the Ubuntu terminal and create your UNIX username/password when prompted.

## 3. Enable Docker Desktop WSL2 Integration

1. Install **Docker Desktop for Windows** from https://www.docker.com/products/docker-desktop/
2. In Docker Desktop → **Settings → Resources → WSL Integration**:
   - Enable **"Enable integration with my default WSL distro"**
   - Toggle **Ubuntu** to ON
3. Click **Apply & Restart**.

Verify inside Ubuntu:
```bash
docker info
```
You should see the Docker daemon details — no "Cannot connect" errors.

## 4. Using an Existing Ubuntu Distro

If you already have an Ubuntu WSL distro for another project, Fishtank uses the **same** distro
transparently. There is **no conflict** — the Docker daemon is shared across all WSL distros.

> ⚠️ **Important:** If your other project uses a global Docker teardown command
> (e.g., removing all containers at once with `docker compose down` without a project scope),
> it **will** remove Fishtank containers too.
> The Fishtank tool uses project-scoped teardown (`docker compose --project-name fishtank down`)
> and **never** touches other containers. Verify your other project's teardown is equally scoped.

## 5. Verify Everything Works

Inside Ubuntu:
```bash
docker compose version   # should print Docker Compose version
docker run hello-world   # should pull and run
```

You are ready to use the Fishtank Support Tool!
"""


def wsl_setup_guide() -> None:
    """Option [8]: Display WSL setup guide inline."""
    console.rule("[cyan1]WSL Setup Guide[/cyan1]")
    console.print(Markdown(_WSL_GUIDE_MD))
    pause()

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------

_MENU_OPTIONS = {
    "1": ("Check prerequisites",           check_prerequisites),
    "2": ("Install / update dependencies", install_dependencies),
    "3": ("Start Fishtank",                start_fishtank),
    "4": ("Stop Fishtank",                 stop_fishtank),
    "5": ("View logs",                     view_logs),
    "6": ("Health check",                  health_check),
    "7": ("Teardown (remove containers)",  teardown),
    "8": ("WSL setup guide",               wsl_setup_guide),
    "0": ("Exit",                          None),
}


def show_menu() -> None:
    table = Table(box=box.ROUNDED, show_header=False, border_style="cyan1", padding=(0, 1))
    table.add_column("Key", style="bold cyan1", width=4)
    table.add_column("Option")
    for key, (label, _) in _MENU_OPTIONS.items():
        table.add_row(f"[{key}]", label)
    console.print(table)


def main() -> None:
    while True:
        console.clear()
        header()
        show_menu()
        choice = console.input("\n[bold cyan1]Choose an option: [/bold cyan1]").strip()

        if choice not in _MENU_OPTIONS:
            console.print(f"[bright_red]Invalid option '{choice}'. Please try again.[/bright_red]")
            pause()
            continue

        label, fn = _MENU_OPTIONS[choice]
        if fn is None:
            console.print("[grey62]Goodbye![/grey62]")
            break

        fn()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n[grey62]Interrupted. Goodbye![/grey62]")
        sys.exit(0)
