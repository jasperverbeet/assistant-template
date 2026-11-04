import { z } from 'zod';

import attachClient from './attachClient';
import callUpstream from './callUpstream';
import {
  type CdpMessage,
  targetFilterSchema,
  targetInfoSchema
} from './cdpMessageSchema';
import type { BrokerClient, BrokerState } from './keepUpstreamOpen';
import matchesTargetFilter, {
  DEFAULT_TARGET_FILTER
} from './matchesTargetFilter';

const paramsSchema = z.looseObject({
  discover: z.boolean().optional(),
  autoAttach: z.boolean().optional(),
  filter: targetFilterSchema.optional()
});

const targetsSchema = z.object({ targetInfos: z.array(targetInfoSchema) });

/**
 * Runs `Target.setDiscoverTargets` or `Target.setAutoAttach` of the browser
 * session for one client only. Dia holds this state per connection, and all
 * clients share one connection. So Dia sends the existing targets only to the
 * first client. The broker does it for each client:
 *
 * - Discovery on: the broker sends `Target.targetCreated` for each existing
 *   target, then the reply.
 * - Auto-attach on: the broker attaches the client to each existing target, then
 *   sends the reply.
 *
 * The upstream connection keeps discovery on all the time.
 *
 * @param state - The shared broker state.
 * @param client - The client that sent the command.
 * @param message - The command, with the `id` of the client.
 * @returns Nothing.
 */
const emulateTargetCommand = async (
  state: BrokerState,
  client: BrokerClient,
  message: CdpMessage
) => {
  const targets = state.clients.get(client);

  if (targets === undefined) {
    return;
  }

  const params = paramsSchema.parse(message.params ?? {});
  const discovery = message.method === 'Target.setDiscoverTargets';
  const enabled = discovery ? params.discover : params.autoAttach;
  const filter = enabled ? (params.filter ?? DEFAULT_TARGET_FILTER) : undefined;

  if (discovery) {
    targets.discover = filter;
  } else {
    targets.autoAttach = filter;
  }

  if (filter !== undefined) {
    const reply = await callUpstream(state, 'Target.getTargets', {
      filter: [{}]
    });

    if (reply.error !== undefined) {
      client.send(JSON.stringify({ id: message.id, error: reply.error }));
      return;
    }

    const { targetInfos } = targetsSchema.parse(reply.result);

    if (discovery) {
      targetInfos
        .filter((targetInfo) => matchesTargetFilter(filter, targetInfo.type))
        .forEach((targetInfo) =>
          client.send(
            JSON.stringify({
              method: 'Target.targetCreated',
              params: { targetInfo }
            })
          )
        );
    } else {
      await Promise.all(
        targetInfos.map((targetInfo) => attachClient(state, client, targetInfo))
      );
    }
  }

  client.send(JSON.stringify({ id: message.id, result: {} }));
};

export default emulateTargetCommand;
