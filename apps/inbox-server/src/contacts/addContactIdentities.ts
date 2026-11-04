import type { Contact, Identity } from './contactSchema';

interface AddContactIdentitiesOptions {
  contacts: Contact[];
  contactId?: string;
  name?: string;
  identities: Identity[];
  newId: string;
}

/**
 * Adds identities to one contact, or creates a contact when no `contactId` is
 * given. A given `name` renames the contact. An identity that the contact has
 * already is skipped. The function throws when another contact has one of the
 * identities, so one identity always resolves to at most one contact.
 *
 * @param options - The contacts, the target contact id or a new name, the
 *   normalized identities, and the id for a new contact.
 * @returns The changed contacts and the id of the target contact.
 */
const addContactIdentities = ({
  contacts,
  contactId,
  name,
  identities,
  newId
}: AddContactIdentitiesOptions) => {
  const targetId = contactId ?? newId;
  const target = contacts.find((contact) => contact.id === targetId);

  if (contactId && !target) {
    throw new Error(`Unknown contact: ${contactId}`);
  }

  const isSame = (left: Identity, right: Identity) =>
    left.kind === right.kind && left.value === right.value;

  for (const identity of identities) {
    const owner = contacts.find(
      (contact) =>
        contact.id !== targetId &&
        contact.identities.some((known) => isSame(known, identity))
    );

    if (owner) {
      throw new Error(
        `Identity ${identity.kind}:${identity.value} belongs to ${owner.id}`
      );
    }
  }

  const base = target ?? { id: newId, name: name ?? '', identities: [] };

  if (!base.name) {
    throw new Error('A new contact needs a name');
  }

  const updated: Contact = {
    id: base.id,
    name: name ?? base.name,
    identities: [
      ...base.identities,
      ...identities.filter(
        (identity, index) =>
          !base.identities.some((known) => isSame(known, identity)) &&
          identities.findIndex((other) => isSame(other, identity)) === index
      )
    ]
  };

  return {
    contactId: updated.id,
    contacts: target
      ? contacts.map((contact) => (contact.id === targetId ? updated : contact))
      : [...contacts, updated]
  };
};

export default addContactIdentities;
