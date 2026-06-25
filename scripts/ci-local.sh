#!/bin/bash
# scripts/ci-local.sh
# Simulates the CI pipeline locally. Run from the repo root.
#
# Usage:
#   ./scripts/ci-local.sh              # all stages
#   ./scripts/ci-local.sh lint         # lint only
#   ./scripts/ci-local.sh backend      # backend tests only
#   ./scripts/ci-local.sh e2e          # E2E tests only (starts Vite dev server)
#   ./scripts/ci-local.sh burn-in      # 10-iteration burn-in

set -euo pipefail

STAGE="${1:-all}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT_DIR="$ROOT/src/client"

run_lint() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔍 Lint (ESLint)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  cd "$CLIENT_DIR"
  npm run lint
  cd "$ROOT"
}

run_backend() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔬 Backend Tests (.NET / xUnit)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  dotnet test "$ROOT/src/Fishtank.slnx" --logger "console;verbosity=normal"
}

start_vite() {
  echo "🚀 Starting Vite dev server..."
  cd "$CLIENT_DIR"
  npm run dev &
  VITE_PID=$!
  echo "  Vite PID: $VITE_PID"

  echo "  Waiting for http://localhost:5173..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:5173 > /dev/null 2>&1; then
      echo "  ✅ Vite ready"
      cd "$ROOT"
      return 0
    fi
    sleep 2
  done
  echo "  ❌ Vite dev server did not start in time"
  exit 1
}

start_api() {
  # If the API is already reachable (e.g. Docker container started externally),
  # just wait until it is healthy and skip launching a local process.
  echo "🔍 Checking for .NET API at http://127.0.0.1:5000/health..."
  if curl -sf http://127.0.0.1:5000/health > /dev/null 2>&1; then
    echo "  ✅ API already running (Docker or external process)"
    return 0
  fi

  echo "🚀 Starting .NET API (dotnet run)..."
  cd "$ROOT/src/Fishtank.Api"
  ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://+:5000" &
  API_PID=$!
  echo "  API PID: $API_PID"
  cd "$ROOT"

  echo "  Waiting for http://127.0.0.1:5000/health (up to 120 s)..."
  for i in $(seq 1 60); do
    if curl -sf http://127.0.0.1:5000/health > /dev/null 2>&1; then
      echo "  ✅ API ready"
      return 0
    fi
    sleep 2
  done
  echo "  ❌ API did not start in time"
  exit 1
}

run_e2e() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🎭 E2E Tests (Playwright)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  start_api
  start_vite
  cd "$CLIENT_DIR"
  BASE_URL=http://localhost:5173 npm run test:e2e
  cd "$ROOT"
  # API and Vite processes will be cleaned up when script exits
}

run_burn_in() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔥 Burn-In (10 iterations — flaky detection)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  start_api
  start_vite
  cd "$CLIENT_DIR"
  for i in $(seq 1 10); do
    echo "  Iteration $i/10"
    BASE_URL=http://localhost:5173 npm run test:e2e || exit 1
  done
  echo "✅ Burn-in complete — no flaky tests detected"
  cd "$ROOT"
}

cleanup() {
  [ -n "${VITE_PID:-}" ] && kill "$VITE_PID" 2>/dev/null || true
  [ -n "${API_PID:-}" ]  && kill "$API_PID"  2>/dev/null || true
}
trap cleanup EXIT

case "$STAGE" in
  lint)    run_lint ;;
  backend) run_backend ;;
  e2e)     run_e2e ;;
  burn-in) run_burn_in ;;
  all)
    run_lint
    run_backend
    run_e2e
    echo ""
    echo "✅ All local CI stages passed"
    ;;
  *)
    echo "Unknown stage: $STAGE"
    echo "Usage: $0 [lint|backend|e2e|burn-in|all]"
    exit 1
    ;;
esac
