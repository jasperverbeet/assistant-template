import {
  INBOX_ENTRY_VERSION,
  INBOX_TEXT_LIMIT,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';
import type { WhatsappChatRow } from '@assistant/protocol/whatsappChatRowSchema';

import whatsappTimeToIso from './whatsappTimeToIso';

interface WhatsappChatRowToEntryOptions {
  row: WhatsappChatRow;
  account: 'personal' | 'business';
  chat: string;
  receivedAt: string;
}

/**
 * Maps one WhatsApp chat row from `readWhatsappChat.ts` to an inbox entry of
 * the kind `message`. The id holds the WhatsApp `data-id`, so the entry is
 * stable across reads. The conversation id is the same as for a preview of that
 * chat, so rows and previews join on it. An image or a video gives one
 * attachment with the saved file paths.
 *
 * @param options - The row, the WhatsApp account, the chat title, and the time
 *   the server read it.
 * @returns The validated inbox entry.
 */
const whatsappChatRowToEntry = ({
  row,
  account,
  chat,
  receivedAt
}: WhatsappChatRowToEntryOptions) =>
  inboxEntrySchema.parse({
    v: INBOX_ENTRY_VERSION,
    id: `whatsapp:${account}:${row.id}`,
    kind: 'message',
    conversation: { id: `whatsapp:${account}:${chat}`, title: chat },
    author: row.author ? { name: row.author } : undefined,
    fromMe: row.fromMe,
    sentAt: whatsappTimeToIso({ time: row.time, receivedAt }),
    receivedAt,
    text: row.text.slice(0, INBOX_TEXT_LIMIT),
    attachments:
      row.kind === 'text' ? [] : [{ kind: row.kind, paths: row.images }],
    replyTo: row.replyToText ? { text: row.replyToText } : undefined,
    source: {
      channel: 'whatsapp',
      account,
      via: 'chat',
      dataId: row.id,
      time: row.time
    }
  });

export default whatsappChatRowToEntry;
