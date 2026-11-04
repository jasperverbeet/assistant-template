import { randomUUID } from 'node:crypto';
import { rename, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import addContactIdentities from '../contacts/addContactIdentities';
import { identitySchema } from '../contacts/contactSchema';
import readContacts, { CONTACTS_FILE } from '../contacts/readContacts';

const IDENTITY_KINDS = ['whatsapp', 'phone', 'email', 'github'] as const;

const { values } = parseArgs({
  options: {
    id: { type: 'string' },
    name: { type: 'string' },
    whatsapp: { type: 'string', multiple: true, default: [] },
    phone: { type: 'string', multiple: true, default: [] },
    email: { type: 'string', multiple: true, default: [] },
    github: { type: 'string', multiple: true, default: [] }
  }
});

const identities = z
  .array(identitySchema)
  .parse(
    IDENTITY_KINDS.flatMap((kind) =>
      values[kind].map((value) => ({ kind, value }))
    )
  );

const { contacts, contactId } = addContactIdentities({
  contacts: await readContacts(),
  contactId: values.id,
  name: values.name,
  identities,
  newId: `contact:${randomUUID()}`
});
const temporaryFile = `${CONTACTS_FILE}.tmp`;

await writeFile(
  temporaryFile,
  `${JSON.stringify({ v: 1, contacts }, null, 2)}\n`
);
await rename(temporaryFile, CONTACTS_FILE);
console.info(contactId);
