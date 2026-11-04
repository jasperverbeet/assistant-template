import { z } from 'zod';

export const whatsappMessageSchema = z.object({
  source: z.literal('whatsapp'),
  account: z.enum(['personal', 'business']),
  chat: z.string().min(1).max(200),
  text: z.string().min(1).max(10_000),
  media: z.string().max(100).optional(),
  unread: z.number().int().positive().optional(),
  time: z.string().max(20),
  fromMe: z.boolean().optional(),
  reaction: z.boolean().optional(),
  emoji: z.string().max(40).optional(),
  firstSeen: z.boolean()
});

export type WhatsappMessage = z.infer<typeof whatsappMessageSchema>;
