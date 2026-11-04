import { inboxEntrySchema } from '@assistant/protocol/inboxEntrySchema';
import { describe, expect, test } from 'bun:test';

import resolveEntryTargets from './resolveEntryTargets';

describe('resolveEntryTargets', () => {
  const entry = (fields: Record<string, unknown>) =>
    inboxEntrySchema.parse({
      v: 3,
      id: 'test:new',
      kind: 'message',
      conversation: { id: 'whatsapp:business:Example', title: 'Example' },
      fromMe: false,
      sentAt: '2026-11-03T20:00:00.000Z',
      receivedAt: '2026-11-03T20:00:00.000Z',
      text: 'text',
      source: {
        channel: 'whatsapp',
        account: 'business',
        via: 'chatList',
        time: '21:00'
      },
      ...fields
    });
  const reaction = (fields: Record<string, unknown>) =>
    entry({ kind: 'reaction', targetText: 'hoi!', ...fields });
  const chatRow = (fields: Record<string, unknown>) =>
    entry({
      source: {
        channel: 'whatsapp',
        account: 'business',
        via: 'chat',
        time: '21:00, 03-11-2026'
      },
      ...fields
    });

  test('points a reaction of another person to the message of the owner', () => {
    const resolved = resolveEntryTargets({
      entry: reaction({}),
      entries: [
        entry({ id: 'mine', text: 'hoi!', fromMe: true }),
        entry({ id: 'theirs', text: 'hoi!' })
      ]
    });

    expect(resolved).toMatchObject({ targetId: 'mine' });
  });

  test('takes the other side when the expected side has no match', () => {
    expect(
      resolveEntryTargets({
        entry: reaction({}),
        entries: [entry({ id: 'theirs', text: 'hoi!' })]
      })
    ).toMatchObject({ targetId: 'theirs' });
  });

  test('prefers a chat row over a preview of the same message', () => {
    expect(
      resolveEntryTargets({
        entry: reaction({ fromMe: true }),
        entries: [
          chatRow({ id: 'row', text: 'hoi!' }),
          entry({ id: 'preview', text: 'hoi!' })
        ]
      })
    ).toMatchObject({ targetId: 'row' });
  });

  test('takes the newest match', () => {
    expect(
      resolveEntryTargets({
        entry: entry({ replyTo: { text: 'ok' } }),
        entries: [
          entry({ id: 'old', text: 'ok' }),
          entry({ id: 'new', text: 'ok' })
        ]
      })
    ).toMatchObject({ replyTo: { id: 'new', text: 'ok' } });
  });

  test('ignores bidirectional marks and other conversations', () => {
    expect(
      resolveEntryTargets({
        entry: entry({ replyTo: { text: 'hoi!' } }),
        entries: [
          entry({
            id: 'other',
            text: 'hoi!',
            conversation: { id: 'whatsapp:business:Other', title: 'Other' }
          }),
          entry({ id: 'marked', text: '‪hoi!‬' })
        ]
      })
    ).toMatchObject({ replyTo: { id: 'marked' } });
  });

  test('keeps the entry when no message matches', () => {
    const unresolved = reaction({});

    expect(
      resolveEntryTargets({
        entry: unresolved,
        entries: [entry({ id: 'other', text: 'bye' })]
      })
    ).toBe(unresolved);
  });
});
