import normalizeWhatsappText from './normalizeWhatsappText';

const REACTION_TARGET = /(?:reageerde|reacted)\b.*?\b(?:op|to): "(.*)"$/is;

/**
 * Reads the target text from the chat-list text of a WhatsApp reaction. For
 * example, `Je reageerde met 👍 op: " hoi!"` gives `hoi!`.
 *
 * @param text - The chat-list text of the reaction.
 * @returns The target text, or `undefined` when the text has another form.
 */
const parseReactionTarget = (text: string) => {
  const target = REACTION_TARGET.exec(normalizeWhatsappText(text))?.[1];

  return target ? normalizeWhatsappText(target) : undefined;
};

export default parseReactionTarget;
