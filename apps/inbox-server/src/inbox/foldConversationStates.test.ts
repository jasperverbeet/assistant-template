import { inboxEntrySchema } from '@assistant/protocol/inboxEntrySchema';
import { describe, expect, test } from 'bun:test';

import foldConversationStates from './foldConversationStates';

describe('foldConversationStates', () => {
  const now = new Date('2026-11-04T09:00:00.000Z');
  let sequence = 0;

  const entry = (fields: Record<string, unknown>) => {
    sequence += 1;

    return inboxEntrySchema.parse({
      v: 3,
      id: `test:${sequence}`,
      kind: 'message',
      conversation: { id: 'whatsapp:business:Example', title: 'Example' },
      fromMe: false,
      sentAt: `2026-11-03T20:${String(sequence).padStart(2, '0')}:00.000Z`,
      receivedAt: `2026-11-03T20:${String(sequence).padStart(2, '0')}:00.000Z`,
      text: `text ${sequence}`,
      source: {
        channel: 'whatsapp',
        account: 'business',
        via: 'chatList',
        time: '21:00'
      },
      ...fields
    });
  };
  const status = (fields: Record<string, unknown>) =>
    entry({
      kind: 'status',
      fromMe: true,
      source: { channel: 'assistant' },
      ...fields
    });
  const statusOf = (entries: ReturnType<typeof entry>[]) =>
    foldConversationStates({ entries, now })[0]?.status;

  test('starts a conversation as open', () => {
    expect(statusOf([entry({})])).toBe('open');
  });

  test('applies a status entry', () => {
    expect(statusOf([entry({}), status({ status: 'waiting_on_me' })])).toBe(
      'waiting_on_me'
    );
  });

  test('reopens a done conversation on an inbound message', () => {
    expect(statusOf([entry({}), status({ status: 'done' }), entry({})])).toBe(
      'open'
    );
  });

  test('waits on them after a message from the owner', () => {
    expect(statusOf([entry({}), entry({ fromMe: true })])).toBe(
      'waiting_on_them'
    );
  });

  test('closes on a reaction from the owner and ignores other reactions', () => {
    expect(
      statusOf([entry({}), entry({ kind: 'reaction', fromMe: true })])
    ).toBe('done');
    expect(
      statusOf([
        entry({}),
        status({ status: 'done' }),
        entry({ kind: 'reaction' })
      ])
    ).toBe('done');
  });

  test('keeps the status on a note', () => {
    expect(
      statusOf([
        entry({}),
        status({ status: 'waiting_on_me' }),
        entry({ kind: 'note', source: { channel: 'assistant' } })
      ])
    ).toBe('waiting_on_me');
  });

  test('keeps a snooze until it ends, then opens', () => {
    expect(
      statusOf([
        entry({}),
        status({ status: 'snoozed', until: '2026-11-05T08:00:00+01:00' })
      ])
    ).toBe('snoozed');
    expect(
      statusOf([
        entry({}),
        status({ status: 'snoozed', until: '2026-11-04T08:00:00+01:00' })
      ])
    ).toBe('open');
  });

  test('keeps the last text and the conversations apart', () => {
    const states = foldConversationStates({
      entries: [
        entry({ text: 'first' }),
        entry({
          conversation: { id: 'job:sync', title: 'sync' },
          source: { channel: 'job', job: 'sync', ok: true, notify: false }
        }),
        status({ status: 'done' })
      ],
      now
    });

    expect(states).toHaveLength(2);
    expect(states[0]).toMatchObject({ status: 'done', lastText: 'first' });
    expect(states[1]).toMatchObject({ status: 'open' });
  });
});
