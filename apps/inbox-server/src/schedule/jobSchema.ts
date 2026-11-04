import { z } from 'zod';

export const WEEKDAYS = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat'
] as const;

export const jobSchema = z.object({
  kind: z.enum(['script', 'agent']),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weekdays: z.array(z.enum(WEEKDAYS)).optional(),
  enabled: z.boolean(),
  notify: z.boolean().default(false)
});

export type Job = z.infer<typeof jobSchema>;
