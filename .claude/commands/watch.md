---
description: Watch the inbox and triage each new event
---

# Watch Command Wrapper

Single source of truth: `../../.claude/skills/inbox-triage/SKILL.md`.

Load and follow that skill. This wrapper adds the Claude Code watch loop:

1. Process the backlog with the skill.
2. Start a `Monitor` with this command, where `N` is `watcherLine` in
   `inbox/state.json`. Set `timeout_ms` to the maximum.

   ```bash
   tail -n +<N+1> -F inbox/inbox.jsonl | grep --line-buffered -v -e '"channel":"assistant"' -e '"via":"chat"'
   ```

   The filter drops the `status` and `note` entries that the assistant writes
   itself, so the watcher does not get its own writes back. It also drops the
   WhatsApp chat rows. The preview after them lists their ids in
   `source.resolvedIds`.

3. Triage each new line with the skill.
4. When the monitor expires, read `inbox/state.json` again and go back to
   step 2.
5. To pick up a Claude Code update, run `scripts/assistant.sh restart-claude` once a
   day, when no event is in progress. The supervisor updates Claude Code and
   continues this conversation.
