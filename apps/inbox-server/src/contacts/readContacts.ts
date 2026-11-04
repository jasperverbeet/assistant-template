import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { contactsFileSchema } from './contactSchema';
import env from '../env';

export const CONTACTS_FILE = join(env.INBOX_DIR, 'contacts.json');

/**
 * Reads and validates `inbox/contacts.json`. A missing file gives an empty
 * list. The schema normalizes each identity, so a reader compares the values
 * with `===`.
 *
 * @returns The contacts in file order.
 */
const readContacts = async () => {
  const content = await readFile(CONTACTS_FILE, 'utf8').catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        return '{"v":1,"contacts":[]}';
      }

      throw error;
    }
  );

  return contactsFileSchema.parse(JSON.parse(content)).contacts;
};

export default readContacts;
