import { z } from 'zod';

export const scribeWordSchema = z.object({
  text: z.string(),
  type: z.enum(['word', 'spacing', 'audio_event']),
  start: z.number().nullable().optional(),
  end: z.number().nullable().optional(),
  speaker_id: z.string().nullable().optional()
});

export const scribeTranscriptSchema = z.object({
  language_code: z.string(),
  text: z.string(),
  words: z.array(scribeWordSchema)
});

export type ScribeWord = z.infer<typeof scribeWordSchema>;
