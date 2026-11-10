#!/usr/bin/env bash
# Runs ON the VM from ~/campusgrid: creates .env once with random secrets (never overwritten).
# API keys (GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are filled in afterwards.
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -f .env ]; then
  {
    echo "POSTGRES_USER=campugrid"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)"
    echo "POSTGRES_DB=campugrid"
    echo "MINIO_ACCESS_KEY=campugrid"
    echo "MINIO_SECRET_KEY=$(openssl rand -hex 24)"
    echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
    echo "JWT_ALGORITHM=HS256"
    echo "JWT_EXPIRE_MINUTES=1440"
    echo "GEMINI_API_KEY="
    echo "GOOGLE_CLIENT_ID="
    echo "GOOGLE_CLIENT_SECRET="
  } > .env
  chmod 600 .env
  echo "   created .env (random DB/MinIO/JWT secrets; API keys still empty)"
fi
