import { z } from 'zod';

export const INBOX_ENTRY_VERSION = 3;
export const INBOX_TEXT_LIMIT = 20_000;
export const CONVERSATION_STATUSES = [
  'open',
  'waiting_on_me',
  'waiting_on_them',
  'snoozed',
  'done'
] as const;
export const TRIAGE_CLASSES = [
  'urgent',
  'reply',
  'task',
  'fyi',
  'context',
  'ignore'
] as const;

const personSchema = z.object({
  name: z.string().max(200),
  address: z.string().max(320).optional()
});

export const attachmentSchema = z.object({
  kind: z.enum(['image', 'video', 'audio', 'file']),
  name: z.string().max(300).optional(),
  mimeType: z.string().max(100).optional(),
  paths: z.array(z.string()).default([])
});

export type Attachment = z.infer<typeof attachmentSchema>;

const sourceSchema = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('whatsapp'),
    account: z.enum(['personal', 'business']),
    via: z.enum(['chatList', 'chat']),
    dataId: z.string().optional(),
    time: z.string().max(40),
    unread: z.number().int().positive().optional(),
    media: z.string().max(100).optional(),
    firstSeen: z.boolean().optional(),
    resolvedIds: z.array(z.string()).optional(),
    resolveError: z.string().max(500).optional()
  }),
  z.object({
    channel: z.literal('github'),
    threadId: z.string(),
    repo: z.string(),
    type: z.string(),
    reason: z.string(),
    url: z.string().nullable(),
    updatedAt: z.string(),
    commentId: z.string().optional()
  }),
  z.object({
    channel: z.literal('email'),
    account: z.string(),
    messageId: z.string(),
    threadId: z.string(),
    rfcMessageId: z.string().optional(),
    labels: z.array(z.string()).default([])
  }),
  z.object({
    channel: z.literal('job'),
    job: z.string(),
    ok: z.boolean(),
    notify: z.boolean()
  }),
  z.object({ channel: z.literal('assistant') })
]);

const head = {
  v: z.literal(INBOX_ENTRY_VERSION),
  id: z.string().min(1).max(300)
};

const envelope = {
  conversation: z.object({ id: z.string().min(1), title: z.string() }),
  author: personSchema.extend({ contactId: z.string().optional() }).optional(),
  fromMe: z.boolean(),
  sentAt: z.iso.datetime(),
  receivedAt: z.iso.datetime()
};

const text = z.string().max(INBOX_TEXT_LIMIT);

export const inboxEntrySchema = z.discriminatedUnion('kind', [
  z.object({
    ...head,
    kind: z.literal('message'),
    ...envelope,
    to: z.array(personSchema).optional(),
    cc: z.array(personSchema).optional(),
    subject: z.string().max(500).optional(),
    text,
    body: z
      .object({
        path: z.string(),
        mimeType: z.string().max(100),
        bytes: z.number().int().nonnegative()
      })
      .optional(),
    attachments: z.array(attachmentSchema).default([]),
    replyTo: z
      .object({ id: z.string().optional(), text: z.string().optional() })
      .optional(),
    links: z.array(z.string()).default([]),
    source: sourceSchema
  }),
  z.object({
    ...head,
    kind: z.literal('reaction'),
    ...envelope,
    text,
    emoji: z.string().max(40).optional(),
    targetId: z.string().optional(),
    targetText: z.string().optional(),
    source: sourceSchema
  }),
  z.object({
    ...head,
    kind: z.literal('note'),
    ...envelope,
    text,
    source: sourceSchema
  }),
  z
    .object({
      ...head,
      kind: z.literal('status'),
      ...envelope,
      status: z.enum(CONVERSATION_STATUSES),
      until: z.iso.datetime({ offset: true }).optional(),
      class: z.enum(TRIAGE_CLASSES).optional(),
      log: z.string().max(300).optional(),
      source: sourceSchema
    })
    .refine((entry) => (entry.status === 'snoozed') === Boolean(entry.until), {
      message: 'A snoozed status needs until, and only a snoozed status',
      path: ['until']
    })
]);

export type InboxEntry = z.infer<typeof inboxEntrySchema>;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];
