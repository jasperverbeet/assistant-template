import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;

interface FindExpiredFilesOptions {
  dir: string;
  maxAgeDays: number;
  now: Date;
}

/**
 * Finds the files below a folder that were last changed more than `maxAgeDays`
 * days before `now`. A missing folder gives an empty list.
 *
 * @param options - The folder, the maximum age in days, and the current time.
 * @returns The paths of the expired files.
 */
const findExpiredFiles = async ({
  dir,
  maxAgeDays,
  now
}: FindExpiredFilesOptions) => {
  const cutoff = now.getTime() - maxAgeDays * DAY_MS;
  const names = await readdir(dir, { recursive: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }
  );
  const expired: string[] = [];

  for (const name of names) {
    const path = join(dir, name);
    const stats = await stat(path);

    if (stats.isFile() && stats.mtime.getTime() < cutoff) {
      expired.push(path);
    }
  }

  return expired;
};

export default findExpiredFiles;
