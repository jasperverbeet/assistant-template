import {
  INBOX_ENTRY_VERSION,
  INBOX_TEXT_LIMIT,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';

import type { JobResult } from './runJob';

interface JobResultToEntryOptions {
  result: JobResult;
  startedAt: string;
  receivedAt: string;
}

/**
 * Maps a job result to an inbox entry of the kind `message`. The id holds the
 * job name and the start time. An empty output gives the text "(no output)".
 *
 * @param options - The job result, the start time, and the time the server
 *   received the result.
 * @returns The validated inbox entry.
 */
const jobResultToEntry = ({
  result,
  startedAt,
  receivedAt
}: JobResultToEntryOptions) =>
  inboxEntrySchema.parse({
    v: INBOX_ENTRY_VERSION,
    id: `job:${result.job}:${startedAt}`,
    kind: 'message',
    conversation: { id: `job:${result.job}`, title: result.job },
    author: { name: result.job },
    fromMe: false,
    sentAt: startedAt,
    receivedAt,
    text: (result.output || '(no output)').slice(0, INBOX_TEXT_LIMIT),
    source: {
      channel: 'job',
      job: result.job,
      ok: result.ok,
      notify: result.notify
    }
  });

export default jobResultToEntry;
