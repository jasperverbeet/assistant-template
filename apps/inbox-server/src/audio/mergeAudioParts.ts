import { join } from 'node:path';

/**
 * Joins the recorder parts of one session into `session.opus` in the session
 * folder. It writes the concat list to `session.txt`. ffmpeg copies the
 * streams, so it does not encode the audio again. It replaces an old
 * `session.opus`.
 *
 * Ponytail: the recorder loses about 1 second between two parts, and the merged
 * file has no gap there. So a time late in a long session can be a few seconds
 * early. Add silence between the parts if this becomes a problem.
 *
 * @param dir - The session folder.
 * @param list - The text of the concat list file from `buildConcatList`.
 * @returns The path of the merged file.
 */
const mergeAudioParts = async (dir: string, list: string) => {
  const listPath = join(dir, 'session.txt');
  const outputPath = join(dir, 'session.opus');

  await Bun.write(listPath, list);

  const ffmpeg = Bun.spawn(
    [
      'ffmpeg',
      '-hide_banner',
      '-nostdin',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c',
      'copy',
      outputPath
    ],
    { stdout: 'ignore', stderr: 'pipe' }
  );
  const [exitCode, stderr] = await Promise.all([
    ffmpeg.exited,
    new Response(ffmpeg.stderr).text()
  ]);

  if (exitCode !== 0) {
    throw new Error(`ffmpeg failed to merge the parts in ${dir}: ${stderr}`);
  }

  return outputPath;
};

export default mergeAudioParts;
