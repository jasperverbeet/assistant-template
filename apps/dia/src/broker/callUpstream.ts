import type { CdpMessage } from './cdpMessageSchema';
import type { BrokerState } from './keepUpstreamOpen';

/**
 * Sends a CDP command of the broker itself to Dia. No client gets the reply.
 *
 * @param state - The shared broker state.
 * @param method - The CDP method.
 * @param params - The CDP parameters.
 * @returns The reply from Dia. The reply has `error` when the command failed.
 */
const callUpstream = (
  state: BrokerState,
  method: string,
  params: Record<string, unknown>
) => {
  const { upstream } = state;

  if (upstream?.readyState !== WebSocket.OPEN) {
    return Promise.resolve<CdpMessage>({
      error: { message: 'The Dia connection is not open' }
    });
  }

  const id = state.nextId++;

  return new Promise<CdpMessage>((resolve) => {
    state.pending.set(id, { resolve });
    upstream.send(JSON.stringify({ id, method, params }));
  });
};

export default callUpstream;
