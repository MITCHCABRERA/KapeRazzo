#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing backend dependencies..."
  npm install
fi
npm run dev
