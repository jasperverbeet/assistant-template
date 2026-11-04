import type { CdpCall } from '@assistant/cdp-client/connectDia';
import { z } from 'zod';

import evaluateInPage from './evaluateInPage';

/**
 * Clicks the center of an element in a page.
 *
 * @param call - The CDP call function of the Dia connection.
 * @param sessionId - The session of the page.
 * @param elementSource - A JavaScript expression that gives the element.
 * @returns Nothing.
 */
const clickElement = async (
  call: CdpCall,
  sessionId: string,
  elementSource: string
) => {
  const point = z
    .object({ x: z.number(), y: z.number() })
    .parse(
      await evaluateInPage(
        call,
        sessionId,
        `(() => { const r = (${elementSource}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`
      )
    );

  for (const type of ['mousePressed', 'mouseReleased']) {
    await call(
      'Input.dispatchMouseEvent',
      { type, ...point, button: 'left', clickCount: 1 },
      sessionId
    );
  }
};

export default clickElement;
