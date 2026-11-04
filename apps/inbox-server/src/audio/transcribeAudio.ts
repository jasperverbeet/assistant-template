import { basename } from 'node:path';

import { scribeTranscriptSchema } from './scribeTranscriptSchema';
import env from '../env';

const SCRIBE_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const SCRIBE_MODEL = 'scribe_v2';

/**
 * Sends one audio file to ElevenLabs Scribe and returns the transcript. Scribe
 * detects the language itself, marks the speakers (diarization), and gives a
 * start and end time for each word. It also tags sounds such as laughter.
 *
 * Scribe numbers the speakers per file. Send a full session as one file, so a
 * speaker keeps one label for the full recording. The ElevenLabs docs give a
 * limit of 3 GB and 10 hours for one file. A 4-hour session at 24 kbit/s is
 * about 43 MB.
 *
 * @param path - The path of the audio file.
 * @returns The validated Scribe transcript.
 */
const transcribeAudio = async (path: string) => {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error(
      'ELEVENLABS_API_KEY is not set. Add it to the 1Password item of the secrets and to .env.'
    );
  }

  const form = new FormData();
  form.append('model_id', SCRIBE_MODEL);
  form.append('diarize', 'true');
  form.append('tag_audio_events', 'true');
  form.append('timestamps_granularity', 'word');
  form.append('file', Bun.file(path), basename(path));

  const response = await fetch(SCRIBE_URL, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
    body: form
  });

  if (!response.ok) {
    throw new Error(
      `ElevenLabs answered ${response.status} for ${basename(path)}: ${await response.text()}`
    );
  }

  return scribeTranscriptSchema.parse(await response.json());
};

export default transcribeAudio;
