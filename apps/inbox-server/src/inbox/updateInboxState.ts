import { rename, writeFile } from 'node:fs/promises';

import readInboxState, {
  INBOX_STATE_FILE,
  inboxStateSchema
} from './readInboxState';
import type { InboxState } from './readInboxState';

/**
 * Merges a change into `inbox/state.json`. It writes a temporary file and
 * renames it, so a reader never sees a half-written file.
 *
 * Ponytail: this is a read-modify-write without a lock. The watcher also writes
 * this file. A collision can undo one field. That gives a duplicate event, not
 * a lost one. Add a lock file if duplicates become a problem.
 *
 * @param change - The state fields to set.
 * @returns A promise that resolves when the new state is on disk.
 */
const updateInboxState = async (change: Partial<InboxState>) => {
  const state = inboxStateSchema.parse({
    ...(await readInboxState()),
    ...change
  });
  const temporaryFile = `${INBOX_STATE_FILE}.tmp`;

  await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temporaryFile, INBOX_STATE_FILE);
};

export default updateInboxState;
