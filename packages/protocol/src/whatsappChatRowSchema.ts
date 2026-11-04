import { z } from 'zod';

export const whatsappChatRowSchema = z.object({
  id: z.string(),
  author: z.string(),
  fromMe: z.boolean(),
  time: z.string(),
  text: z.string(),
  kind: z.enum(['text', 'image', 'video']),
  images: z.array(z.string()),
  replyToText: z.string()
});

export type WhatsappChatRow = z.infer<typeof whatsappChatRowSchema>;
