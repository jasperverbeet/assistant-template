import { basename } from 'node:path';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import buildUtterances from '../audio/buildUtterances';
import formatTranscript from '../audio/formatTranscript';
import transcribeAudio from '../audio/transcribeAudio';

const { positionals } = parseArgs({ allowPositionals: true });
const [path] = z.tuple([z.string().min(1)]).parse(positionals);
const transcript = await transcribeAudio(path);

console.info(
  formatTranscript({
    title: basename(path),
    utterances: buildUtterances(transcript.words)
  })
);
