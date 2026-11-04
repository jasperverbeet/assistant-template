import { describe, expect, test } from 'bun:test';

import parseSegmentTime from './parseSegmentTime';

describe('parseSegmentTime', () => {
  test('reads the local start time from the file name', () => {
    expect(parseSegmentTime('2026-11-04_14-30-05.opus')).toEqual(
      new Date(2026, 10, 4, 14, 30, 5)
    );
  });

  test('throws on another file name', () => {
    expect(() => parseSegmentTime('process.log')).toThrow();
  });
});
