import type { CdpCall } from '@assistant/cdp-client/connectDia';
import { z } from 'zod';

import evaluateInPage from '../cdp/evaluateInPage';

/**
 * Finds the WhatsApp Web tab of the account and attaches to it. The business
 * tab has "WhatsApp Business" in its title.
 *
 * @param call - The CDP call function of the Dia connection.
 * @param account - The WhatsApp account of the tab.
 * @returns The CDP session of the tab.
 */
const attachToWhatsapp = async (
  call: CdpCall,
  account: 'personal' | 'business'
) => {
  const { targetInfos } = z
    .object({
      targetInfos: z.array(
        z.object({ targetId: z.string(), type: z.string(), url: z.string() })
      )
    })
    .parse(await call('Target.getTargets'));

  for (const target of targetInfos) {
    if (
      target.type !== 'page' ||
      !target.url.startsWith('https://web.whatsapp.com/')
    ) {
      continue;
    }

    const { sessionId } = z.object({ sessionId: z.string() }).parse(
      await call('Target.attachToTarget', {
        targetId: target.targetId,
        flatten: true
      })
    );
    const title = String(
      await evaluateInPage(call, sessionId, 'document.title')
    );

    if (title.includes('WhatsApp Business') === (account === 'business')) {
      return sessionId;
    }

    await call('Target.detachFromTarget', { sessionId });
  }

  throw new Error(`No WhatsApp tab for the ${account} account`);
};

export default attachToWhatsapp;
