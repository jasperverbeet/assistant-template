import { inboxEntrySchema } from '@assistant/protocol/inboxEntrySchema';
import type { InboxEntry } from '@assistant/protocol/inboxEntrySchema';
import type { WhatsappMessage } from '@assistant/protocol/whatsappMessageSchema';

import readWhatsappChatRows from './readWhatsappChatRows';
import whatsappChatRowToEntry from './whatsappChatRowToEntry';
import appendInboxEntry from '../inbox/appendInboxEntry';

const MAX_READ_COUNT = 50;
const MIN_MEDIA_READ_COUNT = 5;
const RESOLVE_ERROR_LENGTH = 500;

interface StoreWhatsappPreviewOptions {
  preview: WhatsappMessage;
  entry: InboxEntry;
  seenIds: Set<string>;
}

/**
 * Stores one allowed WhatsApp preview. A message preview with media or more
 * than one unread message makes the server read the chat. The read marks the
 * chat as read in WhatsApp. Each chat row goes to the inbox before the preview,
 * and the preview lists the row ids in `source.resolvedIds`. A failed read
 * gives the preview with `source.resolveError`. So the preview always reaches
 * the inbox, and triage can read the chat by hand.
 *
 * Ponytail: the caller keeps the queue of previews in memory. A server stop
 * during a read loses that preview. The extension sends it again after the
 * restart, because its id is not in the file.
 *
 * @param options - The preview from the extension, its mapped entry, and the
 *   ids in the inbox file.
 * @returns A promise that resolves when the preview is in the inbox.
 */
const storeWhatsappPreview = async ({
  preview,
  entry,
  seenIds
}: StoreWhatsappPreviewOptions) => {
  const unread = preview.unread ?? 0;

  if (entry.kind !== 'message' || (!preview.media && unread <= 1)) {
    await appendInboxEntry({ entry, seenIds });
    return;
  }

  const count = Math.min(
    MAX_READ_COUNT,
    preview.media ? Math.max(unread, MIN_MEDIA_READ_COUNT) : unread
  );
  const resolved = await readWhatsappChatRows({
    account: preview.account,
    chat: preview.chat,
    count
  })
    .then(async (rows) => {
      const resolvedIds: string[] = [];

      for (const row of rows) {
        const rowEntry = whatsappChatRowToEntry({
          row,
          account: preview.account,
          chat: preview.chat,
          receivedAt: new Date().toISOString()
        });

        await appendInboxEntry({ entry: rowEntry, seenIds });
        resolvedIds.push(rowEntry.id);
      }

      return { resolvedIds };
    })
    .catch((error: unknown) => {
      console.error(`WhatsApp chat read failed for ${preview.chat}`, error);
      return { resolveError: String(error).slice(0, RESOLVE_ERROR_LENGTH) };
    });

  await appendInboxEntry({
    entry: inboxEntrySchema.parse({
      ...entry,
      source: { ...entry.source, ...resolved }
    }),
    seenIds
  });
};

export default storeWhatsappPreview;
