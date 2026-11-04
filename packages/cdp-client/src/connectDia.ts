import { z } from 'zod';

import readBrokerFile from './readBrokerFile';

const replySchema = z.object({
  id: z.number(),
  result: z.looseObject({}).optional(),
  error: z.object({ message: z.string() }).optional()
});

interface Waiting {
  resolve: (reply: z.infer<typeof replySchema>) => void;
  reject: (error: Error) => void;
}

/**
 * Opens a CDP connection to Dia through the Dia broker on `127.0.0.1`. The
 * broker keeps one approved connection to Dia and shares it, so Dia asks for no
 * new approval. The port and the token come from the broker file.
 *
 * @returns A `call` function that sends one CDP command and waits for its
 *   reply, and a `close` function that closes the connection.
 */
const connectDia = async () => {
  const { port, token } = readBrokerFile();
  const socket = new WebSocket(`ws://127.0.0.1:${port}/${token}`);
  const waiting = new Map<number, Waiting>();
  let nextId = 0;

  socket.addEventListener('message', (event) => {
    const reply = replySchema.safeParse(JSON.parse(String(event.data)));

    if (!reply.success) {
      return;
    }

    waiting.get(reply.data.id)?.resolve(reply.data);
    waiting.delete(reply.data.id);
  });
  socket.addEventListener('close', (event) => {
    waiting.forEach(({ reject }) =>
      reject(
        new Error(
          `The Dia broker closed the connection: ${event.reason || event.code}`
        )
      )
    );
    waiting.clear();
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', () =>
      reject(
        new Error(
          'The Dia broker is not running or has no connection to Dia. Run: pnpm dia:health'
        )
      )
    );
  });

  const call = async (
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ) => {
    if (socket.readyState !== WebSocket.OPEN) {
      throw new Error(`${method} failed: the Dia broker connection is closed`);
    }

    const id = ++nextId;
    const reply = await new Promise<z.infer<typeof replySchema>>(
      (resolve, reject) => {
        waiting.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params, sessionId }));
      }
    );

    if (reply.error) {
      throw new Error(`${method} failed: ${reply.error.message}`);
    }

    return reply.result ?? {};
  };

  return { call, close: () => socket.close() };
};

export type CdpCall = Awaited<ReturnType<typeof connectDia>>['call'];

export default connectDia;
