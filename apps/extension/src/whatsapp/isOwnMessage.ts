/**
 * Finds out if the last message in a chat row is from the user. WhatsApp shows
 * delivery ticks only on own messages. A media icon is also an SVG, so it does
 * not count.
 *
 * @param status - The `last-msg-status` element of a chat row.
 * @returns `true` when the row shows delivery ticks.
 */
const isOwnMessage = (status: Element) =>
  [...status.querySelectorAll('svg')].some(
    (svg) => !svg.closest('[data-testid="chat-msg-symbol"]')
  );

export default isOwnMessage;
