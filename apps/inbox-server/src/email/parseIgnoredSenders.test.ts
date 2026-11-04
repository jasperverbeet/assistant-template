import { describe, expect, test } from 'bun:test';

import parseIgnoredSenders from './parseIgnoredSenders';

describe('parseIgnoredSenders', () => {
  test('takes the domains and addresses of the bullets', () => {
    expect(
      parseIgnoredSenders(
        '# Ignored senders\n\nSee `memory/people.md`.\n\n- **Example Media (Example Person, examplemedia.nl):** sales.\n- **Other (sales@Other-Example.com):** cold sales.\n'
      )
    ).toEqual(['examplemedia.nl', 'sales@other-example.com']);
  });
});
