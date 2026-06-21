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
    from rich.panel import Panel
    from rich.table import Table
    from rich import box
except ImportError:
    print(
        "ERROR: Dependencies not installed.\n"
        "Run:  pip install -r requirements.txt"
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
_ENV_FILE = _SCRIPT_DIR / ".env"
load_dotenv(_ENV_FILE)

COMPOSE_FILE = _SCRIPT_DIR / "docker-compose.yml"
PROJECT_NAME = "fishtank"
DB_PATH = _SCRIPT_DIR / "data" / "fishtank.db"

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


def run_compose_wsl(args: list[str], stream: bool = True) -> int:
    """Run docker compose inside wsl -d Ubuntu. Paths are auto-converted to WSL format."""
    compose_file_wsl = to_wsl_path(str(COMPOSE_FILE))
    cmd = [
        "wsl", "-d", "Ubuntu", "--",
        "docker", "compose",
        "--project-name", PROJECT_NAME,
        "-f", compose_file_wsl,
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
    console.input("\n[grey62]Press Enter to go back...[/grey62]")

# ---------------------------------------------------------------------------
# Menu options
# ---------------------------------------------------------------------------

def start_fishtank() -> None:
    """Option [1]: Build image and start Fishtank inside WSL Ubuntu."""
    console.rule("[cyan1]Starting Fishtank[/cyan1]")

    # Check if already running
    r = subprocess.run(
        [
            "wsl", "-d", "Ubuntu", "--",
            "docker", "compose",
            "--project-name", PROJECT_NAME,
            "-f", to_wsl_path(str(COMPOSE_FILE)),
            "ps", "-q",
        ],
        capture_output=True, text=True,
    )
    if r.returncode == 0 and r.stdout.strip():
        console.print("[bright_yellow]⚠ Fishtank is already running.[/bright_yellow]")
        pause()
        return

    rc = run_compose_wsl(["up", "-d", "--build"])
    if rc == 0:
        console.print("[bright_green]✔ Fishtank started.[/bright_green]")
    else:
        console.print("[bright_red]✘ Failed to start Fishtank.[/bright_red]")
    pause()


def stop_fishtank() -> None:
    """Option [2]: Stop and remove Fishtank containers (keep data volumes)."""
    console.rule("[cyan1]Stopping Fishtank[/cyan1]")
    rc = run_compose_wsl(["down", "--remove-orphans"])
    if rc == 0:
        console.print("[bright_green]✔ Fishtank stopped.[/bright_green]")
    else:
        console.print("[bright_red]✘ Stop command failed.[/bright_red]")
    pause()


def reset_database() -> None:
    """Option [3]: Stop Fishtank and delete the SQLite database for a clean environment."""
    console.rule("[cyan1]Reset Database[/cyan1]")
    console.print(
        "[bright_yellow]⚠ This will stop Fishtank and delete the database.[/bright_yellow]\n"
        "[grey62]All users, mocks, and business data will be removed.\n"
        "The app will reinitialise the database on next start.[/grey62]"
    )
    try:
        confirm = console.input("Continue? [y/N]: ").strip().lower()
    except EOFError:
        console.print("[grey62]Cancelled.[/grey62]")
        pause()
        return
    if confirm != "y":
        console.print("[grey62]Cancelled.[/grey62]")
        pause()
        return

    console.print("[bright_yellow]Stopping Fishtank...[/bright_yellow]")
    run_compose_wsl(["down", "--remove-orphans"], stream=False)

    if DB_PATH.exists():
        try:
            DB_PATH.unlink()
            console.print(f"[bright_green]✔ Database deleted: {DB_PATH}[/bright_green]")
        except OSError as e:
            console.print(f"[bright_red]✘ Could not delete database: {e}[/bright_red]")
    else:
        console.print(f"[grey62]No database found at {DB_PATH} — already clean.[/grey62]")

    console.print("[bright_green]✔ Reset complete. Use [1] Start Fishtank to reinitialise.[/bright_green]")
    pause()

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------

_MENU_OPTIONS = {
    "1": ("Start Fishtank",  start_fishtank),
    "2": ("Stop Fishtank",   stop_fishtank),
    "3": ("Reset database",  reset_database),
    "0": ("Exit",            None),
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
