import type { ServerWebSocket } from 'bun';

import callUpstream from './callUpstream';
import type { CdpMessage, TargetFilter } from './cdpMessageSchema';
import forwardUpstreamMessage from './forwardUpstreamMessage';
import readDebuggerUrl from './readDebuggerUrl';
import retryDelayMs from './retryDelayMs';

export type BrokerClient = Pick<ServerWebSocket<undefined>, 'send' | 'close'>;

export interface ClientTargets {
  discover: TargetFilter | undefined;
  autoAttach: TargetFilter | undefined;
  attached: Set<string>;
}

interface AttachRequest {
  targetId: string;
  client: BrokerClient;
}

type PendingRequest =
  | { client: BrokerClient; id: number; attach?: AttachRequest }
  | { resolve: (reply: CdpMessage) => void };

export interface BrokerState {
  upstream: Pick<WebSocket, 'readyState' | 'send'> | undefined;
  clients: Map<BrokerClient, ClientTargets>;
  pending: Map<number, PendingRequest>;
  sessions: Map<string, BrokerClient>;
  attaching: AttachRequest[];
  nextId: number;
}

/**
 * Keeps one connection to Dia open. It turns on target discovery on this
 * connection, so that the broker sees each new target. When the connection
 * closes, it closes all clients, because their CDP sessions are gone. Then it
 * connects again. Each try reads the `DevToolsActivePort` file again, because
 * Dia writes a new port when it restarts.
 *
 * Ponytail: a try has no time limit. Dia holds a new connection until a person
 * or the `dia-allow` pane clicks Allow. A time limit would add a new dialog on
 * each try while the screen is locked.
 *
 * @param state - The shared broker state. This function sets `upstream`.
 * @param activePortPath - The path of the `DevToolsActivePort` file of Dia.
 * @returns Nothing.
 */
const keepUpstreamOpen = (state: BrokerState, activePortPath: string) => {
  let failures = 0;

  const retry = (reason: string) => {
    const delay = retryDelayMs(failures);
    failures++;
    console.error(
      `Cannot connect to Dia (${reason}). Next try in ${delay / 1000} s.`
    );
    setTimeout(connect, delay);
  };

  const connect = () => {
    let url: string;

    try {
      url = readDebuggerUrl(activePortPath);
    } catch (error) {
      retry(error instanceof Error ? error.message : String(error));
      return;
    }

    const socket = new WebSocket(url);
    console.log(
      `Connecting to ${url}. Waiting for Dia to approve the debugging connection.`
    );

    socket.addEventListener('open', async () => {
      failures = 0;
      state.upstream = socket;
      console.log('Connected to Dia.');
      const reply = await callUpstream(state, 'Target.setDiscoverTargets', {
        discover: true,
        filter: [{}]
      });

      if (reply.error !== undefined) {
        console.error(
          `Cannot turn on target discovery: ${JSON.stringify(reply.error)}`
        );
      }
    });
    socket.addEventListener('message', (event) =>
      forwardUpstreamMessage(state, String(event.data))
    );
    socket.addEventListener('close', (event) => {
      if (state.upstream !== socket) {
        retry(`close code ${event.code}`);
        return;
      }

      state.upstream = undefined;
      state.pending.forEach((request) => {
        if ('resolve' in request) {
          request.resolve({ error: { message: 'The Dia connection closed' } });
        }
      });
      state.pending.clear();
      state.sessions.clear();
      state.attaching = [];
      console.error(
        `Lost the Dia connection. Closing ${state.clients.size} clients and connecting again.`
      );
      state.clients.forEach((_targets, client) =>
        client.close(1011, 'The Dia connection closed')
      );
      state.clients.clear();
      setTimeout(connect, retryDelayMs(0));
    });
  };

  connect();
};

export default keepUpstreamOpen;
