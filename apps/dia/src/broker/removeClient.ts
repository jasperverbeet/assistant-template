import callUpstream from './callUpstream';
import type { BrokerClient, BrokerState } from './keepUpstreamOpen';

/**
 * Removes a client that closed its connection. It drops the open commands of
 * the client. It detaches the sessions of the client, so that Dia does not keep
 * them open.
 *
 * @param state - The shared broker state.
 * @param client - The client that closed.
 * @returns Nothing.
 */
const removeClient = async (state: BrokerState, client: BrokerClient) => {
  state.clients.delete(client);
  state.pending.forEach((request, id) => {
    if ('client' in request && request.client === client) {
      state.pending.delete(id);
    }
  });
  state.attaching = state.attaching.filter((entry) => entry.client !== client);

  const sessionIds = [...state.sessions]
    .filter(([, owner]) => owner === client)
    .map(([sessionId]) => sessionId);
  sessionIds.forEach((sessionId) => state.sessions.delete(sessionId));

  await Promise.all(
    sessionIds.map((sessionId) =>
      callUpstream(state, 'Target.detachFromTarget', { sessionId })
    )
  );
};

export default removeClient;
