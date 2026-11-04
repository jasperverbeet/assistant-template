import { join } from 'node:path';

import { SEGMENT_NAME } from './parseSegmentTime';

/**
 * Selects the recorder parts in a session folder and builds the list file for
 * the ffmpeg concat demuxer. The name of a part is its local start time, so the
 * name order is the time order. Other files, such as `session.opus`, are not
 * parts.
 *
 * @param dir - The session folder.
 * @param names - The file names in the session folder.
 * @returns The part names in time order and the text of the list file.
 */
const buildConcatList = (dir: string, names: string[]) => {
  const parts = names.filter((name) => SEGMENT_NAME.test(name)).toSorted();
  const list = parts
    .map((name) => `file '${join(dir, name).replaceAll("'", "'\\''")}'\n`)
    .join('');

  return { parts, list };
};

export default buildConcatList;
