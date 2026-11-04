import { timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

import { whatsappMessageSchema } from '@assistant/protocol/whatsappMessageSchema';

import syncCheckouts from './checkouts/syncCheckouts';
import pollGmail from './email/pollGmail';
import env from './env';
import pollGithub from './github/pollGithub';
import readInboxEntries from './inbox/readInboxEntries';
import runJobs from './schedule/runJobs';
import isAllowedWhatsappChat from './whatsapp/isAllowedWhatsappChat';
import storeWhatsappPreview from './whatsapp/storeWhatsappPreview';
import whatsappPreviewToEntry from './whatsapp/whatsappPreviewToEntry';

const EXPECTED_AUTHORIZATION = Buffer.from(`Bearer ${env.INBOX_TOKEN}`);

await mkdir(env.INBOX_DIR, { recursive: true });

const seenIds = new Set((await readInboxEntries()).map((entry) => entry.id));
const pendingIds = new Set<string>();
let previewQueue = Promise.resolve();

Bun.serve({
  hostname: '127.0.0.1',
  port: env.INBOX_PORT,
  routes: {
    '/events': {
      POST: async (request) => {
        const authorization = Buffer.from(
          request.headers.get('authorization') ?? ''
        );

        if (
          authorization.length !== EXPECTED_AUTHORIZATION.length ||
          !timingSafeEqual(authorization, EXPECTED_AUTHORIZATION)
        ) {
          return new Response('Unauthorized', { status: 401 });
        }

        const parsed = whatsappMessageSchema.safeParse(
          await request.json().catch(() => null)
        );

        if (!parsed.success) {
          return new Response('Invalid message', { status: 400 });
        }

        const preview = parsed.data;

        if (
          !isAllowedWhatsappChat({
            preview,
            personalChats: env.WHATSAPP_PERSONAL_CHATS
          })
        ) {
          return new Response(null, { status: 204 });
        }

        const entry = whatsappPreviewToEntry({
          preview,
          receivedAt: new Date().toISOString()
        });

        if (seenIds.has(entry.id) || pendingIds.has(entry.id)) {
          return new Response(null, { status: 204 });
        }

        pendingIds.add(entry.id);
        previewQueue = previewQueue
          .then(() => storeWhatsappPreview({ preview, entry, seenIds }))
          .catch((error: unknown) => {
            console.error('WhatsApp preview store failed', error);
          })
          .finally(() => pendingIds.delete(entry.id));

        return new Response(null, { status: 202 });
      }
    }
  },
  fetch: () => new Response('Not found', { status: 404 })
});

console.info(`Inbox server listens on 127.0.0.1:${env.INBOX_PORT}`);

await Promise.all([
  pollGithub(seenIds),
  pollGmail(seenIds),
  runJobs(seenIds),
  syncCheckouts()
]);
