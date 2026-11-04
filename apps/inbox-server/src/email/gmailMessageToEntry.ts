import { createHash } from 'node:crypto';
import { join } from 'node:path';

import {
  INBOX_ENTRY_VERSION,
  INBOX_TEXT_LIMIT,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';
import type { Attachment } from '@assistant/protocol/inboxEntrySchema';

import type { GmailMessage, GmailPart } from './gmailSchema';
import parseAddressList from './parseAddressList';
import trimQuotedText from './trimQuotedText';

const SUBJECT_PREFIX =
  /^(?:\s*(?:re|fwd?|aw|antw|wg|doorst)\s*(?:\[\d+\])?\s*:\s*)+/i;
const MESSAGE_ID = /<[^<>\s]+>/g;
const INVISIBLE = /[\u00ad\u034f\u200b-\u200d\u2060\ufeff]/g;
const CHARSET = /charset="?([^";\s]+)/i;
const BODY_HASH_LENGTH = 16;
const ATTACHMENT_KINDS = ['image', 'video', 'audio'] as const;
const HTML_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'"
};

interface GmailMessageToEntryOptions {
  message: GmailMessage;
  account: string;
  knownMessageIds: Map<string, string>;
  bodiesDir: string;
  receivedAt: string;
}

/**
 * Maps a Gmail message of one account to an inbox entry of the kind `message`.
 * The rules:
 *
 * - The id is `email:<account>:<gmail message id>`. The conversation id is
 *   `email:<account>:<gmail thread id>`. The title is the subject without `Re:`
 *   and `Fwd:` prefixes.
 * - `fromMe` is `true` for the label `SENT` or a `From` address that equals the
 *   account.
 * - `sentAt` comes from the `Date` header, or else from `internalDate`.
 * - `text` is the plain text part, or else the HTML part as text, with `\n` line
 *   ends and without the quoted history. An empty text gives the snippet.
 * - `replyTo.id` is the entry of the `In-Reply-To` message, or else of the last
 *   known `References` message. `knownMessageIds` maps `<account> <Message-ID>`
 *   to an entry id, so a link never crosses accounts.
 * - The HTML part, or else the plain text part, is the body for `inbox/bodies/`.
 *   The caller writes it.
 * - Each part with a file name is an attachment with metadata only. An inline
 *   part with a `Content-ID`, such as a logo in a signature, is skipped.
 *
 * @param options - The message, the account, the known Message-IDs, the bodies
 *   folder, and the time the server received it.
 * @returns The validated entry and the body to write.
 */
const gmailMessageToEntry = ({
  message,
  account,
  knownMessageIds,
  bodiesDir,
  receivedAt
}: GmailMessageToEntryOptions) => {
  const header = (part: GmailPart, name: string) =>
    part.headers?.find(
      (candidate) => candidate.name.toLowerCase() === name.toLowerCase()
    )?.value;
  const decode = (part: GmailPart) => {
    const bytes = Buffer.from(part.body?.data ?? '', 'base64url');
    const charset = CHARSET.exec(header(part, 'Content-Type') ?? '')?.[1];

    try {
      return new TextDecoder(charset ?? 'utf-8').decode(bytes);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  };
  const htmlToText = (html: string) =>
    html
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h\d|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&#(\d+);/g, (_match, code: string) =>
        String.fromCodePoint(Number(code))
      )
      .replace(
        /&([a-z]+);/gi,
        (match, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? match
      );

  const found: { plain?: string; html?: string } = {};
  const attachments: Attachment[] = [];
  const walk = (part: GmailPart) => {
    const disposition = header(part, 'Content-Disposition') ?? '';

    if (
      part.filename &&
      /^inline/i.test(disposition) &&
      header(part, 'Content-ID')
    ) {
      return;
    }

    if (part.filename) {
      attachments.push({
        kind:
          ATTACHMENT_KINDS.find((kind) =>
            part.mimeType.startsWith(`${kind}/`)
          ) ?? 'file',
        name: part.filename,
        mimeType: part.mimeType,
        paths: []
      });
      return;
    }

    if (part.mimeType === 'text/plain') {
      found.plain ??= decode(part);
    }

    if (part.mimeType === 'text/html') {
      found.html ??= decode(part);
    }

    part.parts?.forEach(walk);
  };

  walk(message.payload);

  const { payload } = message;
  const { plain, html } = found;
  const author = parseAddressList(header(payload, 'From'))[0];
  const subject = header(payload, 'Subject')?.trim() ?? '';
  const dateHeader = new Date(header(payload, 'Date') ?? '');
  const sentAt = Number.isNaN(dateHeader.getTime())
    ? new Date(Number(message.internalDate))
    : dateHeader;
  const rfcMessageId = header(payload, 'Message-ID')?.match(MESSAGE_ID)?.[0];
  const parentIds = [
    ...(header(payload, 'In-Reply-To')?.match(MESSAGE_ID) ?? []),
    ...(header(payload, 'References')?.match(MESSAGE_ID) ?? []).reverse()
  ];
  const replyToId = parentIds
    .map((parentId) => knownMessageIds.get(`${account} ${parentId}`))
    .find(Boolean);
  const text =
    trimQuotedText(
      (plain?.trim() ? plain : htmlToText(html ?? ''))
        .replace(/\r\n?/g, '\n')
        .replace(INVISIBLE, '')
        .replace(/[ \t\u00a0]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
    ) || message.snippet;
  const id = `email:${account}:${message.id}`;
  const bodyContent = html ?? plain ?? '';
  const bodyExtension = html === undefined ? 'txt' : 'html';
  const bodyPath = join(
    bodiesDir,
    `${createHash('sha256').update(id).digest('hex').slice(0, BODY_HASH_LENGTH)}.${bodyExtension}`
  );

  const entry = inboxEntrySchema.parse({
    v: INBOX_ENTRY_VERSION,
    id,
    kind: 'message',
    conversation: {
      id: `email:${account}:${message.threadId}`,
      title: subject.replace(SUBJECT_PREFIX, '').trim() || '(no subject)'
    },
    author,
    fromMe: message.labelIds.includes('SENT') || author?.address === account,
    sentAt: sentAt.toISOString(),
    receivedAt,
    to: parseAddressList(header(payload, 'To')),
    cc: parseAddressList(header(payload, 'Cc')),
    subject: subject.slice(0, 500),
    text: text.slice(0, INBOX_TEXT_LIMIT),
    body: bodyContent
      ? {
          path: bodyPath,
          mimeType: html === undefined ? 'text/plain' : 'text/html',
          bytes: Buffer.byteLength(bodyContent)
        }
      : undefined,
    attachments,
    replyTo: replyToId ? { id: replyToId } : undefined,
    links: [`https://mail.google.com/mail/u/${account}/#all/${message.id}`],
    source: {
      channel: 'email',
      account,
      messageId: message.id,
      threadId: message.threadId,
      rfcMessageId,
      labels: message.labelIds
    }
  });

  return { entry, body: { path: bodyPath, content: bodyContent } };
};

export default gmailMessageToEntry;
