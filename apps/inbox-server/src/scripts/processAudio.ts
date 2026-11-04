import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import buildConcatList from '../audio/buildConcatList';
import buildUtterances from '../audio/buildUtterances';
import formatTranscript from '../audio/formatTranscript';
import mergeAudioParts from '../audio/mergeAudioParts';
import parseSegmentTime from '../audio/parseSegmentTime';
import { scribeTranscriptSchema } from '../audio/scribeTranscriptSchema';
import transcribeAudio from '../audio/transcribeAudio';
import writeConversationReport from '../audio/writeConversationReport';
import env from '../env';
import appendInboxEntry from '../inbox/appendInboxEntry';
import jobResultToEntry from '../schedule/jobResultToEntry';

const SESSION_ID = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
const sessionCacheSchema = z.object({
  parts: z.array(z.string()),
  transcript: scribeTranscriptSchema
});
const { positionals } = parseArgs({ allowPositionals: true });
const [sessionId] = z.tuple([z.string().regex(SESSION_ID)]).parse(positionals);
const startedAt = new Date().toISOString();
const audioDir = join(env.INBOX_DIR, 'audio', sessionId);
const repoDir = join(env.INBOX_DIR, '..');
let ok = true;
let output: string;

try {
  const { parts, list } = buildConcatList(audioDir, await readdir(audioDir));
  const [firstPart] = parts;

  if (!firstPart) {
    throw new Error(`No audio parts in ${audioDir}.`);
  }

  const cacheFile = Bun.file(join(audioDir, 'session.json'));
  const cached = (await cacheFile.exists())
    ? sessionCacheSchema.parse(await cacheFile.json())
    : undefined;
  const isCacheValid = cached?.parts.join('\n') === parts.join('\n');
  const scribe =
    cached && isCacheValid
      ? cached.transcript
      : await transcribeAudio(await mergeAudioParts(audioDir, list));

  await Bun.write(cacheFile, JSON.stringify({ parts, transcript: scribe }));
  console.info(
    `Transcribed ${parts.length} parts as one file: ${scribe.words.length} items.`
  );

  const transcript = {
    startedAt: parseSegmentTime(firstPart).toISOString(),
    utterances: buildUtterances(scribe.words)
  };
  const markdown = formatTranscript({
    title: `Conversation ${sessionId}`,
    utterances: transcript.utterances
  });
  const transcriptDir = join(env.INBOX_DIR, 'transcripts');
  const reportPath = join(
    env.INBOX_DIR,
    'reports',
    `conversation-${sessionId}.md`
  );

  await mkdir(transcriptDir, { recursive: true });
  await writeFile(
    join(transcriptDir, `${sessionId}.json`),
    JSON.stringify(transcript, null, 2)
  );
  await writeFile(join(transcriptDir, `${sessionId}.md`), markdown);

  if (transcript.utterances.length === 0) {
    output = `Conversation ${sessionId}: no speech found in ${parts.length} parts. No report.`;
  } else {
    const report = await writeConversationReport(markdown);
    await mkdir(join(env.INBOX_DIR, 'reports'), { recursive: true });
    await writeFile(reportPath, `${report}\n`);
    output = `Conversation report ready: ${relative(repoDir, reportPath)} (${parts.length} parts, ${transcript.utterances.length} utterances). Transcript: inbox/transcripts/${sessionId}.md`;
  }
} catch (error) {
  ok = false;
  output = `Conversation processing failed for ${sessionId}. Run again with: pnpm audio:process ${sessionId}\n${String(error)}`;
}

await appendInboxEntry({
  entry: jobResultToEntry({
    result: { job: 'audio', ok, notify: true, output },
    startedAt,
    receivedAt: new Date().toISOString()
  }),
  seenIds: new Set()
});
console.info(output);
process.exitCode = ok ? 0 : 1;
