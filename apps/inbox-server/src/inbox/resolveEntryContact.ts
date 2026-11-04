import type { InboxEntry } from '@assistant/protocol/inboxEntrySchema';

import { identitySchema } from '../contacts/contactSchema';
import type { Contact } from '../contacts/contactSchema';

interface ResolveEntryContactOptions {
  entry: InboxEntry;
  contacts: Contact[];
}

/**
 * Sets `author.contactId` on an entry when the identity of the entry exactly
 * equals an identity of a contact. It never guesses on names. It skips an entry
 * from the owner. A WhatsApp entry gives the identity `<account>:<conversation
 * title>`. A GitHub or email entry gives the identity from `author.address`.
 * Other entries stay as they are.
 *
 * @param options - The entry and the contacts.
 * @returns The entry, with `author.contactId` when a contact matches.
 */
const resolveEntryContact = ({
  entry,
  contacts
}: ResolveEntryContactOptions) => {
  if (entry.fromMe) {
    return entry;
  }

  const { source } = entry;
  const parsed = identitySchema.safeParse(
    source.channel === 'whatsapp'
      ? {
          kind: 'whatsapp',
          value: `${source.account}:${entry.conversation.title}`
        }
      : { kind: source.channel, value: entry.author?.address }
  );

  if (!parsed.success) {
    return entry;
  }

  const identity = parsed.data;
  const contact = contacts.find((candidate) =>
    candidate.identities.some(
      (known) => known.kind === identity.kind && known.value === identity.value
    )
  );

  if (!contact) {
    return entry;
  }

  return {
    ...entry,
    author: {
      ...(entry.author ?? { name: contact.name }),
      contactId: contact.id
    }
  };
};

export default resolveEntryContact;
