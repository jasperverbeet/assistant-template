import type {
  ConversationStatus,
  InboxEntry
} from '@assistant/protocol/inboxEntrySchema';

interface FoldConversationStatesOptions {
  entries: InboxEntry[];
  now: Date;
}

/**
 * Computes the current state of each conversation from the inbox entries. It
 * reads the entries in file order, because that is the order in which the
 * server saw them. The rules:
 *
 * - The first entry of a conversation starts it as `open`.
 * - A `status` entry sets the status and `until`.
 * - A message that is not from the owner sets `open`. This also ends a snooze and
 *   reopens a `done` conversation.
 * - A message from the owner sets `waiting_on_them`.
 * - A reaction from the owner sets `done`. Another reaction and a note change
 *   nothing.
 * - `lastAt` is the `sentAt` of the last entry that is not a status.
 * - At the end, a snooze whose `until` is at or before `now` becomes `open`.
 *
 * @param options - The entries in file order and the current time.
 * @returns One state per conversation, in order of first appearance.
 */
const foldConversationStates = ({
  entries,
  now
}: FoldConversationStatesOptions) => {
  const states = new Map<
    string,
    {
      conversation: InboxEntry['conversation'];
      status: ConversationStatus;
      until?: string;
      statusAt: string;
      lastAt: string;
      lastText: string;
    }
  >();

  for (const entry of entries) {
    const state = states.get(entry.conversation.id) ?? {
      conversation: entry.conversation,
      status: 'open',
      statusAt: entry.receivedAt,
      lastAt: entry.sentAt,
      lastText: ''
    };
    const setStatus = (status: ConversationStatus, until?: string) => {
      state.status = status;
      state.until = until;
      state.statusAt = entry.receivedAt;
    };

    states.set(entry.conversation.id, state);

    if (entry.kind === 'status') {
      setStatus(entry.status, entry.until);
      continue;
    }

    state.conversation = entry.conversation;
    state.lastAt = entry.sentAt;
    state.lastText = entry.text;

    if (entry.kind === 'message') {
      setStatus(entry.fromMe ? 'waiting_on_them' : 'open');
      continue;
    }

    if (entry.kind === 'reaction' && entry.fromMe) {
      setStatus('done');
    }
  }

  return [...states.values()].map((state) =>
    state.status === 'snoozed' && state.until && new Date(state.until) <= now
      ? { ...state, status: 'open' as const, until: undefined }
      : state
  );
};

export default foldConversationStates;
