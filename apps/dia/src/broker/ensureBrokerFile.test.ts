import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'bun:test';

import ensureBrokerFile from './ensureBrokerFile';

describe('ensureBrokerFile', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'broker-')), 'dia-broker.json');

  test('creates a file with a random token and mode 0600', () => {
    const brokerFile = ensureBrokerFile(path);

    expect(brokerFile.port).toBe(9333);
    expect(brokerFile.token).toMatch(/^[0-9a-f]{64}$/);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  test('keeps the token of an existing file', () => {
    const { token } = ensureBrokerFile(path);

    expect(ensureBrokerFile(path).token).toBe(token);
  });
});
