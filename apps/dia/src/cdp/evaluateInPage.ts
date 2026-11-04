import type { CdpCall } from '@assistant/cdp-client/connectDia';
import { z } from 'zod';

/**
 * Runs a JavaScript expression in a page and returns its JSON value.
 *
 * @param call - The CDP call function of the Dia connection.
 * @param sessionId - The session of the page.
 * @param source - A JavaScript expression. It can return a promise.
 * @returns The value of the expression.
 */
const evaluateInPage = async (
  call: CdpCall,
  sessionId: string,
  source: string
) => {
  const reply = z
    .object({
      result: z.object({ value: z.unknown().optional() }),
      exceptionDetails: z.looseObject({}).optional()
    })
    .parse(
      await call(
        'Runtime.evaluate',
        { expression: source, returnByValue: true, awaitPromise: true },
        sessionId
      )
    );

  if (reply.exceptionDetails) {
    throw new Error(
      `Page script failed: ${JSON.stringify(reply.exceptionDetails)}`
    );
  }

  return reply.result.value;
};

export default evaluateInPage;
