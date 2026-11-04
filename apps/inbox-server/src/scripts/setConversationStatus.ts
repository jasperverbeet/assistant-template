import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

import {
  CONVERSATION_STATUSES,
  INBOX_ENTRY_VERSION,
  TRIAGE_CLASSES,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';
import { z } from 'zod';

import appendInboxEntry from '../inbox/appendInboxEntry';
import readInboxEntries from '../inbox/readInboxEntries';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    class: { type: 'string' },
    log: { type: 'string' }
  }
});
const [conversationId, status, until] = z
  .tuple([
    z.string().min(1),
    z.enum(CONVERSATION_STATUSES),
    z.iso.datetime({ offset: true }).optional()
  ])
  .parse(positionals);
const triageClass = z.enum(TRIAGE_CLASSES).optional().parse(values.class);
const now = new Date().toISOString();
const last = (await readInboxEntries()).findLast(
  (entry) => entry.conversation.id === conversationId
);

if (!last) {
  console.error(`Unknown conversation: ${conversationId}`);
  process.exit(1);
}

await appendInboxEntry({
  entry: inboxEntrySchema.parse({
    v: INBOX_ENTRY_VERSION,
    id: `status:${randomUUID()}`,
    kind: 'status',
    conversation: last.conversation,
    author: { name: 'assistant' },
    fromMe: true,
    sentAt: now,
    receivedAt: now,
    status,
    until,
    class: triageClass,
    log: values.log,
    source: { channel: 'assistant' }
  }),
  seenIds: new Set()
});
console.info(`${conversationId} is ${status}`);
