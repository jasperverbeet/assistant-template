const BIDI_MARKS = /[‎‏‪-‬]/g;

/**
 * Removes the bidirectional marks that WhatsApp Web puts around a text, and
 * trims the text. The preview id and the target match both use this rule, so
 * the rule must not drift.
 *
 * @param text - The text from WhatsApp Web.
 * @returns The text without bidirectional marks and outer white space.
 */
const normalizeWhatsappText = (text: string) =>
  text.replace(BIDI_MARKS, '').trim();

export default normalizeWhatsappText;
