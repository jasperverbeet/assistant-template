const REACTION_TEXT_LIMIT = 200;
const REACTION_PREFIX = /^(je )?reageerde met|^(you )?reacted/i;

/**
 * Reads the reaction that a chat row shows instead of a message. For a
 * reaction, WhatsApp keeps the text of the old message in the `title`. The
 * visible text starts with "Je reageerde met" when the user reacted, and with
 * "Reageerde met" when the other person reacted. The emoji is an image, so it
 * is not in the visible text. The function puts the emoji back after the
 * prefix.
 *
 * Ponytail: it knows only the Dutch and English texts. Add a language when
 * WhatsApp Web runs in another language.
 *
 * @param visibleText - The `innerText` of the `last-msg-status` element.
 * @param emoji - The `alt` of the first emoji image in that element.
 * @returns The reaction text with single spaces, the emoji, and the author
 *   flag, or `undefined` when the row does not show a reaction.
 */
const readReaction = (visibleText: string, emoji?: string) => {
  const text = visibleText.replace(/\s+/g, ' ').trim();

  if (!REACTION_PREFIX.test(text)) {
    return undefined;
  }

  return {
    text: (emoji ? text.replace(REACTION_PREFIX, `$& ${emoji}`) : text).slice(
      0,
      REACTION_TEXT_LIMIT
    ),
    emoji,
    fromMe: /^(je|you) /i.test(text)
  };
};

export default readReaction;
