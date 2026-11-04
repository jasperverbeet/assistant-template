import type { WhatsappMessage } from '@assistant/protocol/whatsappMessageSchema';

import isOwnMessage from './isOwnMessage';
import readReaction from './readReaction';

export interface ChatListState {
  lastTextByChat: Map<string, string>;
  isSeeded: boolean;
}

/**
 * Reads the visible chat list and forwards each chat whose last message
 * changed. It also forwards own messages and reactions. For a reaction, the
 * visible reaction text replaces the `title`, because the `title` keeps the old
 * message text. The first emoji image in the row is the reaction emoji. The
 * first scan with rows only records the current state. A chat that appears
 * later for the first time gets `firstSeen`, because it can be an old message
 * that came into view by a scroll.
 *
 * @param state - The last text per chat and the seed flag. The scan changes
 *   both.
 * @returns Nothing.
 */
const scanChatList = (state: ChatListState) => {
  const rows = document.querySelectorAll('#pane-side [role="row"]');

  if (rows.length === 0) {
    return;
  }

  for (const row of rows) {
    const chat = row
      .querySelector('[data-testid="cell-frame-title"] span[title]')
      ?.getAttribute('title');
    const status = row.querySelector<HTMLElement>(
      '[data-testid="last-msg-status"]'
    );
    const title = status?.getAttribute('title');

    if (!chat || !status || !title) {
      continue;
    }

    const reaction = readReaction(
      status.innerText,
      status.querySelector('img[alt]')?.getAttribute('alt') ?? undefined
    );
    const text = reaction?.text ?? title;

    const previousText = state.lastTextByChat.get(chat);

    state.lastTextByChat.set(chat, text);

    if (!state.isSeeded || previousText === text) {
      continue;
    }

    const message: WhatsappMessage = {
      source: 'whatsapp',
      account: document.title.includes('WhatsApp Business')
        ? 'business'
        : 'personal',
      chat,
      text,
      media:
        status.querySelector('[data-testid="chat-msg-symbol"] svg title')
          ?.textContent ?? undefined,
      unread:
        Number.parseInt(
          row.querySelector('[data-testid="icon-unread-count"]')?.textContent ??
            '',
          10
        ) || undefined,
      time:
        row.querySelector('[data-testid="chat-list-timestamp"]')?.textContent ??
        '',
      fromMe: reaction ? reaction.fromMe : isOwnMessage(status),
      reaction: reaction ? true : undefined,
      emoji: reaction?.emoji,
      firstSeen: previousText === undefined
    };

    chrome.runtime.sendMessage(message).catch((error: unknown) => {
      console.error('Assistant extension is unreachable', error);
    });
  }

  state.isSeeded = true;
};

export default scanChatList;
