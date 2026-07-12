#!/bin/sh
set -e

# Start the .NET server in background
dotnet /app/Fishtank.Api.dll &
SERVER_PID=$!

# Wait for /health to return 200 (max 60 seconds)
echo "Waiting for Fishtank to be ready..."
WAIT_SECS=0
until wget -qO- http://localhost:5000/health > /dev/null 2>&1; do
  sleep 1
  WAIT_SECS=$((WAIT_SECS + 1))
  if [ "$WAIT_SECS" -ge 60 ]; then
    echo "ERROR: Fishtank did not become healthy within 60 seconds. Exiting."
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
done
echo "Fishtank is ready."

# Create the demo admin account if first-run setup is needed
# POST /api/auth/setup requires password >= 12 chars (backend validation)
SETUP_STATUS=$(wget -qO- http://localhost:5000/api/setup/status 2>/dev/null || echo '{"data":{"needsSetup":false}}')
NEEDS_SETUP=$(echo "$SETUP_STATUS" | grep -c '"needsSetup":true' || true)
if [ "$NEEDS_SETUP" -gt "0" ]; then
  echo "Creating demo admin account..."
  wget -qO- \
    --post-data='{"username":"admin","password":"demofishtank1"}' \
    --header='Content-Type: application/json' \
    http://localhost:5000/api/auth/setup > /dev/null
  echo "Demo admin account created (username: admin, password: demofishtank1)"
fi

# Wait for the server process
wait $SERVER_PID
