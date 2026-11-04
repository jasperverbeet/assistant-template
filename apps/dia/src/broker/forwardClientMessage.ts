import { cdpMessageSchema } from './cdpMessageSchema';
import emulateTargetCommand from './emulateTargetCommand';
import type { BrokerClient, BrokerState } from './keepUpstreamOpen';

const EMULATED_METHODS = new Set([
  'Target.setDiscoverTargets',
  'Target.setAutoAttach'
]);

/**
 * Sends a CDP command from a client to Dia. The broker gives the command a new
 * `id`, so that the commands of two clients cannot use the same `id`.
 *
 * - The broker runs the target discovery and the auto-attach of the browser
 *   session itself, per client. See `emulateTargetCommand`.
 * - For `Target.attachToTarget`, the broker records the client. Then it can send
 *   the `Target.attachedToTarget` event to this client only. When more than one
 *   client attaches to the same target, the events go to the clients in the
 *   order of their commands.
 *
 * @param state - The shared broker state.
 * @param client - The client that sent the command.
 * @param text - The raw command text.
 * @returns Nothing.
 */
const forwardClientMessage = async (
  state: BrokerState,
  client: BrokerClient,
  text: string
) => {
  const message = cdpMessageSchema.safeParse(JSON.parse(text));

  if (!message.success || message.data.id === undefined) {
    client.close(1003, 'Each message needs a numeric id');
    return;
  }

  if (state.upstream?.readyState !== WebSocket.OPEN) {
    client.close(1011, 'The Dia connection is not open');
    return;
  }

  const { method, sessionId, params } = message.data;

  if (sessionId === undefined && method && EMULATED_METHODS.has(method)) {
    await emulateTargetCommand(state, client, message.data);
    return;
  }

  const attach =
    sessionId === undefined &&
    method === 'Target.attachToTarget' &&
    typeof params?.targetId === 'string'
      ? { targetId: params.targetId, client }
      : undefined;

  if (attach !== undefined) {
    state.attaching.push(attach);
  }

  const id = state.nextId++;
  state.pending.set(id, { client, id: message.data.id, attach });
  state.upstream.send(JSON.stringify({ ...message.data, id }));
};

export default forwardClientMessage;
