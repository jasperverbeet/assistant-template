import { describe, expect, test } from 'bun:test';

import retryDelayMs from './retryDelayMs';

describe('retryDelayMs', () => {
  test('waits 1, 2, and 5 seconds, then 10 seconds', () => {
    expect([0, 1, 2, 3, 4, 50].map(retryDelayMs)).toEqual([
      1000, 2000, 5000, 10_000, 10_000, 10_000
    ]);
  });
});
