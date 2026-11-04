import { describe, expect, mock, test } from 'bun:test';

import forwardClientMessage from './forwardClientMessage';
import forwardUpstreamMessage from './forwardUpstreamMessage';
import type { BrokerState } from './keepUpstreamOpen';
import removeClient from './removeClient';

describe('forwardClientMessage and forwardUpstreamMessage', () => {
  const PAGE = { targetId: 'P', type: 'page', title: 'A', url: 'about:blank' };
  const TAB = { targetId: 'T', type: 'tab', title: 'A', url: 'about:blank' };

  const createState = () => {
    const upstreamSend = mock((_text: string) => undefined);
    const state: BrokerState = {
      upstream: { readyState: WebSocket.OPEN, send: upstreamSend },
      clients: new Map(),
      pending: new Map(),
      sessions: new Map(),
      attaching: [],
      nextId: 1
    };
    const createClient = () => {
      const client = {
        send: mock((_text: string) => 0),
        close: mock((_code?: number, _reason?: string) => undefined)
      };
      state.clients.set(client, {
        discover: undefined,
        autoAttach: undefined,
        attached: new Set()
      });
      return client;
    };
    const sent = () =>
      upstreamSend.mock.calls.map(([text]) => JSON.parse(text));
    const received = (client: ReturnType<typeof createClient>) =>
      client.send.mock.calls.map(([text]) => JSON.parse(text));
    const answer = async (method: string, result: object) => {
      const command = sent().findLast(
        (sentCommand) => sentCommand.method === method
      );
      await forwardUpstreamMessage(
        state,
        JSON.stringify({ id: command.id, result })
      );
    };
    return { state, createClient, sent, received, answer };
  };

  test('gives two clients with the same id different upstream ids', async () => {
    const { state, createClient, sent, received } = createState();
    const first = createClient();
    const second = createClient();

    await forwardClientMessage(state, first, '{"id":1,"method":"A"}');
    await forwardClientMessage(state, second, '{"id":1,"method":"B"}');

    expect(sent()).toEqual([
      { id: 1, method: 'A' },
      { id: 2, method: 'B' }
    ]);

    await forwardUpstreamMessage(state, '{"id":2,"result":{"b":true}}');
    await forwardUpstreamMessage(state, '{"id":1,"result":{"a":true}}');

    expect(received(first)).toEqual([{ id: 1, result: { a: true } }]);
    expect(received(second)).toEqual([{ id: 1, result: { b: true } }]);
    expect(state.pending.size).toBe(0);
  });

  test('sends existing targets to a late client that turns on discovery', async () => {
    const { state, createClient, sent, received, answer } = createState();
    const early = createClient();
    const late = createClient();

    const done = forwardClientMessage(
      state,
      late,
      '{"id":7,"method":"Target.setDiscoverTargets","params":{"discover":true,"filter":[{}]}}'
    );
    await answer('Target.getTargets', { targetInfos: [PAGE, TAB] });
    await done;

    expect(sent().map((command) => command.method)).toEqual([
      'Target.getTargets'
    ]);
    expect(received(late)).toEqual([
      { method: 'Target.targetCreated', params: { targetInfo: PAGE } },
      { method: 'Target.targetCreated', params: { targetInfo: TAB } },
      { id: 7, result: {} }
    ]);

    await forwardUpstreamMessage(
      state,
      '{"method":"Target.targetDestroyed","params":{"targetId":"P"}}'
    );

    expect(early.send).not.toHaveBeenCalled();
    expect(received(late).at(-1)).toEqual({
      method: 'Target.targetDestroyed',
      params: { targetId: 'P' }
    });
  });

  test('attaches an auto-attach client and routes its session events to it only', async () => {
    const { state, createClient, sent, received, answer } = createState();
    const other = createClient();
    const puppeteer = createClient();

    const done = forwardClientMessage(
      state,
      puppeteer,
      '{"id":3,"method":"Target.setAutoAttach","params":{"autoAttach":true,"flatten":true,"filter":[{"type":"page","exclude":true},{}]}}'
    );
    await answer('Target.getTargets', { targetInfos: [PAGE, TAB] });

    expect(sent().at(-1)).toMatchObject({
      method: 'Target.attachToTarget',
      params: { targetId: 'T', flatten: true }
    });

    await forwardUpstreamMessage(
      state,
      JSON.stringify({
        method: 'Target.attachedToTarget',
        params: { sessionId: 'S', targetInfo: TAB, waitingForDebugger: false }
      })
    );
    await answer('Target.attachToTarget', { sessionId: 'S' });
    await done;

    expect(
      received(puppeteer).map((reply) => reply.method ?? reply.id)
    ).toEqual(['Target.attachedToTarget', 3]);

    await forwardUpstreamMessage(
      state,
      JSON.stringify({
        method: 'Target.attachedToTarget',
        sessionId: 'S',
        params: { sessionId: 'C', targetInfo: PAGE }
      })
    );
    await forwardUpstreamMessage(
      state,
      '{"method":"Runtime.consoleAPICalled","sessionId":"C","params":{}}'
    );

    expect(state.sessions.get('C')).toBe(puppeteer);
    expect(received(puppeteer).at(-1)).toMatchObject({ sessionId: 'C' });
    expect(other.send).not.toHaveBeenCalled();
  });

  test('sends attachedToTarget only to the client that asked for the attach', async () => {
    const { state, createClient, received } = createState();
    const reader = createClient();
    const other = createClient();

    await forwardClientMessage(
      state,
      reader,
      '{"id":1,"method":"Target.attachToTarget","params":{"targetId":"P","flatten":true}}'
    );
    await forwardUpstreamMessage(
      state,
      JSON.stringify({
        method: 'Target.attachedToTarget',
        params: { sessionId: 'S', targetInfo: PAGE }
      })
    );

    expect(received(reader)[0]).toMatchObject({
      method: 'Target.attachedToTarget'
    });
    expect(other.send).not.toHaveBeenCalled();
    expect(state.attaching).toEqual([]);
  });

  test('gives each attachedToTarget for one target to the clients in order', async () => {
    const { state, createClient, received } = createState();
    const first = createClient();
    const second = createClient();
    const attach =
      '{"id":1,"method":"Target.attachToTarget","params":{"targetId":"P"}}';
    const attached = (sessionId: string) =>
      JSON.stringify({
        method: 'Target.attachedToTarget',
        params: { sessionId, targetInfo: PAGE }
      });

    await forwardClientMessage(state, first, attach);
    await forwardClientMessage(state, second, attach);
    await forwardUpstreamMessage(state, attached('S1'));
    await forwardUpstreamMessage(state, attached('S2'));

    expect(received(first)[0].params.sessionId).toBe('S1');
    expect(received(second)[0].params.sessionId).toBe('S2');
    expect(state.sessions.get('S2')).toBe(second);
  });

  test('forgets a failed attach', async () => {
    const { state, createClient } = createState();
    const client = createClient();

    await forwardClientMessage(
      state,
      client,
      '{"id":1,"method":"Target.attachToTarget","params":{"targetId":"P"}}'
    );
    await forwardUpstreamMessage(
      state,
      '{"id":1,"error":{"message":"No target"}}'
    );

    expect(state.attaching).toEqual([]);
  });

  test('detaches the sessions of a client that closes', async () => {
    const { state, createClient, sent, answer } = createState();
    const client = createClient();
    state.sessions.set('S', client);
    state.attaching.push({ targetId: 'T', client });
    await forwardClientMessage(state, client, '{"id":1,"method":"A"}');

    const done = removeClient(state, client);
    await answer('Target.detachFromTarget', {});
    await done;

    expect(sent().at(-1)).toMatchObject({
      method: 'Target.detachFromTarget',
      params: { sessionId: 'S' }
    });
    expect(state.clients.size).toBe(0);
    expect(state.sessions.size).toBe(0);
    expect(state.attaching).toEqual([]);
    expect(state.pending.size).toBe(0);
  });

  test('closes a client that sends no id', async () => {
    const { state, createClient, sent } = createState();
    const client = createClient();

    await forwardClientMessage(state, client, '{"method":"A"}');

    expect(client.close).toHaveBeenCalledWith(
      1003,
      'Each message needs a numeric id'
    );
    expect(sent()).toEqual([]);
  });

  test('closes a client when the Dia connection is not open', async () => {
    const { state, createClient } = createState();
    const client = createClient();
    state.upstream = undefined;

    await forwardClientMessage(state, client, '{"id":1,"method":"A"}');

    expect(client.close).toHaveBeenCalledWith(
      1011,
      'The Dia connection is not open'
    );
  });
});
