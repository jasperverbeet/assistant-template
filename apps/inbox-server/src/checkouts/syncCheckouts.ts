import { $ } from 'bun';

import env from '../env';
import syncCheckout from './syncCheckout';

/**
 * Syncs each checkout in `CHECKOUT_SYNC_PATHS` with `origin` at a fixed
 * interval. A failure in one checkout does not stop the others. It never
 * returns.
 *
 * @returns A promise that never resolves.
 */
const syncCheckouts = async () => {
  while (true) {
    for (const path of env.CHECKOUT_SYNC_PATHS) {
      try {
        await syncCheckout(path);
      } catch (error) {
        const reason =
          error instanceof $.ShellError
            ? error.stderr.toString().trim().replaceAll('\n', ' ')
            : String(error);

        console.error(`Checkout sync skipped ${path}: ${reason}`);
      }
    }

    await Bun.sleep(env.CHECKOUT_SYNC_MINUTES * 60 * 1000);
  }
};

export default syncCheckouts;
