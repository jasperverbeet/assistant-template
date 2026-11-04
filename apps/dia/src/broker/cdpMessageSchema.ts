import { z } from 'zod';

export const cdpMessageSchema = z.looseObject({
  id: z.number().int().optional(),
  method: z.string().optional(),
  sessionId: z.string().optional(),
  params: z.looseObject({}).optional(),
  error: z.looseObject({}).optional(),
  result: z.looseObject({}).optional()
});

export type CdpMessage = z.infer<typeof cdpMessageSchema>;

export const targetInfoSchema = z.looseObject({
  targetId: z.string(),
  type: z.string()
});

export type TargetInfo = z.infer<typeof targetInfoSchema>;

export const targetFilterSchema = z.array(
  z.object({ type: z.string().optional(), exclude: z.boolean().optional() })
);

export type TargetFilter = z.infer<typeof targetFilterSchema>;
