import { describe, expect, test } from 'bun:test';

import parseReactionTarget from './parseReactionTarget';

describe('parseReactionTarget', () => {
  test('reads the target of an own reaction', () => {
    expect(parseReactionTarget('Je reageerde met 👍 op: " hoi!"')).toBe('hoi!');
  });

  test('reads the target of a reaction of another person', () => {
    expect(parseReactionTarget('‪Reageerde met op: "Hoi"‬')).toBe('Hoi');
  });

  test('reads the English form', () => {
    expect(parseReactionTarget('Reacted to: "See you"')).toBe('See you');
  });

  test('gives undefined for another text', () => {
    expect(parseReactionTarget('Komt dat morgen goed?')).toBeUndefined();
  });
});
