import { describe, expect, test } from 'bun:test';

import trimQuotedText from './trimQuotedText';

describe('trimQuotedText', () => {
  test('cuts at an English attribution line', () => {
    expect(
      trimQuotedText(
        'Thanks, that works.\n\nOn Tue, 3 Nov 2026 at 10:00, Example <a@example.com> wrote:\n> Old text'
      )
    ).toBe('Thanks, that works.');
  });

  test('cuts at a Dutch attribution line that wraps', () => {
    expect(
      trimQuotedText(
        'Prima, tot morgen.\n\nOp di 3 nov 2026 om 10:00 schreef Example <\na@example.com>:\n> Oude tekst'
      )
    ).toBe('Prima, tot morgen.');
  });

  test('cuts at an Outlook header block', () => {
    expect(
      trimQuotedText(
        'Zie bijlage.\n\nVan: Example <a@example.com>\nVerzonden: dinsdag 3 november 2026 10:00\nAan: Alex'
      )
    ).toBe('Zie bijlage.');
  });

  test('cuts at an Original Message line', () => {
    expect(
      trimQuotedText('New text\n-----Original Message-----\nOld text')
    ).toBe('New text');
  });

  test('keeps a line that only mentions a reply', () => {
    const text = 'On Monday I wrote the plan. Can you check it?';

    expect(trimQuotedText(text)).toBe(text);
  });

  test('keeps the full text when the quote is all of it', () => {
    const text = 'On Tue, 3 Nov 2026, Example wrote:\n> Forwarded text';

    expect(trimQuotedText(text)).toBe(text);
  });
});
