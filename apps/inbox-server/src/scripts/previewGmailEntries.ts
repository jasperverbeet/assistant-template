import { readFile } from 'node:fs/promises';

import fetchGmail from '../email/fetchGmail';
import { gmailMessageListSchema } from '../email/gmailSchema';
import parseIgnoredSenders from '../email/parseIgnoredSenders';
import readGmailEntry from '../email/readGmailEntry';
import env from '../env';

const DEFAULT_COUNT = 3;

const count = Number(process.argv[2] ?? DEFAULT_COUNT);
const knownMessageIds = new Map<string, string>();
const ignoredSenders = parseIgnoredSenders(
  await readFile(env.IGNORED_SENDERS_FILE, 'utf8').catch(() => '')
);

for (const account of env.GMAIL_ACCOUNTS) {
  const list = await fetchGmail({
    account,
    path: `messages?maxResults=${count}&q=${encodeURIComponent('in:inbox OR in:sent')}`,
    schema: gmailMessageListSchema
  });

  for (const { id } of (list?.messages ?? []).reverse()) {
    const mapped = await readGmailEntry({
      account,
      messageId: id,
      ignoredSenders,
      knownMessageIds
    });

    if (mapped?.entry.source.channel === 'email') {
      knownMessageIds.set(
        `${account} ${mapped.entry.source.rfcMessageId}`,
        mapped.entry.id
      );
    }

    console.info(
      mapped
        ? JSON.stringify(mapped.entry, null, 2)
        : `Skipped email:${account}:${id}`
    );
  }
}
