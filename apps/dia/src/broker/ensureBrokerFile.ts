import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname } from 'node:path';

import readBrokerFile, {
  brokerFileSchema
} from '@assistant/cdp-client/readBrokerFile';

const DEFAULT_PORT = 9333;
const TOKEN_BYTES = 32;

/**
 * Reads the broker file. On the first start, it creates the file with the
 * default port and a random token. It writes the file atomically with mode
 * 0600, because the token gives full control of Dia.
 *
 * @param path - The path of the broker file.
 * @returns The port and the token of the broker.
 */
const ensureBrokerFile = (path: string) => {
  if (existsSync(path)) {
    return readBrokerFile(path);
  }

  const brokerFile = brokerFileSchema.parse({
    port: DEFAULT_PORT,
    token: randomBytes(TOKEN_BYTES).toString('hex')
  });
  const temporaryPath = `${path}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  rmSync(temporaryPath, { force: true });
  writeFileSync(temporaryPath, `${JSON.stringify(brokerFile, null, 2)}\n`, {
    mode: 0o600
  });
  renameSync(temporaryPath, path);

  return brokerFile;
};

export default ensureBrokerFile;
