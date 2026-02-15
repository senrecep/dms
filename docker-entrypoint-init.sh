#!/bin/sh
set -e

echo "=== DMS Init ==="

echo "[1/2] Pushing database schema..."
bunx drizzle-kit push --force
echo "  Schema push complete."

echo "[2/2] Seeding database..."
bun run src/lib/db/seed.ts
echo "  Seed complete."

echo "=== DMS Init Done ==="
