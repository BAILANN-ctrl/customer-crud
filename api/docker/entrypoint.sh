#!/bin/sh
set -e

echo "Waiting for database connection..."
until php artisan migrate --force > /tmp/migrate.log 2>&1; do
  echo "Database not ready yet, retrying in 3s..."
  cat /tmp/migrate.log || true
  sleep 3
done
echo "Migrations complete."

php artisan es:init-index || true

exec "$@"
