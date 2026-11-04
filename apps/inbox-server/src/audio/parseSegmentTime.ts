export const SEGMENT_NAME =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.opus$/;

/**
 * Reads the start time of a recorder segment from its file name. The recorder
 * names each segment after its local start time: `2026-11-04_14-30-00.opus`.
 *
 * @param name - The file name of the segment, without a folder.
 * @returns The local start time of the segment.
 */
const parseSegmentTime = (name: string) => {
  const match = SEGMENT_NAME.exec(name);

  if (!match) {
    throw new Error(`Not a segment name: ${name}`);
  }

  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map(Number) as [number, number, number, number, number, number];

  return new Date(year, month - 1, day, hour, minute, second);
};

export default parseSegmentTime;
