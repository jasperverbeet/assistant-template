import type { Utterance } from './buildUtterances';

interface FormatTranscriptOptions {
  title: string;
  utterances: Utterance[];
}

/**
 * Formats utterances as a Markdown transcript, one line per utterance:
 * `[01:02:03] speaker_0: text`. The time is the offset from the start of the
 * recording.
 *
 * @param options - The title and the utterances.
 * @returns The Markdown transcript.
 */
const formatTranscript = ({ title, utterances }: FormatTranscriptOptions) => {
  const lines = utterances.map(({ at, speaker, text }) => {
    const time = new Date(Math.floor(at) * 1000).toISOString().slice(11, 19);
    return `[${time}] ${speaker}: ${text}`;
  });

  return `# ${title}\n\n${lines.join('\n')}\n`;
};

export default formatTranscript;
