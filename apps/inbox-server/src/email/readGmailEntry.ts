import { join } from 'node:path';

import fetchGmail from './fetchGmail';
import gmailMessageToEntry from './gmailMessageToEntry';
import { gmailMessageSchema } from './gmailSchema';
import env from '../env';

const SKIPPED_LABELS = [
  'DRAFT',
  'SPAM',
  'CATEGORY_PROMOTIONS',
  'CATEGORY_SOCIAL'
];

interface ReadGmailEntryOptions {
  account: string;
  messageId: string;
  ignoredSenders: string[];
  knownMessageIds: Map<string, string>;
}

/**
 * Fetches one Gmail message and maps it to an inbox entry. It skips a draft,
 * spam, a promotion, a social update, and an inbound message from an ignored
 * sender. A sender is ignored when the address equals an item of
 * `ignoredSenders`, or ends with `@` or `.` and that item.
 *
 * @param options - The account, the Gmail message id, the ignored senders, and
 *   the known Message-IDs.
 * @returns The entry and its body, or `undefined` for a skipped or deleted
 *   message.
 */
const readGmailEntry = async ({
  account,
  messageId,
  ignoredSenders,
  knownMessageIds
}: ReadGmailEntryOptions) => {
  const message = await fetchGmail({
    account,
    path: `messages/${messageId}?format=full`,
    schema: gmailMessageSchema
  });

  if (
    !message ||
    message.labelIds.some((label) => SKIPPED_LABELS.includes(label))
  ) {
    return undefined;
  }

  const mapped = gmailMessageToEntry({
    message,
    account,
    knownMessageIds,
    bodiesDir: join(env.INBOX_DIR, 'bodies'),
    receivedAt: new Date().toISOString()
  });
  const address = mapped.entry.author?.address ?? '';
  const ignored = ignoredSenders.some(
    (sender) =>
      address === sender ||
      address.endsWith(`@${sender}`) ||
      address.endsWith(`.${sender}`)
  );

  return !mapped.entry.fromMe && ignored ? undefined : mapped;
};

export default readGmailEntry;
