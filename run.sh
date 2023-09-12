#!/usr/bin/env zsh
set -e
SIMD=1 docker compose build
docker compose up --force-recreate
