import { fileURLToPath } from 'node:url';

import { whatsappChatRowSchema } from '@assistant/protocol/whatsappChatRowSchema';
import { z } from 'zod';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const CHAT_READ_TIMEOUT_MS = 120_000;

interface ReadWhatsappChatRowsOptions {
  account: 'personal' | 'business';
  chat: string;
  count: number;
}

/**
 * Reads the last messages of a WhatsApp chat through the Dia script
 * `apps/dia/src/scripts/readWhatsappChat.ts`. The script opens the chat in
 * WhatsApp Web, so WhatsApp marks the chat as read. It saves media to
 * `inbox/media/`. The read stops after two minutes, because a video read takes
 * frames.
 *
 * @param options - The account, the chat title, and the number of messages.
 * @returns The chat rows, oldest first.
 */
const readWhatsappChatRows = async ({
  account,
  chat,
  count
}: ReadWhatsappChatRowsOptions) => {
  const child = Bun.spawn(
    [
      'bun',
      'apps/dia/src/scripts/readWhatsappChat.ts',
      account,
      chat,
      String(count)
    ],
    {
      cwd: REPOSITORY_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: CHAT_READ_TIMEOUT_MS
    }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);

  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `The chat read stopped (${exitCode})`);
  }

  return z.array(whatsappChatRowSchema).parse(JSON.parse(stdout));
};

export default readWhatsappChatRows;
