#!/usr/bin/env bash
# start.sh — One-command local backend setup
# Usage: ./start.sh [--reset]

set -euo pipefail
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}HMS Backend — Local Setup${NC}"
echo "================================"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}docker is required but not installed.${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}node is required but not installed.${NC}"; exit 1; }

# Reset if requested
if [[ "${1:-}" == "--reset" ]]; then
  echo -e "${YELLOW}Resetting LocalStack...${NC}"
  docker compose down -v 2>/dev/null || true
fi

# Start LocalStack
echo "Starting LocalStack..."
docker compose up -d

# Wait for LocalStack to be healthy
echo "Waiting for LocalStack to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:4566/_localstack/health >/dev/null 2>&1; then
    echo -e "${GREEN}LocalStack is ready${NC}"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo -e "${RED}LocalStack failed to start${NC}"
    exit 1
  fi
  sleep 1
done

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Seed data
echo "Seeding database and S3..."
node seed.mjs

# Start server
echo ""
echo -e "${GREEN}Starting local server...${NC}"
node local-server.mjs
