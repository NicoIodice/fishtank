#!/usr/bin/env bash
# Fishtank Support Tool — bash launcher (macOS / Linux / WSL)
set -euo pipefail
cd "$(dirname "$0")"

# Activate venv if it exists
if [ -f ".venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi

exec python fishtank_tool.py "$@"
