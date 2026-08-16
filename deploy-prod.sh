#!/usr/bin/env bash
# Rebuilds and deploys the prod stack (docker-compose.yml + docker-compose.prod.yml).
# Mirrors the manual steps documented at the top of docker-compose.prod.yml:
#   1. bring up postgres-prod
#   2. apply migrations (migrate service waits for postgres-prod to be healthy)
#   3. build and (re)start frontend, fastapi, phoenix-prod
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [[ ! -f .env ]]; then
  echo "error: .env not found (copy .env.example and fill in prod values first)" >&2
  exit 1
fi

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

echo "==> Starting postgres-prod"
"${COMPOSE[@]}" up -d postgres-prod

echo "==> Running database migrations"
"${COMPOSE[@]}" --profile migrate run --rm migrate

echo "==> Building and deploying frontend, fastapi, phoenix-prod"
"${COMPOSE[@]}" up -d --build frontend fastapi phoenix-prod

echo "==> Deploy complete"
"${COMPOSE[@]}" ps
