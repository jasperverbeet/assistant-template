import { inboxEntrySchema } from '@assistant/protocol/inboxEntrySchema';
import { describe, expect, test } from 'bun:test';

import resolveEntryContact from './resolveEntryContact';
import { contactSchema } from '../contacts/contactSchema';

describe('resolveEntryContact', () => {
  const contacts = [
    contactSchema.parse({
      id: 'contact:00000000-0000-4000-8000-000000000001',
      name: 'Example Customer',
      identities: [
        { kind: 'whatsapp', value: 'business:Example Customer' },
        { kind: 'email', value: 'Customer@Example.com ' },
        { kind: 'github', value: 'Example-Reviewer' }
      ]
    })
  ];
  const contactId = contacts[0]?.id;
  const whatsapp = (title: string, fromMe = false) =>
    inboxEntrySchema.parse({
      v: 3,
      id: `whatsapp:business:preview:${title}`,
      kind: 'message',
      conversation: { id: `whatsapp:business:${title}`, title },
      fromMe,
      sentAt: '2026-11-03T20:00:00.000Z',
      receivedAt: '2026-11-03T20:00:00.000Z',
      text: 'hoi',
      source: {
        channel: 'whatsapp',
        account: 'business',
        via: 'chatList',
        time: '21:00'
      }
    });

  test('resolves a WhatsApp chat by its exact title', () => {
    expect(
      resolveEntryContact({ entry: whatsapp('Example Customer'), contacts })
    ).toMatchObject({ author: { name: 'Example Customer', contactId } });
  });

  test('does not guess on a similar title', () => {
    expect(
      resolveEntryContact({ entry: whatsapp('Example Customer 2'), contacts })
    ).not.toHaveProperty('author');
  });

  test('skips an entry from the owner', () => {
    expect(
      resolveEntryContact({
        entry: whatsapp('Example Customer', true),
        contacts
      })
    ).not.toHaveProperty('author');
  });

  test('resolves a GitHub login without case', () => {
    const entry = inboxEntrySchema.parse({
      v: 3,
      id: 'github:1:mention:c1',
      kind: 'message',
      conversation: { id: 'github:example-org/example-repo#1', title: 'PR' },
      author: { name: 'example-reviewer', address: 'EXAMPLE-reviewer' },
      fromMe: false,
      sentAt: '2026-11-03T20:00:00.000Z',
      receivedAt: '2026-11-03T20:00:00.000Z',
      text: 'hi',
      source: {
        channel: 'github',
        threadId: '1',
        repo: 'example-org/example-repo',
        type: 'PullRequest',
        reason: 'mention',
        url: null,
        updatedAt: '2026-11-03T20:00:00Z'
      }
    });

    expect(resolveEntryContact({ entry, contacts })).toMatchObject({
      author: { name: 'example-reviewer', contactId }
    });
  });

  test('resolves an email address after normalization', () => {
    const entry = inboxEntrySchema.parse({
      v: 3,
      id: 'email:a:1',
      kind: 'message',
      conversation: { id: 'email:a:t', title: 'Question' },
      author: { name: 'Customer', address: 'customer@example.com' },
      fromMe: false,
      sentAt: '2026-11-03T20:00:00.000Z',
      receivedAt: '2026-11-03T20:00:00.000Z',
      text: 'hi',
      source: { channel: 'email', account: 'a', messageId: '1', threadId: 't' }
    });

    expect(resolveEntryContact({ entry, contacts })).toMatchObject({
      author: { contactId }
    });
  });
});
