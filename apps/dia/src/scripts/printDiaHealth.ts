import connectDia from '@assistant/cdp-client/connectDia';
import readBrokerFile from '@assistant/cdp-client/readBrokerFile';
import { z } from 'zod';

const TIMEOUT_MS = 3000;
const WHATSAPP_URL = 'https://web.whatsapp.com/';
const WHATSAPP_TABS = {
  WhatsApp: /^(\(\d+\) )?WhatsApp$/,
  'WhatsApp Business': /^(\(\d+\) )?WhatsApp Business$/
} as const;

const healthSchema = z.object({
  upstream: z.enum(['connected', 'waiting']),
  clients: z.number()
});

const targetsSchema = z.object({
  targetInfos: z.array(
    z.looseObject({ type: z.string(), title: z.string(), url: z.string() })
  )
});

try {
  const { port, token } = readBrokerFile();
  const health = healthSchema.parse(
    await fetch(`http://127.0.0.1:${port}/${token}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    }).then((response) => response.json())
  );

  if (health.upstream === 'waiting') {
    console.log(
      `- Dia broker: running on 127.0.0.1:${port}, waiting for Dia to approve the connection. Unlock the Mac, the dia-allow pane clicks Allow.`
    );
    process.exit(0);
  }

  console.log(
    `- Dia broker: running on 127.0.0.1:${port}, connected to Dia, ${health.clients} clients`
  );

  const { call, close } = await connectDia();
  const { targetInfos } = targetsSchema.parse(
    await Promise.race([
      call('Target.getTargets'),
      Bun.sleep(TIMEOUT_MS).then(() => {
        throw new Error('Target.getTargets gave no reply');
      })
    ])
  );
  close();

  const pages = targetInfos.filter((target) => target.type === 'page');
  console.log(`- Dia: ${pages.length} open pages`);
  Object.entries(WHATSAPP_TABS).forEach(([name, title]) => {
    const open = pages.some(
      (page) => page.url.startsWith(WHATSAPP_URL) && title.test(page.title)
    );
    console.log(`- ${name} tab: ${open ? 'open' : 'missing'}`);
  });
} catch (error) {
  console.log(
    `- Dia broker: no answer, ${error instanceof Error ? error.message : String(error)}. Is the dia-broker pane running?`
  );
}
