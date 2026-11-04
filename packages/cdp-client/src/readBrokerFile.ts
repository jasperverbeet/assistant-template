import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

export const BROKER_FILE_PATH = fileURLToPath(
  new URL('../../../inbox/dia-broker.json', import.meta.url)
);

export const brokerFileSchema = z.object({
  port: z.number().int().positive(),
  token: z.string().regex(/^[0-9a-f]{64}$/)
});

/**
 * Reads the port and the token of the Dia broker. The broker writes this file
 * on its first start. The file is outside git and has mode 0600.
 *
 * @param path - The path of the broker file.
 * @returns The port and the token of the broker.
 */
const readBrokerFile = (path = BROKER_FILE_PATH) =>
  brokerFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));

export default readBrokerFile;
