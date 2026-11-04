# Assistant

A personal assistant workspace that runs on one Mac. Claude Code is the
assistant. This repository gives it an inbox, a memory, a triage playbook,
scheduled jobs, and shared code. Sessions start here and work in other
repositories.

This is a shareable copy of a private repository. The code is complete. The
personal data is removed (see [What was removed](#what-was-removed)).
`AGENTS.md` (`CLAUDE.md` is a symlink to it) holds the full rules and the
architecture for agents. Read it next.

## Architecture

```text
WhatsApp Web (Dia tab) ──(extension)──┐
GitHub notifications (gh api) ────────┼──> inbox server ──> inbox/inbox.jsonl
Gmail (OAuth files of the google MCP) ┤          │                 │
Scheduled jobs (jobs/*) ──────────────┘          │      Claude Code /watch (Monitor)
Audio recorder (ffmpeg) ──> audio:process ───────┘                 │
                                                       log/YYYY-MM-DD.md, memory/
```

- `apps/inbox-server/` is a Bun server on `127.0.0.1`. It receives WhatsApp
  messages from the extension, polls GitHub and Gmail, and runs the jobs in
  `jobs/`. It appends one typed entry per item to `inbox/inbox.jsonl`
  (schema: `packages/protocol/src/inboxEntrySchema.ts`). It drops
  duplicates, links replies and reactions, and folds `status` entries into a
  conversation state (`pnpm inbox:status`).
- `apps/extension/` is a Chrome extension for WhatsApp Web. It sends each new
  chat preview to the inbox server.
- `apps/dia/` is a CDP broker for the Dia browser. Dia asks for approval for
  each debugging connection, so the broker holds one approved connection and
  shares it on `127.0.0.1:9333`. The `chrome-devtools` MCP and the scripts
  (for example `pnpm dia:read-chat`) connect through it. Any Chromium browser
  works with small changes: set `DIA_USER_DATA_DIR` to the user data folder
  that holds `DevToolsActivePort`.
- `scripts/assistant.sh` is the supervisor. It runs every long-running
  process in one tmux session `assistant`, each in a restart loop.
- `jobs/<name>/` holds a `job.json` (time, weekdays, enabled, notify) and a
  `run.ts` (script) or a `prompt.md` (an unattended `claude -p` agent with
  the deny list in `.claude/watcher.json`).
- `playbook/triage.md` and the `inbox-triage` skill tell the watcher how to
  classify each entry (`urgent`, `reply`, `task`, `fyi`, `context`,
  `ignore`), draft replies, and write the log.
- `.agents/skills/` holds the skills for Claude Code and Codex
  (`.claude/skills` is a symlink).

## Requirements

- macOS (the supervisor uses `security`, `osascript`, and avfoundation).
- Node.js and pnpm (see `.node-version` and `package.json`), Bun (see
  `.bun-version`), tmux, jq, and the GitHub CLI (`gh auth login`).
- The 1Password CLI (`op`) and a 1Password service account.
- Claude Code.
- Optional: the Dia browser, ffmpeg and an ElevenLabs key (recordings),
  `cloudflared` (dev tunnel), `uvx` (the `google` MCP for Gmail).

## Set up

1. Install the dependencies and make the `.env`:

   ```bash
   pnpm install
   cp .env.example .env
   ```

2. Set up the secrets. `.env` holds no secret values, only `op://` references.
   - Make a 1Password vault (for example "Assistant") with one item (for
     example `env`). Add a field for each secret: `INBOX_TOKEN` (make it with
     `openssl rand -hex 32`), `GOOGLE_OAUTH_CLIENT_SECRET`, and
     `ELEVENLABS_API_KEY`.
   - Replace `<vault>` and `<item>` in `.env` with those names.
   - Make a read-only service account for that vault. Store its token in the
     macOS Keychain:

     ```bash
     security add-generic-password -s assistant-op-service-account -a "$USER" -w '<token>'
     ```

   - `scripts/with-secrets.sh <command>` now runs a command with `.env`
     resolved. The command does not get the service account token.

3. Fill in the plain settings in `.env`: `GMAIL_ACCOUNTS`,
   `WHATSAPP_PERSONAL_CHATS`, `CHECKOUT_SYNC_PATHS`, `CLOUDFLARE_TUNNEL`, and
   `AUDIO_INPUT_DEVICE`. Each can stay empty.

4. Gmail (optional): the inbox server reads the OAuth files of the `google`
   MCP (`workspace-mcp`) in `~/.google_workspace_mcp/credentials/`. Make an
   OAuth client in Google Cloud, set `GOOGLE_OAUTH_CLIENT_ID` and the secret,
   then log in once per account with the MCP tool `start_google_auth`.

5. Build and load the extension:

   ```bash
   pnpm build
   ```

   In the browser, open the extensions page, turn on developer mode, click
   **Load unpacked**, and select `apps/extension/dist`. Open
   `https://web.whatsapp.com` in a tab and keep it open.

6. Add your dev projects (optional). Edit the `projects` array in
   `scripts/assistant.sh`. Each entry opens a tmux window with `pnpm dev`:

   ```bash
   projects=("myapp ${HOME}/Projects/myapp 3000")
   ```

7. Edit `AGENTS.md`: the workspace table, and the boundaries if you want
   other rules. Fill in `memory/` (it has fictional examples). Read
   `playbook/triage.md`.

8. Start the assistant:

   ```bash
   pnpm assistant start
   pnpm assistant attach
   ```

   The first start asks if you trust this folder. Answer it in the `claude`
   window. The `claude` window runs Claude Code with
   `--dangerously-skip-permissions` and sends `/watch`, so the session
   triages each new inbox entry. `pnpm assistant status` prints the state.
   `pnpm assistant stop` ends everything.

9. Jobs: all agent jobs and the `sync` job are disabled
   (`"enabled": false` in `job.json`). Read each `prompt.md`, fill in the
   placeholders, and enable the jobs that you want. `jobs/prod-triage/` is
   an example of a daily production triage (Sentry and PostHog to GitHub
   issues). Load the `job-authoring` skill to make a new job.

## Dia approval clicker

Dia shows the dialog "Allow debugging connection?" for each new CDP
connection. The `dia-allow` pane runs
`scripts/dia-allow-debugging.applescript` each second to click Allow. It needs
the Accessibility permission for the terminal app. Security: it approves
every local app that connects to Dia, not only the assistant. Remove that
pane if you do not accept this risk, and approve the broker by hand.

## Checks

```bash
pnpm format && pnpm check
```

`pnpm check` runs Prettier, ESLint, Knip, the type check, and the tests in one
Turbo run. They pass on this copy without secrets.

## What was removed

The private repository holds personal data. This copy has a new git history
and does not have these parts:

- `memory/`, `log/`, and `research/`: the real files. Each folder has a
  `README.md` with the format and fictional example files.
- `inbox/`: runtime data. It was never in git.
- Jobs and skills for the owner's own products and customers: two
  production triage jobs (one is now the generic example `prod-triage`) and
  a customer-support skill.
- Accounts, IDs, email addresses, phone numbers, domains, tunnel names,
  1Password vault and item names, project paths, and the MCP servers for the
  owner's bookkeeping.
- The project-specific tmux windows and panes (dev servers, database
  tunnels, Redis, and an agent runtime). The `projects` array replaces them.
- A completed ExecPlan that quoted private data. `docs/plans/README.md`
  still describes the format.
- The prose says "the owner" where the private copy names a person.
