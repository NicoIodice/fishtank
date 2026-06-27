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
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------
_SCRIPT_DIR = Path(__file__).resolve().parent

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
REPO_ROOT = _SCRIPT_DIR.parent.parent.parent
CLIENT_DIR = REPO_ROOT / "src" / "client"
SLN_PATH = REPO_ROOT / "src" / "Fishtank.slnx"

console = Console()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run_ps(args: str, cwd: Path, env: dict | None = None) -> int:
    """Run a command via PowerShell.

    Using PowerShell instead of cmd.exe (shell=True) avoids IPC-pipe timeout
    that causes Vitest's forks-pool workers to hang on Windows.
    """
    kwargs: dict = {"cwd": str(cwd)}
    if env is not None:
        kwargs["env"] = env
    return subprocess.run(
        ["powershell.exe", "-NonInteractive", "-Command", args],
        **kwargs,
    ).returncode


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


def _fishtank_port() -> int:
    """Return the host port Fishtank is mapped to (default 5000)."""
    return int(os.environ.get("FISHTANK_PORT", "5000"))


def _is_fishtank_running() -> bool:
    """Return True if the Fishtank container is currently up."""
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
    return r.returncode == 0 and bool(r.stdout.strip())


def _wait_for_fishtank(timeout: int = 60) -> bool:
    """Wait until the Fishtank container reports healthy via Docker inspect.

    Uses Docker (inside WSL) directly so we don't rely on WSL2 localhost
    port-forwarding being set up correctly on the Windows host.
    Prints elapsed-time progress so the user knows it is still trying.
    """
    deadline = time.monotonic() + timeout
    start = time.monotonic()
    console.print("[grey62]⏳ Waiting for Fishtank to be ready (up to 60 s)…[/grey62]")
    while time.monotonic() < deadline:
        r = subprocess.run(
            [
                "wsl", "-d", "Ubuntu", "--",
                "docker", "inspect",
                "--format", "{{.State.Health.Status}}",
                "fishtank-app",
            ],
            capture_output=True, text=True,
        )
        status = r.stdout.strip()
        if r.returncode == 0 and status == "healthy":
            elapsed = int(time.monotonic() - start)
            console.print(f"[bright_green]✔ Fishtank is healthy ({elapsed}s)[/bright_green]")
            return True
        elapsed = int(time.monotonic() - start)
        # "starting" → keep waiting; anything else (unhealthy / missing) → keep
        # trying up to the deadline so a slow startup doesn't fail immediately.
        console.print(f"[grey62]   still connecting… ({elapsed}s elapsed)[/grey62]")
        time.sleep(3)
    return False


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
    if rc != 0:
        console.print("[bright_red]✘ Failed to start Fishtank.[/bright_red]")
        pause()
        return

    port = _fishtank_port()
    if _wait_for_fishtank(timeout=60):
        console.print(
            f"[bright_green]✔ Fishtank is up and ready → http://localhost:{port}[/bright_green]"
        )
    else:
        console.print(
            "[bright_yellow]⚠ Fishtank started but did not become healthy within 60 s.\n"
            "   Check container logs: wsl -d Ubuntu -- docker logs fishtank-app[/bright_yellow]"
        )
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


