#!/usr/bin/env bash
# Starts the chrome-devtools MCP on the Dia broker. The broker holds the one
# approved connection to Dia. Its port and token are in inbox/dia-broker.json.
set -euo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
broker_file="${repo}/inbox/dia-broker.json"

if [[ ! -f "${broker_file}" ]]; then
  echo "No ${broker_file}. Start the dia-broker pane: pnpm assistant start" >&2
  exit 1
fi

port="$(jq -r '.port' "${broker_file}")"
token="$(jq -r '.token' "${broker_file}")"

exec pnpm dlx chrome-devtools-mcp@latest \
  --wsEndpoint "ws://127.0.0.1:${port}/${token}" \
  --categoryExtensions
