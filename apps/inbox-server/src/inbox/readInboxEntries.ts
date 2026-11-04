import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { inboxEntrySchema } from '@assistant/protocol/inboxEntrySchema';

import env from '../env';

export const INBOX_FILE = join(env.INBOX_DIR, 'inbox.jsonl');

/**
 * Reads and validates every entry in `inbox/inbox.jsonl`, in file order. A
 * missing file gives an empty list. An entry that is not valid throws with its
 * line number, so a bad line stops the server.
 *
 * @returns The inbox entries in file order.
 */
const readInboxEntries = async () => {
  const content = await readFile(INBOX_FILE, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return '';
      }

      throw error;
    }
  );

  return content
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      const parsed = inboxEntrySchema.safeParse(JSON.parse(line));

      if (!parsed.success) {
        throw new Error(`inbox.jsonl line ${index + 1} is not valid`, {
          cause: parsed.error
        });
      }

      return parsed.data;
    });
};

export default readInboxEntries;
