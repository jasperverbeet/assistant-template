import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import env from '../env';
import isJobDue from './isJobDue';
import jobResultToEntry from './jobResultToEntry';
import { jobSchema } from './jobSchema';
import runJob from './runJob';
import type { JobResult } from './runJob';
import appendInboxEntry from '../inbox/appendInboxEntry';
import readInboxState from '../inbox/readInboxState';
import updateInboxState from '../inbox/updateInboxState';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Checks each `jobs/<name>/job.json` every minute and runs each job that is
 * due. It stores the start time before the run, so a crash does not run a job
 * twice. Each result or failure goes to the inbox. It never returns.
 *
 * Ponytail: jobs run one after the other. A slow job delays the next one. Run
 * them in parallel if that becomes a problem.
 *
 * @param seenIds - The ids in the inbox file.
 * @returns A promise that never resolves.
 */
const runJobs = async (seenIds: Set<string>) => {
  while (true) {
    const names = await readdir(env.JOBS_DIR).catch(() => []);

    for (const name of names) {
      const jobFile = Bun.file(join(env.JOBS_DIR, name, 'job.json'));

      if (!(await jobFile.exists())) {
        continue;
      }

      const parsed = jobSchema.safeParse(
        await jobFile.json().catch(() => null)
      );

      if (!parsed.success) {
        console.error(`jobs/${name}/job.json is not valid`, parsed.error);
        continue;
      }

      const state = await readInboxState();
      const lastRunAt = state.jobLastRunAt[name];

      if (
        !isJobDue({
          job: parsed.data,
          now: new Date(),
          lastRunAt: lastRunAt ? new Date(lastRunAt) : undefined
        })
      ) {
        continue;
      }

      const startedAt = new Date().toISOString();

      await updateInboxState({
        jobLastRunAt: { ...state.jobLastRunAt, [name]: startedAt }
      });

      const result = await runJob({ name, job: parsed.data }).catch(
        (error: unknown) =>
          ({
            job: name,
            ok: false,
            notify: true,
            output: String(error)
          }) satisfies JobResult
      );

      await appendInboxEntry({
        entry: jobResultToEntry({
          result,
          startedAt,
          receivedAt: new Date().toISOString()
        }),
        seenIds
      });
    }

    await Bun.sleep(CHECK_INTERVAL_MS);
  }
};

export default runJobs;
