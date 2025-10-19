#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Building frontend..."
pnpm build

echo "Starting server on port $PORT..."
cd dist
exec python3 -m http.server $PORT

