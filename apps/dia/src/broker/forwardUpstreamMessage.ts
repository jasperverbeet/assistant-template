import { z } from 'zod';

import attachClient from './attachClient';
import { cdpMessageSchema, targetInfoSchema } from './cdpMessageSchema';
import type { BrokerState } from './keepUpstreamOpen';
import matchesTargetFilter from './matchesTargetFilter';

const TARGET_EVENTS = new Set([
  'Target.targetCreated',
  'Target.targetInfoChanged',
  'Target.targetDestroyed'
]);

const eventParamsSchema = z.looseObject({
  sessionId: z.string().optional(),
  targetId: z.string().optional(),
  targetInfo: targetInfoSchema.optional()
});

/**
 * Sends a message from Dia to the clients that need it.
 *
 * - A reply goes to the client that sent the command, with the `id` of that
 *   client. A reply to a command of the broker resolves its promise.
 * - `Target.attachedToTarget` goes to the client that asked for the attach, or to
 *   the owner of the parent session. That client owns the new session.
 * - An event with a `sessionId` goes only to the owner of that session.
 * - A target event goes to each client with discovery on and a filter that
 *   includes the target. A new target also starts the auto-attach of each
 *   client.
 * - Each other event goes to every client.
 *
 * @param state - The shared broker state.
 * @param text - The raw message text from Dia.
 * @returns Nothing.
 */
const forwardUpstreamMessage = async (state: BrokerState, text: string) => {
  const message = cdpMessageSchema.parse(JSON.parse(text));

  if (message.id !== undefined) {
    const request = state.pending.get(message.id);
    state.pending.delete(message.id);

    if (request === undefined) {
      return;
    }

    if ('resolve' in request) {
      request.resolve(message);
      return;
    }

    if (message.error !== undefined && request.attach !== undefined) {
      state.attaching = state.attaching.filter(
        (entry) => entry !== request.attach
      );
    }

    request.client.send(JSON.stringify({ ...message, id: request.id }));
    return;
  }

  const params = eventParamsSchema.safeParse(message.params ?? {}).data ?? {};

  if (
    message.method === 'Target.attachedToTarget' &&
    params.sessionId !== undefined &&
    params.targetInfo !== undefined
  ) {
    const { targetId } = params.targetInfo;
    const index = state.attaching.findIndex(
      (entry) => entry.targetId === targetId
    );
    const owner =
      message.sessionId === undefined
        ? index < 0
          ? undefined
          : state.attaching.splice(index, 1)[0]?.client
        : state.sessions.get(message.sessionId);

    if (owner !== undefined) {
      state.sessions.set(params.sessionId, owner);
      owner.send(text);
    }

    return;
  }

  if (
    message.method === 'Target.detachedFromTarget' &&
    params.sessionId !== undefined
  ) {
    const owner = state.sessions.get(params.sessionId);
    state.sessions.delete(params.sessionId);

    if (owner !== undefined && params.targetId !== undefined) {
      state.clients.get(owner)?.attached.delete(params.targetId);
    }

    owner?.send(text);
    return;
  }

  if (message.sessionId !== undefined) {
    state.sessions.get(message.sessionId)?.send(text);
    return;
  }

  if (message.method === undefined || !TARGET_EVENTS.has(message.method)) {
    state.clients.forEach((_targets, client) => client.send(text));
    return;
  }

  const type = params.targetInfo?.type;
  state.clients.forEach((targets, client) => {
    if (
      targets.discover !== undefined &&
      (type === undefined || matchesTargetFilter(targets.discover, type))
    ) {
      client.send(text);
    }
  });

  const { targetInfo } = params;

  if (message.method === 'Target.targetCreated' && targetInfo !== undefined) {
    await Promise.all(
      [...state.clients.keys()].map((client) =>
        attachClient(state, client, targetInfo)
      )
    );
  }
};

export default forwardUpstreamMessage;
