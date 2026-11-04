import { dirname, join } from 'node:path';

import env from '../env';
import type { Job } from './jobSchema';

const JOB_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT_LENGTH = 10_000;

export interface JobResult {
  job: string;
  ok: boolean;
  notify: boolean;
  output: string;
}

interface RunJobOptions {
  name: string;
  job: Job;
}

/**
 * Runs one job from the repository root. A `script` job runs `run.ts` with Bun.
 * An `agent` job runs `prompt.md` with a headless Claude Code session in the
 * watcher settings. A job that runs longer than 15 minutes is stopped.
 *
 * @param options - The folder name of the job and its validated settings.
 * @returns The job result, ready for the inbox.
 */
const runJob = async ({ name, job }: RunJobOptions) => {
  const jobDir = join(env.JOBS_DIR, name);
  const command =
    job.kind === 'script'
      ? ['bun', join(jobDir, 'run.ts')]
      : [
          'claude',
          '-p',
          await Bun.file(join(jobDir, 'prompt.md')).text(),
          '--settings',
          '.claude/watcher.json',
          '--dangerously-skip-permissions',
          '--no-session-persistence'
        ];
  const process = Bun.spawn(command, {
    cwd: dirname(env.JOBS_DIR),
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: JOB_TIMEOUT_MS
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]);

  return {
    job: name,
    ok: exitCode === 0,
    notify: job.notify,
    output: `${stdout}${stderr}`.trim().slice(0, MAX_OUTPUT_LENGTH)
  } satisfies JobResult;
};

export default runJob;
