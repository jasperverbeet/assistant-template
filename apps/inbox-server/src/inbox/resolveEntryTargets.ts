import type { InboxEntry } from '@assistant/protocol/inboxEntrySchema';

import normalizeWhatsappText from '../whatsapp/normalizeWhatsappText';

interface ResolveEntryTargetsOptions {
  entry: InboxEntry;
  entries: InboxEntry[];
}

/**
 * Sets the id of the target of a relation when an earlier entry matches. A
 * reaction with `targetText` gets `targetId`. A message with `replyTo.text`
 * gets `replyTo.id`. A target is a `message` of the same conversation whose
 * normalized text equals the target text. When more than one entry matches, the
 * function takes the best match:
 *
 * 1. For a reaction, a message of the other side. A person reacts to a message of
 *    The owner, and the owner reacts to a message of another person.
 * 2. A WhatsApp chat row before a preview, because the row has the WhatsApp id.
 * 3. The newest entry in file order.
 *
 * It never sets an id that is not in `entries`.
 *
 * @param options - The new entry and the earlier entries in file order.
 * @returns The entry, with the target id when an earlier entry matches.
 */
const resolveEntryTargets = ({
  entry,
  entries
}: ResolveEntryTargetsOptions) => {
  const targetText =
    entry.kind === 'reaction' && !entry.targetId
      ? entry.targetText
      : entry.kind === 'message' && !entry.replyTo?.id
        ? entry.replyTo?.text
        : undefined;

  if (!targetText) {
    return entry;
  }

  const wanted = normalizeWhatsappText(targetText);
  const score = (candidate: InboxEntry) =>
    (entry.kind === 'reaction' && candidate.fromMe !== entry.fromMe ? 2 : 0) +
    (candidate.source.channel === 'whatsapp' && candidate.source.via === 'chat'
      ? 1
      : 0);
  const target = entries
    .filter(
      (candidate) =>
        candidate.kind === 'message' &&
        candidate.id !== entry.id &&
        candidate.conversation.id === entry.conversation.id &&
        normalizeWhatsappText(candidate.text) === wanted
    )
    .reduce<InboxEntry | undefined>(
      (best, candidate) =>
        !best || score(candidate) >= score(best) ? candidate : best,
      undefined
    );

  if (!target) {
    return entry;
  }

  if (entry.kind === 'reaction') {
    return { ...entry, targetId: target.id };
  }

  return entry.kind === 'message'
    ? { ...entry, replyTo: { ...entry.replyTo, id: target.id } }
    : entry;
};

export default resolveEntryTargets;
