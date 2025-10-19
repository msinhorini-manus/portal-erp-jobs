#!/bin/bash
set -e
pnpm install
pnpm build
exec pnpm preview --host 0.0.0.0 --port $PORT

