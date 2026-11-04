import { readdir, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';

import findExpiredFiles from '../audio/findExpiredFiles';
import env from '../env';

const AUDIO_DAYS = 7;
const TRANSCRIPT_DAYS = 30;
const now = new Date();
const audioDir = join(env.INBOX_DIR, 'audio');
const expired = [
  ...(await findExpiredFiles({ dir: audioDir, maxAgeDays: AUDIO_DAYS, now })),
  ...(await findExpiredFiles({
    dir: join(env.INBOX_DIR, 'transcripts'),
    maxAgeDays: TRANSCRIPT_DAYS,
    now
  }))
];

await Promise.all(expired.map((path) => rm(path)));

const sessions = await readdir(audioDir).catch(() => []);

for (const session of sessions) {
  await rmdir(join(audioDir, session)).catch(() => undefined);
}

console.info(
  `Deleted ${expired.length} files: audio older than ${AUDIO_DAYS} days and transcripts older than ${TRANSCRIPT_DAYS} days.`
);
