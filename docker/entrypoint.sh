#!/bin/sh
set -e

echo "Waiting for database and applying migrations..."
npx prisma migrate deploy

echo "Seeding demo data (skips automatically if already seeded)..."
npx tsx prisma/seed.ts || echo "Seed skipped or already applied."

echo "Starting application..."
exec "$@"
