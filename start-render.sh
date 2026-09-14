#!/usr/bin/env bash
set -euo pipefail

echo "[render] DATABASE_URL set: ${DATABASE_URL:+yes}"

# The free Postgres instance can take a while to become reachable on first
# provision. Retry `prisma db push` instead of crashing the whole deploy.
for i in 1 2 3 4 5 6 7 8 9 10; do
  if npx prisma db push --skip-generate; then
    break
  fi
  echo "[render] prisma db push failed (attempt ${i}/10), retrying in 5s..."
  sleep 5
  if [ "$i" = "10" ]; then
    echo "[render] prisma db push failed after 10 attempts"
    exit 1
  fi
done

if [ "${RUN_SEED:-}" = "true" ]; then
  echo "[render] RUN_SEED=true, running prisma/seed.ts"
  npx tsx prisma/seed.ts
fi

# Express API runs on the fixed internal port 4000 (see server/config.ts default).
echo "[render] starting Express API on :4000"
PORT=4000 npm run server &
API_PID=$!

export NODE_ENV=production
export PORT="${PORT:-10000}"

# Give the API time to finish its DB handshake before we serve traffic.
for i in $(seq 1 30); do
  if node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "[render] API healthy after ${i} checks"
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[render] API process exited during startup"
    exit 1
  fi
  if [ "$i" = "30" ]; then
    echo "[render] API did not become healthy in time"
    exit 1
  fi
  sleep 2
done

echo "[render] starting Next.js on :${PORT}"
npx next start &
NEXT_PID=$!

# If either process exits, exit non-zero so Render restarts the service.
wait -n "$API_PID" "$NEXT_PID"
echo "[render] a service process exited unexpectedly"
exit 1