import { join } from 'node:path';

import ensureBrokerFile from './broker/ensureBrokerFile';
import forwardClientMessage from './broker/forwardClientMessage';
import keepUpstreamOpen, { type BrokerState } from './broker/keepUpstreamOpen';
import removeClient from './broker/removeClient';
import env from './env';

const { port, token } = ensureBrokerFile(env.DIA_BROKER_FILE);

const state: BrokerState = {
  upstream: undefined,
  clients: new Map(),
  pending: new Map(),
  sessions: new Map(),
  attaching: [],
  nextId: 1
};

keepUpstreamOpen(state, join(env.DIA_USER_DATA_DIR, 'DevToolsActivePort'));

Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch: (request, server) => {
    const { pathname } = new URL(request.url);
    const upstreamOpen = state.upstream?.readyState === WebSocket.OPEN;

    if (pathname === `/${token}/health`) {
      return Response.json({
        upstream: upstreamOpen ? 'connected' : 'waiting',
        clients: state.clients.size
      });
    }

    if (pathname !== `/${token}`) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!upstreamOpen) {
      return new Response('The Dia connection is not open', { status: 503 });
    }

    if (server.upgrade(request)) {
      return undefined;
    }

    return new Response('Upgrade required', { status: 426 });
  },
  websocket: {
    open: (client) => {
      state.clients.set(client, {
        discover: undefined,
        autoAttach: undefined,
        attached: new Set()
      });
    },
    close: (client) => removeClient(state, client),
    message: (client, message) =>
      forwardClientMessage(state, client, String(message))
  }
});

console.log(`Dia broker listening on 127.0.0.1:${port}`);
