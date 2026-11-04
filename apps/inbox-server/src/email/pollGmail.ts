import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import fetchGmail from './fetchGmail';
import { gmailHistorySchema, gmailProfileSchema } from './gmailSchema';
import parseIgnoredSenders from './parseIgnoredSenders';
import readGmailEntry from './readGmailEntry';
import env from '../env';
import appendInboxEntry from '../inbox/appendInboxEntry';
import readInboxEntries from '../inbox/readInboxEntries';
import readInboxState from '../inbox/readInboxState';
import updateInboxState from '../inbox/updateInboxState';

const KEPT_LABELS = ['INBOX', 'SENT'];

/**
 * Polls Gmail for each account in `GMAIL_ACCOUNTS` and appends each new message
 * in `INBOX` or `SENT` to the inbox. It reads the Gmail history from the
 * `historyId` of each account in `inbox/state.json`. An account without a
 * `historyId` starts at the current one and imports no old mail. When Gmail no
 * longer knows a `historyId`, the account starts again at the current one, and
 * the poll logs the gap. It writes the body file before the entry, so an entry
 * never points to a missing file. It reads `IGNORED_SENDERS_FILE` on each poll.
 * A failed account does not stop the other accounts. It never returns.
 *
 * @param seenIds - The ids in the inbox file. The poll drops a repeat.
 * @returns A promise that never resolves.
 */
const pollGmail = async (seenIds: Set<string>) => {
  const historyIds = { ...(await readInboxState()).gmailHistoryIds };
  const knownMessageIds = new Map<string, string>();

  for (const entry of await readInboxEntries()) {
    if (entry.source.channel === 'email' && entry.source.rfcMessageId) {
      knownMessageIds.set(
        `${entry.source.account} ${entry.source.rfcMessageId}`,
        entry.id
      );
    }
  }

  await mkdir(join(env.INBOX_DIR, 'bodies'), { recursive: true });
  console.info(`Gmail poll started for ${env.GMAIL_ACCOUNTS.length} accounts`);

  while (true) {
    const ignoredSenders = parseIgnoredSenders(
      await readFile(env.IGNORED_SENDERS_FILE, 'utf8').catch(() => '')
    );

    for (const account of env.GMAIL_ACCOUNTS) {
      try {
        const startHistoryId = historyIds[account];
        const pages = [];
        let pageToken = '';

        while (startHistoryId) {
          const page = await fetchGmail({
            account,
            path: `history?startHistoryId=${startHistoryId}&historyTypes=messageAdded${pageToken && `&pageToken=${pageToken}`}`,
            schema: gmailHistorySchema
          });

          if (!page) {
            break;
          }

          pages.push(page);
          pageToken = page.nextPageToken ?? '';

          if (!pageToken) {
            break;
          }
        }

        if (pages.length === 0) {
          const profile = await fetchGmail({
            account,
            path: 'profile',
            schema: gmailProfileSchema
          });

          console.info(
            startHistoryId
              ? `Gmail history of ${account} is gone. Restart at now. Mail since the last poll is not in the inbox.`
              : `Gmail poll of ${account} starts at now`
          );
          historyIds[account] = profile?.historyId ?? '';
          await updateInboxState({ gmailHistoryIds: { ...historyIds } });
          continue;
        }

        const added = pages
          .flatMap((page) => page.history)
          .flatMap((record) => record.messagesAdded)
          .map((record) => record.message)
          .filter(
            (message) =>
              message.labelIds.some((label) => KEPT_LABELS.includes(label)) &&
              !message.labelIds.includes('DRAFT')
          );

        for (const messageId of new Set(added.map((message) => message.id))) {
          if (seenIds.has(`email:${account}:${messageId}`)) {
            continue;
          }

          const mapped = await readGmailEntry({
            account,
            messageId,
            ignoredSenders,
            knownMessageIds
          });

          if (!mapped) {
            continue;
          }

          if (mapped.body.content) {
            await writeFile(mapped.body.path, mapped.body.content);
          }

          const { entry } = mapped;
          const appended = await appendInboxEntry({ entry, seenIds });

          if (
            appended &&
            entry.source.channel === 'email' &&
            entry.source.rfcMessageId
          ) {
            knownMessageIds.set(
              `${account} ${entry.source.rfcMessageId}`,
              entry.id
            );
          }
        }

        historyIds[account] = pages.at(-1)?.historyId ?? startHistoryId ?? '';
        await updateInboxState({ gmailHistoryIds: { ...historyIds } });
      } catch (error) {
        console.error(`Gmail poll failed for ${account}`, error);
      }
    }

    await Bun.sleep(env.GMAIL_POLL_SECONDS * 1000);
  }
};

export default pollGmail;