def run_test_suite() -> None:
    """Option [4]: Run unit tests, integration tests, and Playwright E2E tests."""
    console.rule("[cyan1]Full Test Suite[/cyan1]")

    _RESULT_STYLE = {
        "pass":    "[bright_green]✔  PASS[/bright_green]",
        "fail":    "[bright_red]✘  FAIL[/bright_red]",
        "skip":    "[bright_yellow]—  SKIP[/bright_yellow]",
        "blocked": "[bright_yellow]⊘  BLOCKED[/bright_yellow]",
    }

    _GATE_MSG = (
        "[bright_yellow]⚠  Stage failed — remaining stages are blocked.[/bright_yellow]\n"
        "[grey62]Fix the errors above to advance to the next stage.[/grey62]"
    )

    # ── Pre-flight: check whether Fishtank is up (needed for E2E) ────────
    running = _is_fishtank_running()
    if not running:
        console.print(
            "[bright_yellow]⚠  Fishtank is not running.[/bright_yellow]\n"
            "[grey62]Unit and integration tests will still run.\n"
            "Playwright E2E tests require a running Fishtank instance.[/grey62]"
        )
        try:
            start = console.input("Start Fishtank now before running E2E tests? [y/N]: ").strip().lower()
        except EOFError:
            start = "n"
        if start == "y":
            console.print("[bright_yellow]Starting Fishtank…[/bright_yellow]")
            rc = run_compose_wsl(["up", "-d", "--build"])
            if rc == 0:
                console.print("[bright_green]✔ Fishtank started.[/bright_green]")
                if _wait_for_fishtank():
                    console.print("[bright_green]✔ Fishtank is ready.[/bright_green]")
                    running = True
                else:
                    console.print("[bright_red]✘ Fishtank did not become ready in time. E2E tests will be skipped.[/bright_red]")
            else:
                console.print("[bright_red]✘ Failed to start Fishtank. E2E tests will be skipped.[/bright_red]")

    results: list[tuple[str, str]] = []  # (suite name, "pass" | "fail" | "skip" | "blocked")
    blocked = False

    # ── Step 1: ESLint (Frontend) ─────────────────────────────────────────
    console.rule("[dim]Step 1 / 4 — ESLint (Frontend)[/dim]")
    rc = run_ps("npm run lint", CLIENT_DIR)
    step1_ok = rc == 0
    results.append(("ESLint (Frontend)", "pass" if step1_ok else "fail"))
    if not step1_ok:
        console.print(_GATE_MSG)
        blocked = True

    # ── Step 2: .NET tests (unit + integration) ───────────────────────────
    if blocked:
        results.append((".NET tests (unit + integration)", "blocked"))
    else:
        console.rule("[dim]Step 2 / 4 — .NET tests (unit + integration)[/dim]")
        rc = subprocess.run(
            ["dotnet", "test", str(SLN_PATH), "--logger", "console;verbosity=normal"],
            cwd=str(REPO_ROOT),
        ).returncode
        step2_ok = rc == 0
        results.append((".NET tests (unit + integration)", "pass" if step2_ok else "fail"))
        if not step2_ok:
            console.print(_GATE_MSG)
            blocked = True

    # ── Step 3: Frontend unit tests (Vitest) ─────────────────────────────
    if blocked:
        results.append(("Frontend unit tests (Vitest)", "blocked"))
    else:
        console.rule("[dim]Step 3 / 4 — Frontend unit tests (Vitest)[/dim]")
        rc = run_ps("npm run test:unit", CLIENT_DIR)
        if rc != 0:
            # Vitest's forks pool can fail to start workers on the first run due to
            # Windows security scanning new Node.js processes. The second attempt
            # succeeds because the scanner cache is now warm.
            console.print("[bright_yellow]⚠ Vitest workers timed out — retrying once (Windows fork-start warmup)...[/bright_yellow]")
            rc = run_ps("npm run test:unit", CLIENT_DIR)
        step3_ok = rc == 0
        results.append(("Frontend unit tests (Vitest)", "pass" if step3_ok else "fail"))
        if not step3_ok:
            console.print(_GATE_MSG)
            blocked = True

    # ── Step 4: Playwright E2E tests ──────────────────────────────────────
    if blocked:
        results.append(("Playwright E2E tests", "blocked"))
    elif not running:
        console.rule("[dim]Step 4 / 4 — Playwright E2E tests[/dim]")
        console.print("[grey62]Skipped — Fishtank is not running.[/grey62]")
        results.append(("Playwright E2E tests", "skip"))
    else:
        # Ensure the container is reachable before handing off to Playwright.
        if not _wait_for_fishtank(timeout=30):
            console.print("[bright_red]✘ Fishtank is not reachable. Check the container logs.[/bright_red]")
            results.append(("Playwright E2E tests", "fail"))
        else:
            console.rule("[dim]Step 4 / 4 — Playwright E2E tests[/dim]")
            port = _fishtank_port()
            e2e_env = {**os.environ, "BASE_URL": f"http://127.0.0.1:{port}", "API_URL": f"http://127.0.0.1:{port}"}
            rc = run_ps("npm run test:e2e", CLIENT_DIR, env=e2e_env)
            results.append(("Playwright E2E tests", "pass" if rc == 0 else "fail"))

    # ── Summary ───────────────────────────────────────────────────────────
    console.rule("[cyan1]Results[/cyan1]")
    table = Table(box=box.ROUNDED, border_style="cyan1", padding=(0, 1))
    table.add_column("Suite", style="bold")
    table.add_column("Result", justify="center")

    all_ok = True
    for name, outcome in results:
        table.add_row(name, _RESULT_STYLE[outcome])
        if outcome in ("fail", "blocked"):
            all_ok = False

    console.print(table)

    if all_ok:
        console.print("\n[bright_green]✔ All tests passed — safe to open a PR![/bright_green]")
    else:
        console.print("\n[bright_red]✘ One or more suites failed. Fix before opening a PR.[/bright_red]")

    pause()

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------

_MENU_OPTIONS = {
    "1": ("Start Fishtank",   start_fishtank),
    "2": ("Stop Fishtank",    stop_fishtank),
    "3": ("Reset database",   reset_database),
    "4": ("Run test suite",   run_test_suite),
    "0": ("Exit",             None),
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
