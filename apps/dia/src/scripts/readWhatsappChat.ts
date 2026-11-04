import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import connectDia from '@assistant/cdp-client/connectDia';
import { z } from 'zod';

import attachToWhatsapp from '../whatsapp/attachToWhatsapp';
import readChat from '../whatsapp/readChat';

const [account, chat, count] = z
  .tuple([
    z.enum(['personal', 'business']),
    z.string().min(1),
    z.coerce.number().int().min(1).max(50).default(5)
  ])
  .parse(process.argv.slice(2));

const mediaDir = join(import.meta.dir, '../../../../inbox/media');
const { call, close } = await connectDia();

try {
  const sessionId = await attachToWhatsapp(call, account);
  const messages = await readChat({ call, sessionId, chat, count });
  await call('Target.detachFromTarget', { sessionId });
  await mkdir(mediaDir, { recursive: true });

  for (const message of messages) {
    message.images = await Promise.all(
      message.images.map(async (dataUrl, index) => {
        const path = join(mediaDir, `${message.id}-${index}.jpg`);
        await writeFile(
          path,
          Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
        );
        return path;
      })
    );
  }

  console.log(JSON.stringify(messages, null, 2));
} finally {
  close();
}
