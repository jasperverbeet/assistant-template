import { describe, expect, test } from 'bun:test';

import whatsappPreviewToEntry from './whatsappPreviewToEntry';

const preview = {
  source: 'whatsapp',
  account: 'business',
  chat: 'Example Customer',
  text: 'hoi!',
  time: '16:55',
  firstSeen: false
} as const;
const receivedAt = '2026-11-03T15:56:10.000Z';

describe('whatsappPreviewToEntry', () => {
  test('ignores the bidirectional marks in the id and the text', () => {
    const plain = whatsappPreviewToEntry({ preview, receivedAt });
    const marked = whatsappPreviewToEntry({
      preview: { ...preview, text: '‪hoi!‬' },
      receivedAt
    });

    expect(marked.id).toBe(plain.id);
    expect(marked).toMatchObject({ text: 'hoi!' });
    expect(plain.id).toMatch(/^whatsapp:business:preview:[0-9a-f]{16}$/);
  });

  test('keeps the id when the time text changes', () => {
    expect(
      whatsappPreviewToEntry({
        preview: { ...preview, time: 'gisteren' },
        receivedAt
      }).id
    ).toBe(whatsappPreviewToEntry({ preview, receivedAt }).id);
  });

  test('gives different ids for the personal and the business account', () => {
    expect(
      whatsappPreviewToEntry({
        preview: { ...preview, account: 'personal' },
        receivedAt
      }).id
    ).not.toBe(whatsappPreviewToEntry({ preview, receivedAt }).id);
  });

  test('maps a video icon to a video attachment', () => {
    const message = whatsappPreviewToEntry({
      preview: { ...preview, media: 'ic-videocam' },
      receivedAt
    });

    expect(message).toMatchObject({
      kind: 'message',
      attachments: [{ kind: 'video', paths: [] }],
      source: { media: 'ic-videocam' }
    });
  });

  test('maps a reaction to a reaction entry', () => {
    const reaction = whatsappPreviewToEntry({
      preview: { ...preview, reaction: true, emoji: '👍', fromMe: true },
      receivedAt
    });

    expect(reaction).toMatchObject({
      kind: 'reaction',
      text: 'hoi!',
      emoji: '👍',
      fromMe: true
    });
    expect(reaction).not.toHaveProperty('attachments');
  });
});
