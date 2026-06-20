#!/bin/bash
# scripts/test-changed.sh
# Runs only the tests relevant to files changed since the base branch.
# Useful for fast feedback on PRs before the full pipeline runs.
#
# Usage:
#   ./scripts/test-changed.sh                  # auto-detects base branch (main/develop)
#   ./scripts/test-changed.sh main             # diff against main

set -euo pipefail

BASE="${1:-$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}' || echo 'main')}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT_DIR="$ROOT/src/client"

echo "Diffing against base: $BASE"
CHANGED=$(git diff --name-only "origin/$BASE"...HEAD 2>/dev/null || git diff --name-only "$BASE"...HEAD)

echo "Changed files:"
echo "$CHANGED" | sed 's/^/  /'
echo ""

RUN_BACKEND=false
RUN_FRONTEND=false
RUN_LINT=false

while IFS= read -r file; do
  case "$file" in
    src/Fishtank.Api*|src/Fishtank.Api.UnitTests*|src/Fishtank.Api.IntegrationTests*)
      RUN_BACKEND=true ;;
    src/client/src/*|src/client/tests/*)
      RUN_FRONTEND=true ;;
    src/client/*.ts|src/client/*.js|src/client/*.json|src/client/eslint*)
      RUN_LINT=true
      RUN_FRONTEND=true ;;
  esac
done <<< "$CHANGED"

if [ "$RUN_LINT" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Running lint (client changes detected)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$CLIENT_DIR" && npm run lint && cd "$ROOT"
fi

if [ "$RUN_BACKEND" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔬 Running backend tests (.NET changes detected)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  dotnet test "$ROOT/src/Fishtank.slnx" --logger "console;verbosity=normal"
fi

if [ "$RUN_FRONTEND" = "true" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎭 Running E2E tests (client changes detected)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$CLIENT_DIR"
  npm run dev &
  VITE_PID=$!
  trap 'kill $VITE_PID 2>/dev/null || true' EXIT
  for i in $(seq 1 30); do
    curl -sf http://localhost:5173 > /dev/null 2>&1 && break
    sleep 2
  done
  BASE_URL=http://localhost:5173 npm run test:e2e
  cd "$ROOT"
fi

if [ "$RUN_BACKEND" = "false" ] && [ "$RUN_FRONTEND" = "false" ] && [ "$RUN_LINT" = "false" ]; then
  echo "No test-relevant changes detected. Skipping all tests. ✅"
fi
