import {
  INBOX_ENTRY_VERSION,
  INBOX_TEXT_LIMIT,
  inboxEntrySchema
} from '@assistant/protocol/inboxEntrySchema';

import type {
  GithubComment,
  GithubNotification
} from './githubNotificationSchema';

const ISSUE_URL =
  /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/(?:pulls|issues)\/(\d+)$/;
const DATE_LENGTH = 'YYYY-MM-DD'.length;

interface GithubNotificationToEntryOptions {
  notification: GithubNotification;
  comment?: GithubComment;
  myLogin: string;
  receivedAt: string;
}

/**
 * Maps a GitHub notification to an inbox entry of the kind `message`. With a
 * comment, the id is the thread id and the comment id, and the comment gives
 * the author, the text, and the link. The reason is not in that id, so one
 * comment gives one entry for all reasons. Without a comment, the id holds the
 * reason and the UTC day of `updatedAt`. So all updates of one thread with one
 * reason on one day get the same id.
 *
 * @param options - The notification, its latest comment if known, the login of
 *   The owner, and the time the server received it.
 * @returns The validated inbox entry.
 */
const githubNotificationToEntry = ({
  notification,
  comment,
  myLogin,
  receivedAt
}: GithubNotificationToEntryOptions) => {
  const issue = ISSUE_URL.exec(notification.url ?? '');
  const id = comment
    ? `github:${notification.id}:c${comment.id}`
    : `github:${notification.id}:${notification.reason}:${new Date(notification.updatedAt).toISOString().slice(0, DATE_LENGTH)}`;

  return inboxEntrySchema.parse({
    v: INBOX_ENTRY_VERSION,
    id,
    kind: 'message',
    conversation: {
      id: issue
        ? `github:${issue[1]}#${issue[2]}`
        : `github:${notification.repo}:thread:${notification.id}`,
      title: notification.title
    },
    author: comment ? { name: comment.user, address: comment.user } : undefined,
    fromMe: comment?.user === myLogin,
    sentAt: comment?.createdAt ?? notification.updatedAt,
    receivedAt,
    text: (comment?.body ?? notification.title).slice(0, INBOX_TEXT_LIMIT),
    links: comment ? [comment.htmlUrl] : [],
    source: {
      channel: 'github',
      threadId: notification.id,
      repo: notification.repo,
      type: notification.type,
      reason: notification.reason,
      url: notification.url,
      updatedAt: notification.updatedAt,
      commentId: comment?.id
    }
  });
};

export default githubNotificationToEntry;
