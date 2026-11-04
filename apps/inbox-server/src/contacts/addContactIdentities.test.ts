import { describe, expect, test } from 'bun:test';
import { z } from 'zod';

import addContactIdentities from './addContactIdentities';
import { identitySchema } from './contactSchema';

describe('addContactIdentities', () => {
  const FIRST_ID = 'contact:00000000-0000-4000-8000-000000000001';
  const SECOND_ID = 'contact:00000000-0000-4000-8000-000000000002';
  const identities = (raw: { kind: string; value: string }[]) =>
    z.array(identitySchema).parse(raw);

  test('creates a contact with normalized identities', () => {
    const { contacts, contactId } = addContactIdentities({
      contacts: [],
      name: 'Example Customer',
      identities: identities([
        { kind: 'phone', value: '+31 6 0000-0000' },
        { kind: 'email', value: ' Customer@Example.com' }
      ]),
      newId: FIRST_ID
    });

    expect(contactId).toBe(FIRST_ID);
    expect(contacts[0]?.identities).toEqual([
      { kind: 'phone', value: '+31600000000' },
      { kind: 'email', value: 'customer@example.com' }
    ]);
  });

  test('adds to an existing contact without a duplicate', () => {
    const first = addContactIdentities({
      contacts: [],
      name: 'Example Customer',
      identities: identities([{ kind: 'github', value: 'example' }]),
      newId: FIRST_ID
    });
    const { contacts } = addContactIdentities({
      contacts: first.contacts,
      contactId: FIRST_ID,
      identities: identities([
        { kind: 'github', value: 'Example' },
        { kind: 'whatsapp', value: 'business:Example Customer' }
      ]),
      newId: SECOND_ID
    });

    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.identities).toHaveLength(2);
  });

  test('refuses an identity of another contact', () => {
    const { contacts } = addContactIdentities({
      contacts: [],
      name: 'Example Customer',
      identities: identities([{ kind: 'github', value: 'example' }]),
      newId: FIRST_ID
    });

    expect(() =>
      addContactIdentities({
        contacts,
        name: 'Someone Else',
        identities: identities([{ kind: 'github', value: 'EXAMPLE' }]),
        newId: SECOND_ID
      })
    ).toThrow(`belongs to ${FIRST_ID}`);
  });

  test('refuses a new contact without a name and an unknown id', () => {
    expect(() =>
      addContactIdentities({ contacts: [], identities: [], newId: FIRST_ID })
    ).toThrow('needs a name');
    expect(() =>
      addContactIdentities({
        contacts: [],
        contactId: SECOND_ID,
        identities: [],
        newId: FIRST_ID
      })
    ).toThrow('Unknown contact');
  });
});
