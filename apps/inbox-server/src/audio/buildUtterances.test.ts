import { describe, expect, test } from 'bun:test';

import buildUtterances from './buildUtterances';

describe('buildUtterances', () => {
  const word = (text: string, start: number, speaker = 'speaker_0') => ({
    text,
    type: 'word' as const,
    start,
    end: start + 0.3,
    speaker_id: speaker
  });
  const space = { text: ' ', type: 'spacing' as const };

  test('merges words of one speaker and splits on a speaker change', () => {
    expect(
      buildUtterances([
        word('Hoi', 1),
        space,
        word('Sam.', 1.4),
        space,
        word('Hello', 3, 'speaker_1'),
        space,
        word('back.', 3.5, 'speaker_1')
      ])
    ).toEqual([
      { at: 1, speaker: 'speaker_0', text: 'Hoi Sam.' },
      { at: 3, speaker: 'speaker_1', text: 'Hello back.' }
    ]);
  });

  test('splits a long monologue every 60 seconds', () => {
    const utterances = buildUtterances([
      word('a', 0),
      space,
      word('b', 30),
      space,
      word('c', 61)
    ]);

    expect(utterances.map(({ text }) => text)).toEqual(['a b', 'c']);
  });

  test('returns no utterances for no words', () => {
    expect(buildUtterances([])).toEqual([]);
  });
});
