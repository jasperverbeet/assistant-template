const QUOTE_START = [
  /^(?:On|Op) [^\n]*(?:\n[^\n]*)?\b(?:wrote|schreef)\b[^\n]*(?:\n[^\n]*)?:[ \t]*$/m,
  /^-{2,}\s*(?:Original Message|Oorspronkelijk bericht|Origineel bericht)\s*-{2,}/im,
  /^(?:From|Van): [^\n]*\n(?:Sent|Date|Verzonden|Datum): /m,
  /^_{20,}[ \t]*$/m
];

/**
 * Cuts the quoted history from the plain text of an email. The cut is at the
 * first line that starts a quote: `On ... wrote:`, `Op ... schreef ...:`, an
 * `Original Message` line, an Outlook header block, or a line of underscores.
 * The `On` and `Op` line can wrap before and after `wrote` or `schreef`. When
 * the cut leaves no text, the function returns the full text, because the email
 * is then only a forward.
 *
 * @param text - The plain text of the email.
 * @returns The trimmed text without the quote.
 */
const trimQuotedText = (text: string) => {
  const cut = Math.min(
    ...QUOTE_START.map((pattern) => pattern.exec(text)?.index ?? text.length)
  );
  const trimmed = text.slice(0, cut).trim();

  return trimmed || text.trim();
};

export default trimQuotedText;
