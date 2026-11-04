import { appendFile } from 'node:fs/promises';

import type { InboxEntry } from '@assistant/protocol/inboxEntrySchema';

import readInboxEntries, { INBOX_FILE } from './readInboxEntries';
import resolveEntryContact from './resolveEntryContact';
import resolveEntryTargets from './resolveEntryTargets';
import readContacts from '../contacts/readContacts';

interface AppendInboxEntryOptions {
  entry: InboxEntry;
  seenIds: Set<string>;
}

/**
 * Appends one entry to the inbox file as a single JSON line, unless its id is
 * already in `seenIds`. It adds the id before the first `await`, so two calls
 * with the same id cannot both append. A failed append removes the id again, so
 * a later call can retry. Before the append, it sets `author.contactId` from
 * `inbox/contacts.json`. A bad contacts file does not stop the append, because
 * a stop loses the entry. It also sets the target id of a reply or a reaction
 * with `resolveEntryTargets`. It reads the inbox file only for an entry with a
 * target text and no target id.
 *
 * Ponytail: it reads the whole file for each such entry. Keep an index of the
 * texts per conversation in memory when the file grows large.
 *
 * @param options - The entry and the set of ids in the inbox file.
 * @returns `true` when the entry was appended, `false` for a duplicate.
 */
const appendInboxEntry = async ({
  entry,
  seenIds
}: AppendInboxEntryOptions) => {
  if (seenIds.has(entry.id)) {
    return false;
  }

  seenIds.add(entry.id);

  try {
    const contacts = await readContacts().catch((error: unknown) => {
      console.error('contacts.json is not valid. No contact resolved.', error);
      return [];
    });

    const withContact = resolveEntryContact({ entry, contacts });
    const hasOpenTarget =
      (withContact.kind === 'reaction' &&
        withContact.targetText &&
        !withContact.targetId) ||
      (withContact.kind === 'message' &&
        withContact.replyTo?.text &&
        !withContact.replyTo.id);
    const resolved = hasOpenTarget
      ? resolveEntryTargets({
          entry: withContact,
          entries: await readInboxEntries()
        })
      : withContact;

    await appendFile(INBOX_FILE, `${JSON.stringify(resolved)}\n`);
  } catch (error) {
    seenIds.delete(entry.id);
    throw error;
  }

  return true;
};

export default appendInboxEntry;
