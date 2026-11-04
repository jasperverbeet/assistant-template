import type { TargetFilter } from './cdpMessageSchema';

export const DEFAULT_TARGET_FILTER: TargetFilter = [
  { type: 'browser', exclude: true },
  { type: 'tab', exclude: true },
  {}
];

/**
 * Applies a CDP target filter to a target type. The first entry that matches
 * the type decides. When no entry matches, the filter excludes the target.
 *
 * @param filter - The CDP filter entries.
 * @param type - The target type, for example `page` or `tab`.
 * @returns True when the filter includes the target.
 */
const matchesTargetFilter = (filter: TargetFilter, type: string) => {
  const entry = filter.find(
    (candidate) => candidate.type === undefined || candidate.type === type
  );

  return entry !== undefined && entry.exclude !== true;
};

export default matchesTargetFilter;
