import { describe, expect, test } from 'bun:test';

import formatTranscript from './formatTranscript';

describe('formatTranscript', () => {
  test('writes one line per utterance with the offset as HH:MM:SS', () => {
    const markdown = formatTranscript({
      title: 'Test',
      utterances: [{ at: 3723.6, speaker: 'speaker_0', text: 'Hoi.' }]
    });

    expect(markdown).toContain('[01:02:03] speaker_0: Hoi.');
  });
});
