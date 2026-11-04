const SENDER =
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}\b/gi;
const FILE_NAME = /\.(?:md|json|ts)$/i;

/**
 * Takes the Markdown of `memory/ignored-senders.md` and returns each email
 * address and each domain in it, in lower case. A sender is ignored when the
 * address equals an item, or ends with `@` or `.` and a domain item.
 *
 * @param markdown - The content of the file.
 * @returns The addresses and domains, without duplicates.
 */
const parseIgnoredSenders = (markdown: string) => [
  ...new Set(
    [...markdown.matchAll(SENDER)]
      .map((match) => match[0].toLowerCase())
      .filter((sender) => !FILE_NAME.test(sender))
  )
];

export default parseIgnoredSenders;
