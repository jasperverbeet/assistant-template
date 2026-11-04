import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const envSchema = z.object({
  INBOX_TOKEN: z.string().min(32),
  INBOX_PORT: z.coerce.number().int().positive().default(4319),
  INBOX_DIR: z
    .string()
    .default(fileURLToPath(new URL('../../../inbox', import.meta.url))),
  JOBS_DIR: z
    .string()
    .default(fileURLToPath(new URL('../../../jobs', import.meta.url))),
  IGNORED_SENDERS_FILE: z
    .string()
    .default(
      fileURLToPath(
        new URL('../../../memory/ignored-senders.md', import.meta.url)
      )
    ),
  WHATSAPP_PERSONAL_CHATS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((chat) => chat.trim())
        .filter(Boolean)
    ),
  GITHUB_POLL_SECONDS: z.coerce.number().int().min(60).default(60),
  GMAIL_ACCOUNTS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((account) => account.trim().toLowerCase())
        .filter(Boolean)
    ),
  GMAIL_POLL_SECONDS: z.coerce.number().int().min(30).default(60),
  GOOGLE_CREDENTIALS_DIR: z
    .string()
    .default(join(homedir(), '.google_workspace_mcp/credentials')),
  CHECKOUT_SYNC_PATHS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((path) => path.trim())
        .filter(Boolean)
    ),
  CHECKOUT_SYNC_MINUTES: z.coerce.number().int().min(1).default(5),
  ELEVENLABS_API_KEY: z.string().min(1).optional()
});

const env = envSchema.parse(process.env);

export default env;
