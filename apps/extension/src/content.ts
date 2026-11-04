/**
 * Watches the WhatsApp Web chat list and scans it after each change. The
 * extension can inject this script a second time into the same tab, for example
 * from the manifest and from the `onInstalled` handler. Each extension load
 * gets a new isolated world, so the flag on `window` stops only a duplicate
 * from the same load.
 */
import scanChatList from './whatsapp/scanChatList';
import type { ChatListState } from './whatsapp/scanChatList';

const SCAN_DELAY_MS = 500;
const LOADED_FLAG = 'assistantInboxLoaded';

const state: ChatListState = { lastTextByChat: new Map(), isSeeded: false };
let scanTimer: number | undefined;

if (!Reflect.has(window, LOADED_FLAG)) {
  Reflect.set(window, LOADED_FLAG, true);
  new MutationObserver(() => {
    if (scanTimer !== undefined) {
      return;
    }

    scanTimer = window.setTimeout(() => {
      scanTimer = undefined;
      scanChatList(state);
    }, SCAN_DELAY_MS);
  }).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributeFilter: ['title']
  });
}
