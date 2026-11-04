import { readFileSync } from 'node:fs';

import { z } from 'zod';

const activePortSchema = z
  .string()
  .transform((text) => text.trim().split('\n'))
  .pipe(
    z.tuple([
      z.string().regex(/^\d+$/),
      z.string().startsWith('/devtools/browser/')
    ])
  );

/**
 * Reads the browser debugger URL from the `DevToolsActivePort` file of Dia. Dia
 * writes a new port and path to this file each time it starts.
 *
 * @param activePortPath - The path of the `DevToolsActivePort` file.
 * @returns The WebSocket URL of the browser debugger.
 */
const readDebuggerUrl = (activePortPath: string) => {
  const [port, path] = activePortSchema.parse(
    readFileSync(activePortPath, 'utf8')
  );

  return `ws://127.0.0.1:${port}${path}`;
};

export default readDebuggerUrl;
