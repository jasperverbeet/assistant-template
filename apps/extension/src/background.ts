/*
 * Bun build replaces each process.env value in this file with a literal. The
 * env module cannot run in the extension.
 */
/* eslint-disable no-restricted-syntax */
chrome.runtime.onMessage.addListener((message: unknown) => {
  fetch(process.env.INBOX_URL ?? '', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.INBOX_TOKEN}`
    },
    body: JSON.stringify(message)
  }).catch((error: unknown) => {
    console.error('Inbox server is unreachable', error);
  });
});

/**
 * Injects the content script into each open WhatsApp Web tab after an install
 * or an update. A reload of the extension orphans the old content script, and
 * Chrome does not inject the manifest content script into open tabs. This
 * replaces a reload of the tab, which can make WhatsApp Web hang.
 */
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });

  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      await chrome.scripting
        .executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
        .catch((error: unknown) => {
          console.error('Content script injection failed', error);
        });
    })
  );
});
