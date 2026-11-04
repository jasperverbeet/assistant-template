import { describe, expect, test } from 'bun:test';

import gmailMessageToEntry from './gmailMessageToEntry';
import { gmailMessageSchema } from './gmailSchema';
import type { GmailPart } from './gmailSchema';

const account = 'owner@example.com';
const receivedAt = '2026-11-04T10:00:05.000Z';

describe('gmailMessageToEntry', () => {
  const encode = (text: string) => Buffer.from(text).toString('base64url');
  const message = (
    headers: Record<string, string>,
    parts: GmailPart[],
    labelIds = ['INBOX', 'UNREAD']
  ) =>
    gmailMessageSchema.parse({
      id: '18f2a9c0d1e2f3a4',
      threadId: '18f2a9b000000000',
      labelIds,
      snippet: 'Snippet text',
      internalDate: '1793786400000',
      payload: {
        mimeType: 'multipart/mixed',
        headers: Object.entries(headers).map(([name, value]) => ({
          name,
          value
        })),
        parts
      }
    });
  const plainPart = (text: string) => ({
    mimeType: 'text/plain',
    filename: '',
    headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }],
    body: { data: encode(text) }
  });
  const inbound = message(
    {
      From: 'Example Customer <Customer@Example.com>',
      To: 'Alex Owner <owner@example.com>',
      Cc: '"Last, First" <first@example.com>',
      Subject: 'RE: Fwd: Question about the import',
      Date: 'Wed, 4 Nov 2026 10:59:00 +0100',
      'Message-ID': '<reply-1@example.com>',
      'In-Reply-To': '<original-1@example.com>',
      References: '<root@example.com> <original-1@example.com>'
    },
    [
      {
        mimeType: 'multipart/alternative',
        filename: '',
        parts: [
          plainPart(
            'Hi Alex,\r\n\r\nIt works now.\r\n\r\nOn Tue, 3 Nov 2026 at 10:00, Alex Owner <owner@example.com> wrote:\r\n> Can you try again?'
          ),
          {
            mimeType: 'text/html',
            filename: '',
            body: { data: encode('<p>Hi Alex,</p><p>It works now.</p>') }
          }
        ]
      },
      {
        mimeType: 'application/pdf',
        filename: 'invoice.pdf',
        headers: [
          { name: 'Content-Disposition', value: 'attachment; filename=x' }
        ],
        body: { attachmentId: 'a1', size: 1000 }
      },
      {
        mimeType: 'image/png',
        filename: 'logo.png',
        headers: [
          { name: 'Content-Disposition', value: 'inline; filename=logo.png' },
          { name: 'Content-ID', value: '<logo>' }
        ],
        body: { attachmentId: 'a2', size: 100 }
      }
    ]
  );

  test('maps an inbound reply with its chain', () => {
    const { entry, body } = gmailMessageToEntry({
      message: inbound,
      account,
      knownMessageIds: new Map([
        [
          `${account} <original-1@example.com>`,
          `email:${account}:18f2a9b000000000`
        ],
        ['other@example.org <original-1@example.com>', 'email:other']
      ]),
      bodiesDir: '/inbox/bodies',
      receivedAt
    });

    expect(entry).toMatchObject({
      id: `email:${account}:18f2a9c0d1e2f3a4`,
      kind: 'message',
      conversation: {
        id: `email:${account}:18f2a9b000000000`,
        title: 'Question about the import'
      },
      author: { name: 'Example Customer', address: 'customer@example.com' },
      to: [{ name: 'Alex Owner', address: account }],
      cc: [{ name: 'Last, First', address: 'first@example.com' }],
      fromMe: false,
      sentAt: '2026-11-04T09:59:00.000Z',
      subject: 'RE: Fwd: Question about the import',
      text: 'Hi Alex,\n\nIt works now.',
      attachments: [
        {
          kind: 'file',
          name: 'invoice.pdf',
          mimeType: 'application/pdf',
          paths: []
        }
      ],
      replyTo: { id: `email:${account}:18f2a9b000000000` },
      source: {
        channel: 'email',
        account,
        messageId: '18f2a9c0d1e2f3a4',
        threadId: '18f2a9b000000000',
        rfcMessageId: '<reply-1@example.com>',
        labels: ['INBOX', 'UNREAD']
      }
    });
    expect(entry.kind === 'message' && entry.body?.mimeType).toBe('text/html');
    expect(body.path).toMatch(/^\/inbox\/bodies\/[0-9a-f]{16}\.html$/);
    expect(body.content).toContain('It works now.');
  });

  test('falls back to the last known References id', () => {
    const { entry } = gmailMessageToEntry({
      message: inbound,
      account,
      knownMessageIds: new Map([
        [`${account} <root@example.com>`, `email:${account}:root`]
      ]),
      bodiesDir: '/inbox/bodies',
      receivedAt
    });

    expect(entry.kind === 'message' && entry.replyTo).toEqual({
      id: `email:${account}:root`
    });
  });

  test('marks a sent message as from the owner and uses the HTML text', () => {
    const { entry, body } = gmailMessageToEntry({
      message: message(
        {
          From: `Alex Owner <${account}>`,
          To: 'customer@example.com',
          Subject: 'Offer'
        },
        [
          {
            mimeType: 'text/html',
            filename: '',
            body: {
              data: encode(
                '<style>p{}</style><div>Hoi,<br>Hierbij de offerte &amp; planning.</div>'
              )
            }
          }
        ],
        ['SENT']
      ),
      account,
      knownMessageIds: new Map(),
      bodiesDir: '/inbox/bodies',
      receivedAt
    });

    expect(entry).toMatchObject({
      fromMe: true,
      sentAt: '2026-11-04T10:00:00.000Z',
      conversation: { title: 'Offer' },
      text: 'Hoi,\nHierbij de offerte & planning.'
    });
    expect(entry.kind === 'message' && entry.replyTo).toBeUndefined();
    expect(body.path).toEndWith('.html');
  });

  test('keeps a plain text body as a text file', () => {
    const { entry, body } = gmailMessageToEntry({
      message: message({ From: 'a@example.com' }, [plainPart('Short note')]),
      account,
      knownMessageIds: new Map(),
      bodiesDir: '/inbox/bodies',
      receivedAt
    });

    expect(entry).toMatchObject({
      conversation: { title: '(no subject)' },
      text: 'Short note'
    });
    expect(body.path).toEndWith('.txt');
  });
});
