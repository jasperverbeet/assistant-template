import type { CdpCall } from '@assistant/cdp-client/connectDia';
import { whatsappChatRowSchema } from '@assistant/protocol/whatsappChatRowSchema';
import { z } from 'zod';

import clickElement from '../cdp/clickElement';
import evaluateInPage from '../cdp/evaluateInPage';

const FRAME_POSITIONS = [0.02, 0.2, 0.4, 0.6, 0.8, 0.95];

interface ReadChatOptions {
  call: CdpCall;
  sessionId: string;
  chat: string;
  count: number;
}

/**
 * Opens a chat and reads its last messages. It opens each video in the media
 * viewer and takes frames from it. The chat stays open, so WhatsApp marks it as
 * read.
 *
 * Ponytail: it reads only the messages that WhatsApp has rendered, about the
 * last 20. Scroll up in `#main` first if a run must read more.
 *
 * @param options - The CDP call function, the session of the WhatsApp page, the
 *   chat name, and the number of messages.
 * @returns The messages, oldest first, with data URLs for media.
 */
const readChat = async ({ call, sessionId, chat, count }: ReadChatOptions) => {
  const chatJson = JSON.stringify(chat);

  await clickElement(
    call,
    sessionId,
    `[...document.querySelectorAll('#pane-side [data-testid="cell-frame-title"] span[title]')].find((e) => e.getAttribute('title') === ${chatJson}).closest('[role="row"]')`
  );
  await evaluateInPage(
    call,
    sessionId,
    `(async () => { for (let i = 0; i < 40; i++) { const norm = (v) => (v ?? '').replace(/[^\\p{L}\\p{N} ]/gu, '').trim(); if (norm(document.querySelector('#main [data-testid="conversation-info-header-chat-title"]')?.textContent) === norm(${chatJson})) return; await new Promise((r) => setTimeout(r, 250)); } throw new Error('The chat did not open'); })()`
  );

  const messages = z.array(whatsappChatRowSchema).parse(
    await evaluateInPage(
      call,
      sessionId,
      `(async () => {
        const rows = [...document.querySelectorAll('#main [data-testid^="conv-msg-"]')].slice(-${count});
        const toJpeg = (source, width, height) => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(width, 900);
          canvas.height = Math.round((height * canvas.width) / width);
          canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.75);
        };
        return rows.map((row) => {
          const own = (selector) => [...row.querySelectorAll(selector)].filter((e) => !e.closest('[data-testid="quoted-message"]'));
          const prefix = row.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') ?? '';
          const meta = prefix.match(/^\\[([^\\]]+)\\] (.*): $/);
          const quote = row.querySelector('[data-testid="quoted-message"]');
          const image = own('img[src^="blob:"]').at(-1);
          return {
            id: row.getAttribute('data-id') ?? '',
            author: meta?.[2] ?? row.querySelector('[data-testid="author"]')?.textContent ?? '',
            fromMe: !!row.querySelector('[data-testid="msg-meta"] svg'),
            time: meta?.[1] ?? row.querySelector('[data-testid="msg-meta"]')?.textContent ?? '',
            text: own('[data-testid="selectable-text"]').filter((e) => !e.parentElement.closest('[data-testid="selectable-text"]')).map((e) => e.innerText).join('\\n'),
            kind: own('[data-testid="video-content"]').length ? 'video' : image ? 'image' : 'text',
            images: image ? [toJpeg(image, image.naturalWidth, image.naturalHeight)] : [],
            replyToText: quote ? (quote.querySelector('.quoted-mention')?.innerText ?? quote.innerText.split('\\n').at(-1) ?? '') : ''
          };
        });
      })()`
    )
  );

  for (const message of messages) {
    if (message.kind !== 'video') {
      continue;
    }

    await clickElement(
      call,
      sessionId,
      `document.querySelector('#main [data-id="${message.id}"] [data-testid="video-content"]')`
    );
    message.images = z.array(z.string()).parse(
      await evaluateInPage(
        call,
        sessionId,
        `(async () => {
          let video;
          for (let i = 0; i < 40 && !(video = [...document.querySelectorAll('video')].find((v) => v.readyState >= 1)); i++) await new Promise((r) => setTimeout(r, 250));
          if (!video) return [];
          video.pause();
          video.muted = true;
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(video.videoWidth, 720);
          canvas.height = Math.round((video.videoHeight * canvas.width) / video.videoWidth);
          const frames = [];
          for (const position of ${JSON.stringify(FRAME_POSITIONS)}) {
            video.currentTime = video.duration * position;
            await new Promise((r) => video.addEventListener('seeked', r, { once: true }));
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
          }
          return frames;
        })()`
      )
    );

    for (const type of ['keyDown', 'keyUp']) {
      await call(
        'Input.dispatchKeyEvent',
        { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 },
        sessionId
      );
    }
  }

  return messages;
};

export default readChat;
