import { describe, expect, test } from 'bun:test';

import isAllowedWhatsappChat from './isAllowedWhatsappChat';

const preview = {
  source: 'whatsapp',
  account: 'personal',
  chat: 'Team chat',
  text: 'Can you check the deploy?',
  time: '14:02',
  firstSeen: false
} as const;

describe('isAllowedWhatsappChat', () => {
  test('accepts every business chat', () => {
    expect(
      isAllowedWhatsappChat({
        preview: { ...preview, account: 'business' },
        personalChats: []
      })
    ).toBe(true);
  });

  test('rejects a personal chat that is not on the allowlist', () => {
    expect(isAllowedWhatsappChat({ preview, personalChats: ['Family'] })).toBe(
      false
    );
  });

  test('accepts a personal chat on the allowlist', () => {
    expect(
      isAllowedWhatsappChat({ preview, personalChats: ['Team chat'] })
    ).toBe(true);
  });
});
