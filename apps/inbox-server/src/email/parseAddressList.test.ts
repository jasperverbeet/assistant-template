import { describe, expect, test } from 'bun:test';

import parseAddressList from './parseAddressList';

describe('parseAddressList', () => {
  test('reads names, quoted names with commas, and bare addresses', () => {
    expect(
      parseAddressList(
        'Example Customer <Customer@Example.com>, "Last, First" <first@example.com>, bare@example.com'
      )
    ).toEqual([
      { name: 'Example Customer', address: 'customer@example.com' },
      { name: 'Last, First', address: 'first@example.com' },
      { name: 'bare@example.com', address: 'bare@example.com' }
    ]);
  });

  test('gives an empty list for an absent header', () => {
    expect(parseAddressList()).toEqual([]);
  });
});
