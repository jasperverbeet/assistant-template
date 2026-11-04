import { z } from 'zod';

export const githubNotificationSchema = z.object({
  id: z.string(),
  repo: z.string(),
  type: z.string(),
  title: z.string(),
  reason: z.string(),
  url: z.string().nullable(),
  latestCommentUrl: z.string().nullable(),
  updatedAt: z.string()
});

export type GithubNotification = z.infer<typeof githubNotificationSchema>;

export const githubCommentSchema = z.object({
  id: z.coerce.string(),
  body: z.string(),
  user: z.string(),
  htmlUrl: z.string(),
  createdAt: z.string()
});

export type GithubComment = z.infer<typeof githubCommentSchema>;
