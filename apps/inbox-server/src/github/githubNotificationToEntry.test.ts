import { describe, expect, test } from 'bun:test';

import githubNotificationToEntry from './githubNotificationToEntry';

const notification = {
  id: '10000000001',
  repo: 'example-org/example-repo',
  type: 'PullRequest',
  title: 'feat: add read access for assets',
  reason: 'review_requested',
  url: 'https://api.github.com/repos/example-org/example-repo/pulls/504',
  latestCommentUrl: null,
  updatedAt: '2026-11-03T19:12:32Z'
} as const;
const comment = {
  id: '2412345678',
  body: '@owner can you check the policy?',
  user: 'example-reviewer',
  htmlUrl:
    'https://github.com/example-org/example-repo/pull/504#issuecomment-2412345678',
  createdAt: '2026-11-03T19:47:40Z'
};
const receivedAt = '2026-11-03T19:47:53.095Z';

describe('githubNotificationToEntry', () => {
  test('gives one id for updates of a thread on the same UTC day', () => {
    const first = githubNotificationToEntry({
      notification,
      myLogin: 'owner',
      receivedAt
    });
    const later = githubNotificationToEntry({
      notification: { ...notification, updatedAt: '2026-11-03T19:50:07Z' },
      myLogin: 'owner',
      receivedAt
    });

    expect(first.id).toBe('github:10000000001:review_requested:2026-11-03');
    expect(later.id).toBe(first.id);
  });

  test('puts the comment id in the id', () => {
    expect(
      githubNotificationToEntry({
        notification,
        comment,
        myLogin: 'owner',
        receivedAt
      })
    ).toMatchObject({
      id: 'github:10000000001:c2412345678',
      author: { name: 'example-reviewer' },
      fromMe: false,
      text: comment.body,
      links: [comment.htmlUrl]
    });
  });

  test('gives one id for one comment with two reasons', () => {
    const mention = githubNotificationToEntry({
      notification: { ...notification, reason: 'mention' },
      comment,
      myLogin: 'owner',
      receivedAt
    });
    const subscribed = githubNotificationToEntry({
      notification: { ...notification, reason: 'subscribed' },
      comment,
      myLogin: 'owner',
      receivedAt
    });

    expect(subscribed.id).toBe(mention.id);
  });

  test('sets fromMe when the owner wrote the comment', () => {
    expect(
      githubNotificationToEntry({
        notification,
        comment,
        myLogin: 'example-reviewer',
        receivedAt
      }).fromMe
    ).toBe(true);
  });

  test('builds the conversation id from a pull request url', () => {
    expect(
      githubNotificationToEntry({
        notification,
        myLogin: 'owner',
        receivedAt
      }).conversation.id
    ).toBe('github:example-org/example-repo#504');
  });

  test('falls back to the thread when the url is null', () => {
    expect(
      githubNotificationToEntry({
        notification: { ...notification, url: null },
        myLogin: 'owner',
        receivedAt
      }).conversation.id
    ).toBe('github:example-org/example-repo:thread:10000000001');
  });
});
