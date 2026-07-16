#!/bin/sh
# Container entrypoint: prepare the demo database, then serve.
set -e

cd /app

# Use provided secrets, or generate ephemeral ones. The demo database resets
# on every deploy anyway, so ephemeral secrets only mean users re-login after
# a restart — set APP_KEY / JWT_SECRET in the host's env for stable sessions.
if [ -z "$APP_KEY" ]; then
    export APP_KEY="base64:$(head -c 32 /dev/urandom | base64)"
    echo "[start] APP_KEY not provided - generated an ephemeral key."
fi
if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '=+/')"
    echo "[start] JWT_SECRET not provided - generated an ephemeral secret."
fi

mkdir -p database \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/app/exports
[ -f database/database.sqlite ] || touch database/database.sqlite

php artisan migrate --force --seed

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
