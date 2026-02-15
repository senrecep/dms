#!/bin/sh
set -e

echo "=== DMS Init ==="

echo "[1/2] Pushing database schema..."
expect -c '
set timeout 600
spawn bunx drizzle-kit push --force
expect {
  "created or renamed" {
    sleep 0.2
    send "\r"
    exp_continue
  }
  eof
}
foreach {pid spawnid os_error value} [wait] break
exit $value
'
echo "  Schema push complete."

echo "[2/2] Checking seed..."
if [ "$FORCE_SEED" = "true" ]; then
  echo "  FORCE_SEED=true — Running seed..."
  bun run src/lib/db/seed.ts
  echo "  Seed complete."
else
  echo "  FORCE_SEED not set. Skipping seed."
fi

echo "=== DMS Init Done ==="
