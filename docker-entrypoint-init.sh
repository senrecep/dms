#!/bin/sh
set -e

echo "=== DMS Init ==="

echo "[1/2] Pushing database schema..."
bunx drizzle-kit push --force
echo "  Schema push complete."

echo "[2/2] Checking if seed is needed..."

if [ "$FORCE_SEED" = "true" ]; then
  echo "  FORCE_SEED=true detected. Running seed (will clear existing data)..."
  bun run src/lib/db/seed.ts
  echo "  Seed complete."
else
  USER_COUNT=$(bun -e "
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
try {
  const result = await sql\`SELECT COUNT(*)::int as count FROM \"user\"\`;
  console.log(result[0].count);
  await sql.end();
} catch {
  console.log('0');
  await sql.end();
}
" 2>/dev/null || echo "0")

  if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "  Empty database detected. Running seed..."
    bun run src/lib/db/seed.ts
    echo "  Seed complete."
  else
    echo "  Database already has $USER_COUNT user(s). Skipping seed."
  fi
fi

echo "=== DMS Init Done ==="
