import type { Job } from './jobSchema';
import { WEEKDAYS } from './jobSchema';

interface IsJobDueOptions {
  job: Job;
  now: Date;
  lastRunAt: Date | undefined;
}

/**
 * Decides if a job must run now. A job runs once a day at or after its local
 * time. If the machine was off at that time, the job runs at the next check.
 *
 * @param options - The job, the current time, and the time of the last run.
 * @returns `true` when the job is enabled, today is one of its weekdays, its
 *   time has passed, and it did not run since that time.
 */
const isJobDue = ({ job, now, lastRunAt }: IsJobDueOptions) => {
  if (!job.enabled) {
    return false;
  }

  if (job.weekdays && !job.weekdays.includes(WEEKDAYS[now.getDay()])) {
    return false;
  }

  const [hours, minutes] = job.time.split(':').map(Number);
  const scheduledAt = new Date(now);

  scheduledAt.setHours(hours, minutes, 0, 0);

  if (now < scheduledAt) {
    return false;
  }

  return lastRunAt === undefined || lastRunAt < scheduledAt;
};

export default isJobDue;
