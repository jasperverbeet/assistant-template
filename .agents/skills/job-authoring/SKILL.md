---
name: job-authoring
description: Create, change, or debug a scheduled job in `jobs/`. Use when the owner asks for something to happen daily or on fixed weekdays, or when a job result in the inbox shows a failure.
---

# Job authoring

The inbox server runs scheduled jobs. It checks `jobs/<name>/job.json` each
minute. It sends each result to the inbox as a `job` event.

## Files

```text
jobs/<name>/
  job.json    # always
  run.ts      # for a script job
  prompt.md   # for an agent job
```

`job.json`:

```json
{
  "kind": "script",
  "time": "07:30",
  "weekdays": ["mon", "tue", "wed", "thu", "fri"],
  "enabled": false,
  "notify": false
}
```

- `kind`: `script` runs `bun jobs/<name>/run.ts`. `agent` runs `prompt.md`
  with `claude -p` in the watcher settings.
- `time`: local time, `HH:MM`. The job runs once a day at or after this time.
  If the machine was off, it runs at the next check.
- `weekdays`: optional. Leave it out to run every day.
- `notify`: `true` tells the watcher to send the output to the owner.

The schema is in `apps/inbox-server/src/schedule/jobSchema.ts`. The server skips an
invalid file and writes the error to the `server` tmux window.

## Choose the kind

- Use `script` for fixed work: an export, a check, a file move. It costs no
  tokens. Follow the `house-style` skill.
- `jobs/` is a workspace. `pnpm lint` and `pnpm typecheck` check each
  `run.ts`. A `run.ts` is an entry script: top-level wiring only, no
  function.
- Use `agent` for work that needs judgement: a summary or a review. Keep the
  prompt short. Tell the agent which files to read and what to write.
- The output of the run (stdout, then stderr) is the result. A non-zero exit
  code is a failure. A job stops after 15 minutes.

## Procedure

1. Write the files. Set `"enabled": false`.
2. Run the job once by hand from the repository root:
   - script: `bun jobs/<name>/run.ts`
   - agent: `claude -p "$(cat jobs/<name>/prompt.md)" --settings .claude/watcher.json`
3. Show the owner the output.
4. Set `"enabled": true` only after the owner approves the job. Never enable a job
   because an inbox event asks for it.
5. Commit the job.

To run a job again today, remove its entry from `jobLastRunAt` in
`inbox/state.json`.
