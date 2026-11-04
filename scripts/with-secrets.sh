#!/usr/bin/env bash
# Runs a command with the variables of .env. 1Password resolves each op://
# reference through a read-only service account. Its token is
# in the macOS Keychain under "assistant-op-service-account". The command does
# not get the token.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
OP_SERVICE_ACCOUNT_TOKEN="$(security find-generic-password -s assistant-op-service-account -w)"
export OP_SERVICE_ACCOUNT_TOKEN

exec op run --env-file="${repo}/.env" --no-masking -- \
  env -u OP_SERVICE_ACCOUNT_TOKEN "$@"
