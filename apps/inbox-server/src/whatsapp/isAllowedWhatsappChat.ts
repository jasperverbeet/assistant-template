import type { WhatsappMessage } from '@assistant/protocol/whatsappMessageSchema';

interface IsAllowedWhatsappChatOptions {
  preview: WhatsappMessage;
  personalChats: string[];
}

/**
 * Decides if the chat of a WhatsApp preview goes to the inbox. The business
 * account forwards every chat. The personal account forwards only the chats in
 * `personalChats`.
 *
 * @param options - The preview and the personal chat allowlist.
 * @returns `true` when the chat is allowed.
 */
const isAllowedWhatsappChat = ({
  preview,
  personalChats
}: IsAllowedWhatsappChatOptions) =>
  preview.account === 'business' || personalChats.includes(preview.chat);

export default isAllowedWhatsappChat;
