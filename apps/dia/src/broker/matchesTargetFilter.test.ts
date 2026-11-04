import { describe, expect, test } from 'bun:test';

import matchesTargetFilter, {
  DEFAULT_TARGET_FILTER
} from './matchesTargetFilter';

describe('matchesTargetFilter', () => {
  test('the default filter excludes browser and tab targets', () => {
    expect(
      ['page', 'browser', 'tab'].map((type) =>
        matchesTargetFilter(DEFAULT_TARGET_FILTER, type)
      )
    ).toEqual([true, false, false]);
  });

  test('the first entry that matches decides', () => {
    const filter = [{ type: 'page', exclude: true }, {}];

    expect(matchesTargetFilter(filter, 'page')).toBe(false);
    expect(matchesTargetFilter(filter, 'tab')).toBe(true);
    expect(matchesTargetFilter([{ type: 'tab' }], 'page')).toBe(false);
  });
});
