import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import readBrokerFile from './readBrokerFile';

describe('readBrokerFile', () => {
  const dir = mkdtempSync(join(tmpdir(), 'broker-file-'));
  const token = 'a'.repeat(64);

  test('reads the port and the token', () => {
    const path = join(dir, 'valid.json');
    writeFileSync(path, JSON.stringify({ port: 9333, token }));

    expect(readBrokerFile(path)).toEqual({ port: 9333, token });
  });

  test('rejects a short token', () => {
    const path = join(dir, 'short.json');
    writeFileSync(path, JSON.stringify({ port: 9333, token: 'abc' }));

    expect(() => readBrokerFile(path)).toThrow();
  });

  test('rejects a file without a port', () => {
    const path = join(dir, 'no-port.json');
    writeFileSync(path, JSON.stringify({ token }));

    expect(() => readBrokerFile(path)).toThrow();
  });
});
