const ADDRESS =
  /(?:"((?:[^"\\]|\\.)*)"|([^,<>"]*?))\s*<([^<>\s]+)>|([^\s,<>"]+@[^\s,<>"]+)/g;

/**
 * Parses an email address header such as `From`, `To`, or `Cc` into persons. It
 * reads `Name <a@b>`, `"Last, First" <a@b>`, and a bare `a@b`. It writes each
 * address in lower case. A person without a name gets the address as the name.
 *
 * @param header - The header value. An absent header gives an empty list.
 * @returns The persons in header order.
 */
const parseAddressList = (header = '') =>
  [...header.matchAll(ADDRESS)].map((match) => {
    const address = (match[3] ?? match[4] ?? '').toLowerCase();
    const name = (match[1] ?? match[2] ?? '').replace(/\\(.)/g, '$1').trim();

    return { name: name || address, address };
  });

export default parseAddressList;
