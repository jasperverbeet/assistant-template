import { describe, expect, it } from 'bun:test';

import readReaction from './readReaction';

describe('readReaction', () => {
  it('reads a Dutch reaction of the user', () => {
    expect(readReaction('Je reageerde met  op:\n \n"\nHoi"')).toEqual({
      text: 'Je reageerde met op: " Hoi"',
      emoji: undefined,
      fromMe: true
    });
  });

  it('puts the emoji after the prefix', () => {
    expect(readReaction('Je reageerde met  op: " Werkt nu"', '❤️')).toEqual({
      text: 'Je reageerde met ❤️ op: " Werkt nu"',
      emoji: '❤️',
      fromMe: true
    });
    expect(readReaction('You reacted  to: "Hi"', '👍')?.text).toBe(
      'You reacted 👍 to: "Hi"'
    );
  });

  it('reads a Dutch reaction of the other person', () => {
    expect(readReaction('Reageerde met  op: "Hoi"')).toEqual({
      text: 'Reageerde met op: "Hoi"',
      emoji: undefined,
      fromMe: false
    });
  });

  it('reads English reactions', () => {
    expect(readReaction(' You reacted  to: "Hi"')?.fromMe).toBe(true);
    expect(readReaction('Reacted  to: "Hi"')?.fromMe).toBe(false);
  });

  it('limits the text to 200 characters', () => {
    expect(
      readReaction(`Reageerde met op: ${'a'.repeat(300)}`)?.text
    ).toHaveLength(200);
  });

  it('ignores a normal message', () => {
    expect(readReaction('Ik reageerde met een mail')).toBeUndefined();
  });
});
