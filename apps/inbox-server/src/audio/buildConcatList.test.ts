import { describe, expect, test } from 'bun:test';

import buildConcatList from './buildConcatList';

describe('buildConcatList', () => {
  test('lists only the parts, in time order, with quoted paths', () => {
    const { parts, list } = buildConcatList("/a/it's", [
      '2026-11-04_12-24-38.opus',
      'session.opus',
      'session.json',
      '2026-11-04_12-14-37.opus',
      '2026-11-04_12-14-37.json'
    ]);

    expect(parts).toEqual([
      '2026-11-04_12-14-37.opus',
      '2026-11-04_12-24-38.opus'
    ]);
    expect(list).toBe(
      "file '/a/it'\\''s/2026-11-04_12-14-37.opus'\n" +
        "file '/a/it'\\''s/2026-11-04_12-24-38.opus'\n"
    );
  });
});
