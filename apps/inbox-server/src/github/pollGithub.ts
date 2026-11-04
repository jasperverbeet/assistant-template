import env from '../env';
import {
  githubCommentSchema,
  githubNotificationSchema
} from './githubNotificationSchema';
import githubNotificationToEntry from './githubNotificationToEntry';
import runGh from './runGh';
import appendInboxEntry from '../inbox/appendInboxEntry';
import readInboxState from '../inbox/readInboxState';
import updateInboxState from '../inbox/updateInboxState';

const NOTIFICATION_JQ =
  '.[] | {id, reason, updatedAt: .updated_at, repo: .repository.full_name, type: .subject.type, title: .subject.title, url: .subject.url, latestCommentUrl: .subject.latest_comment_url}';
const COMMENT_JQ =
  '{id, body: (.body // ""), user: .user.login, htmlUrl: .html_url, createdAt: (.created_at // .submitted_at)}';

/**
 * Polls GitHub notifications through the `gh` CLI and appends each new one to
 * the inbox. For a notification with a latest comment, it reads that comment,
 * so the entry has the real author, text, and link. When the entry of that
 * comment is already in the inbox, the comment is old, and the notification
 * gives an entry without the comment. A failed comment read also gives an entry
 * without the comment. It stores the last poll time in `inbox/state.json`, so a
 * restart continues where it stopped. It never returns.
 *
 * @param seenIds - The ids in the inbox file. The poll drops a repeat.
 * @returns A promise that never resolves.
 */
const pollGithub = async (seenIds: Set<string>) => {
  let since =
    (await readInboxState()).githubLastPolledAt ?? new Date().toISOString();
  let myLogin = '';

  while (true) {
    const startedAt = new Date().toISOString();

    try {
      myLogin ||= (await runGh(['api', 'user', '--jq', '.login'])).trim();

      const lines = (
        await runGh([
          'api',
          '--paginate',
          `notifications?all=true&since=${since}`,
          '--jq',
          NOTIFICATION_JQ
        ])
      )
        .split('\n')
        .filter(Boolean);

      for (const line of lines) {
        const notification = githubNotificationSchema.parse(JSON.parse(line));
        const commentUrl =
          notification.latestCommentUrl === notification.url
            ? null
            : notification.latestCommentUrl;
        const comment = commentUrl
          ? await runGh(['api', commentUrl, '--jq', COMMENT_JQ])
              .then((output) => githubCommentSchema.parse(JSON.parse(output)))
              .catch((error: unknown) => {
                console.error('GitHub comment read failed', error);
                return undefined;
              })
          : undefined;
        const receivedAt = new Date().toISOString();
        const withComment = githubNotificationToEntry({
          notification,
          comment,
          myLogin,
          receivedAt
        });

        await appendInboxEntry({
          entry:
            comment && seenIds.has(withComment.id)
              ? githubNotificationToEntry({ notification, myLogin, receivedAt })
              : withComment,
          seenIds
        });
      }

      since = startedAt;
      await updateInboxState({ githubLastPolledAt: since });
    } catch (error) {
      console.error('GitHub poll failed', error);
    }

    await Bun.sleep(env.GITHUB_POLL_SECONDS * 1000);
  }
};

export default pollGithub;
