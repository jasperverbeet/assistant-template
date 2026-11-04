const RETRY_DELAYS_MS = [1000, 2000, 5000, 10_000];

/**
 * Gives the wait time before the next try to connect to Dia. The wait is 1, 2,
 * and 5 seconds, and then 10 seconds for each next try.
 *
 * @param failures - The number of tries that failed in a row.
 * @returns The wait time in milliseconds.
 */
const retryDelayMs = (failures: number) =>
  RETRY_DELAYS_MS[Math.min(failures, RETRY_DELAYS_MS.length - 1)] ?? 10_000;

export default retryDelayMs;
