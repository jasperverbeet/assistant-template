import type { WhatsappChatRow } from '@assistant/protocol/whatsappChatRowSchema';
import { describe, expect, test } from 'bun:test';

import whatsappChatRowToEntry from './whatsappChatRowToEntry';

const row: WhatsappChatRow = {
  id: 'false_31600000000@c.us_3EB0A1B2C3D4',
  author: 'Example Customer',
  fromMe: false,
  time: '16:56, 03-11-2026',
  text: 'Dit is de export',
  kind: 'image',
  images: ['/tmp/inbox/media/false_31600000000@c.us_3EB0A1B2C3D4-0.jpg'],
  replyToText: 'Heb je een update?'
};
const receivedAt = '2026-11-03T16:02:00.000Z';

describe('whatsappChatRowToEntry', () => {
  test('maps an image reply to a message with the WhatsApp id', () => {
    expect(
      whatsappChatRowToEntry({
        row,
        account: 'business',
        chat: 'Example Customer',
        receivedAt
      })
    ).toMatchObject({
      id: 'whatsapp:business:false_31600000000@c.us_3EB0A1B2C3D4',
      kind: 'message',
      conversation: { id: 'whatsapp:business:Example Customer' },
      author: { name: 'Example Customer' },
      attachments: [{ kind: 'image', paths: row.images }],
      replyTo: { text: 'Heb je een update?' },
      source: { via: 'chat', dataId: row.id, time: row.time }
    });
  });

  test('gives no attachment and no reply for a plain text', () => {
    const entry = whatsappChatRowToEntry({
      row: { ...row, kind: 'text', images: [], replyToText: '' },
      account: 'business',
      chat: 'Example Customer',
      receivedAt
    });

    expect(entry).toMatchObject({ attachments: [], replyTo: undefined });
  });
});
