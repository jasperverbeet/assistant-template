import { resolve } from 'node:path';

import connectDia from '@assistant/cdp-client/connectDia';
import { z } from 'zod';

const TARGET_CALL_TIMEOUT_MS = 2000;
const WORKER_WAKE_ATTEMPTS = 10;
const WORKER_WAKE_DELAY_MS = 300;

const targetsSchema = z.object({
  targetInfos: z.array(
    z.object({
      targetId: z.string(),
      type: z.string(),
      url: z.string(),
      browserContextId: z.string().optional()
    })
  )
});
const sessionSchema = z.object({ sessionId: z.string() });

/**
 * Loads `dist` into Dia through a direct CDP connection and reloads the
 * extension in every Dia profile. The extension then injects its content script
 * into the open WhatsApp Web tabs. The function never reloads or navigates a
 * tab, because a reload can make WhatsApp Web hang.
 *
 * CDP loads an unpacked extension only into the default profile. Another
 * profile has its own copy of the extension, with the same ID because the path
 * is the same. Its service worker can sleep. For each browser context without a
 * running worker, the function attaches to a page of that context and starts
 * the worker with `ServiceWorker.startWorker`. A started worker shows as a
 * target only after a short time, so the function waits up to 3 seconds for
 * them. A profile without the extension never gets a worker, so the wait has a
 * limit. Then it runs `chrome.runtime.reload()` in each worker.
 *
 * @returns The extension ID and the reloaded service worker per browser
 *   context.
 */
const loadIntoDia = async () => {
  const { call, close } = await connectDia();

  const readTargets = async () =>
    targetsSchema.parse(await call('Target.getTargets')).targetInfos;

  const withSession = async (
    targetId: string,
    run: (sessionId: string) => Promise<unknown>
  ) => {
    const { sessionId } = sessionSchema.parse(
      await call('Target.attachToTarget', { targetId, flatten: true })
    );

    await Promise.race([
      run(sessionId).catch(() => undefined),
      Bun.sleep(TARGET_CALL_TIMEOUT_MS)
    ]);
    await call('Target.detachFromTarget', { sessionId }).catch(() => undefined);
  };

  try {
    const { id } = z
      .object({ id: z.string() })
      .parse(await call('Extensions.loadUnpacked', { path: resolve('dist') }));
    const isWorker = (
      target: z.infer<typeof targetsSchema>['targetInfos'][0]
    ) =>
      target.type === 'service_worker' &&
      target.url.startsWith(`chrome-extension://${id}/`);

    const targets = await readTargets();
    const awake = new Set(
      targets.filter(isWorker).map((target) => target.browserContextId)
    );
    const sleepingPages = new Map(
      targets
        .filter(
          (target) =>
            target.type === 'page' && !awake.has(target.browserContextId)
        )
        .map((target) => [target.browserContextId, target.targetId])
    );

    for (const pageId of sleepingPages.values()) {
      await withSession(pageId, async (sessionId) => {
        await call('ServiceWorker.enable', {}, sessionId);
        await call(
          'ServiceWorker.startWorker',
          { scopeURL: `chrome-extension://${id}/` },
          sessionId
        );
      });
    }

    let workers = (await readTargets()).filter(isWorker);

    for (
      let attempt = 0;
      attempt < WORKER_WAKE_ATTEMPTS &&
      workers.length < sleepingPages.size + awake.size;
      attempt += 1
    ) {
      await Bun.sleep(WORKER_WAKE_DELAY_MS);
      workers = (await readTargets()).filter(isWorker);
    }

    for (const worker of workers) {
      await withSession(worker.targetId, (sessionId) =>
        call(
          'Runtime.evaluate',
          { expression: 'chrome.runtime.reload()' },
          sessionId
        )
      );
    }

    const contexts = workers
      .map((worker) => `${worker.browserContextId} ${worker.targetId}`)
      .join(', ');

    return `${id}, ${workers.length} service workers (${contexts})`;
  } finally {
    close();
  }
};

export default loadIntoDia;
