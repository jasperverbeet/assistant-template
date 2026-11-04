import type { ScribeWord } from './scribeTranscriptSchema';

const MAX_UTTERANCE_SECONDS = 60;

export interface Utterance {
  at: number;
  speaker: string;
  text: string;
}

/**
 * Groups the Scribe words of one recording into utterances. Each utterance
 * holds the words of one speaker in a row, up to 60 seconds. `at` is the start
 * in seconds from the start of the recording.
 *
 * @param words - The Scribe words in time order.
 * @returns The utterances in time order.
 */
const buildUtterances = (words: ScribeWord[]) => {
  const utterances: Utterance[] = [];
  let current: Utterance | undefined;

  for (const word of words) {
    const at = word.start ?? 0;
    const speaker = word.speaker_id ?? 'unknown';
    const isNewUtterance =
      word.type !== 'spacing' &&
      (!current ||
        current.speaker !== speaker ||
        at - current.at > MAX_UTTERANCE_SECONDS);

    if (isNewUtterance) {
      current = { at, speaker, text: '' };
      utterances.push(current);
    }

    if (current) {
      current.text += word.text;
    }
  }

  return utterances
    .map((utterance) => ({ ...utterance, text: utterance.text.trim() }))
    .filter((utterance) => utterance.text);
};

export default buildUtterances;
