import { createHash } from 'node:crypto';

import {
  INBOX_ENTRY_VERSION,
  INBOX_TEXT_LIMIT,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';
import type { Attachment } from '@assistant/protocol/inboxEntrySchema';
import type { WhatsappMessage } from '@assistant/protocol/whatsappMessageSchema';

import normalizeWhatsappText from './normalizeWhatsappText';
import parseReactionTarget from './parseReactionTarget';
import whatsappTimeToIso from './whatsappTimeToIso';

const HASH_LENGTH = 16;
const MEDIA_KINDS: Record<string, Attachment['kind']> = {
  'ic-image': 'image',
  'ic-videocam': 'video',
  'ic-mic': 'audio',
  'ic-ptt': 'audio'
};

interface WhatsappPreviewToEntryOptions {
  preview: WhatsappMessage;
  receivedAt: string;
}

/**
 * Maps a WhatsApp chat-list preview to an inbox entry. A reaction preview gives
 * the kind `reaction`, and every other preview gives `message`. The id is a
 * hash of the account, the chat, and the text without bidirectional marks. The
 * time is not in the hash, because the chat list changes "20:13" to "gisteren"
 * on the next day. The preview does not show a reliable author, so the entry
 * has no author. A reaction gets its `emoji`, and its `targetText` from its
 * text.
 *
 * Ponytail: the same short text twice in one chat gives the same id, so the
 * second one is dropped. Reading the chat rows with their `data-id` removes
 * this limit.
 *
 * @param options - The preview and the time the server received it.
 * @returns The validated inbox entry.
 */
const whatsappPreviewToEntry = ({
  preview,
  receivedAt
}: WhatsappPreviewToEntryOptions) => {
  const text = normalizeWhatsappText(preview.text);
  const hash = createHash('sha256')
    .update(`${preview.account}\n${preview.chat}\n${text}`)
    .digest('hex')
    .slice(0, HASH_LENGTH);

  const envelope = {
    v: INBOX_ENTRY_VERSION,
    id: `whatsapp:${preview.account}:preview:${hash}`,
    conversation: {
      id: `whatsapp:${preview.account}:${preview.chat}`,
      title: preview.chat
    },
    fromMe: preview.fromMe ?? false,
    sentAt: whatsappTimeToIso({ time: preview.time, receivedAt }),
    receivedAt,
    text: text.slice(0, INBOX_TEXT_LIMIT),
    source: {
      channel: 'whatsapp',
      account: preview.account,
      via: 'chatList',
      time: preview.time,
      unread: preview.unread,
      media: preview.media,
      firstSeen: preview.firstSeen
    }
  };

  if (preview.reaction) {
    return inboxEntrySchema.parse({
      ...envelope,
      kind: 'reaction',
      emoji: preview.emoji,
      targetText: parseReactionTarget(text)
    });
  }

  return inboxEntrySchema.parse({
    ...envelope,
    kind: 'message',
    attachments: preview.media
      ? [{ kind: MEDIA_KINDS[preview.media] ?? 'file' }]
      : []
  });
};

export default whatsappPreviewToEntry;
