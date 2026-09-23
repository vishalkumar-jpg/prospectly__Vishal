#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL at ${DATABASE_HOST}:${DATABASE_PORT}..."

# Wait for Postgres to be ready
# using Bun to check connection to avoid netcat dependency
# Wait for Postgres to be ready
# using Bun to check connection to avoid netcat dependency
MAX_RETRIES=${DB_WAIT_RETRIES:-30}
retry=0
until bun -e 'import { Socket } from "net"; const socket = new Socket(); socket.setTimeout(1000); socket.on("connect", () => { socket.destroy(); process.exit(0); }); socket.on("error", () => { socket.destroy(); process.exit(1); }); socket.on("timeout", () => { socket.destroy(); process.exit(1); }); socket.connect(Number(process.env.DATABASE_PORT), process.env.DATABASE_HOST)'; do
  retry=$((retry + 1))
  if [ "$retry" -ge "$MAX_RETRIES" ]; then
    echo "❌ PostgreSQL did not become ready after ${MAX_RETRIES} attempts."
    exit 1
  fi
  echo "⏱️ PostgreSQL not ready, retrying (${retry}/${MAX_RETRIES})..."
  sleep 2
done

echo "✅ PostgreSQL is ready."

echo "📦 Running migrations..."
if ! bunx drizzle-kit migrate; then
  echo "Migration failed. Exiting."
  exit 1
fi
echo "✅ Migrations completed successfully."

echo "📦 Running Seeders..."
if ! bun run dist/src/database/seed/seed.js; then
  echo "Seeders failed. Exiting."
  exit 1
fi
echo "✅ Seeders completed successfully."

echo "🚀 Starting application..."
exec node dist/src/main.js
