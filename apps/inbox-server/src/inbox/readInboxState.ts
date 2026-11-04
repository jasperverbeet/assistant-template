import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import env from '../env';

export const INBOX_STATE_FILE = join(env.INBOX_DIR, 'state.json');

export const inboxStateSchema = z.object({
  githubLastPolledAt: z.iso.datetime().optional(),
  gmailHistoryIds: z.record(z.string(), z.string()).default({}),
  watcherLine: z.number().int().nonnegative().default(0),
  jobLastRunAt: z.record(z.string(), z.iso.datetime()).default({}),
  claudeSessionId: z.uuid().optional()
});

export type InboxState = z.infer<typeof inboxStateSchema>;

/**
 * Reads and validates `inbox/state.json`. A missing file gives the default
 * state. A file that is not valid throws, so a bad edit stops the server.
 *
 * @returns The validated inbox state.
 */
const readInboxState = async () => {
  const content = await readFile(INBOX_STATE_FILE, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return '{}';
      }

      throw error;
    }
  );

  return inboxStateSchema.parse(JSON.parse(content));
};

export default readInboxState;
