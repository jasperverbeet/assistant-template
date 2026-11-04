import { z } from 'zod';

export const googleCredentialsSchema = z.object({
  refresh_token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  token_uri: z.url()
});

export const googleTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive()
});

export const gmailProfileSchema = z.object({
  emailAddress: z.string(),
  historyId: z.string()
});

export const gmailHistorySchema = z.object({
  historyId: z.string(),
  nextPageToken: z.string().optional(),
  history: z
    .array(
      z.object({
        messagesAdded: z
          .array(
            z.object({
              message: z.object({
                id: z.string(),
                labelIds: z.array(z.string()).default([])
              })
            })
          )
          .default([])
      })
    )
    .default([])
});

export const gmailMessageListSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).default([])
});

const headerSchema = z.object({ name: z.string(), value: z.string() });

export interface GmailPart {
  mimeType: string;
  filename?: string;
  headers?: z.infer<typeof headerSchema>[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}

export const gmailPartSchema: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    mimeType: z.string(),
    filename: z.string().optional(),
    headers: z.array(headerSchema).optional(),
    body: z
      .object({
        size: z.number().optional(),
        data: z.string().optional(),
        attachmentId: z.string().optional()
      })
      .optional(),
    parts: z.array(gmailPartSchema).optional()
  })
);

export const gmailMessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()).default([]),
  snippet: z.string().default(''),
  internalDate: z.string(),
  payload: gmailPartSchema
});

export type GmailMessage = z.infer<typeof gmailMessageSchema>;
