#!/usr/bin/env bash
# Reports the assistant status at the start of a Claude Code session. It does
# not start anything. Use `pnpm assistant start` for that.
set -uo pipefail

repo="$(cd "$(dirname "$0")/.." && pwd)"
context="Assistant status:
$("${repo}/scripts/assistant.sh" status)"

jq -n --arg context "${context}" '{
  systemMessage: $context,
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $context
  }
}'
