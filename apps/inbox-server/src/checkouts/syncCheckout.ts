import { $ } from 'bun';

/**
 * Fetches one checkout and moves its default branch to `origin` with a
 * fast-forward. It never stashes, resets, rebases, or switches branches.
 *
 * - The checked-out default branch merges only when no tracked file has a change.
 * - When another branch is checked out, only the local default branch ref moves.
 *
 * @param path - The absolute path of the checkout.
 * @returns A promise that resolves after the sync. It rejects when a step fails
 *   or the tracked files have changes.
 */
const syncCheckout = async (path: string) => {
  await $`git -C ${path} fetch --prune --quiet origin`.quiet();

  const originHead =
    await $`git -C ${path} symbolic-ref --short refs/remotes/origin/HEAD`
      .quiet()
      .nothrow();

  if (originHead.exitCode !== 0) {
    await $`git -C ${path} remote set-head origin --auto`.quiet();
  }

  const defaultBranch = (
    await $`git -C ${path} symbolic-ref --short refs/remotes/origin/HEAD`.text()
  )
    .trim()
    .replace(/^origin\//, '');
  const currentBranch = (
    await $`git -C ${path} branch --show-current`.text()
  ).trim();

  if (currentBranch !== defaultBranch) {
    await $`git -C ${path} fetch --quiet origin ${defaultBranch}:${defaultBranch}`.quiet();
    return;
  }

  const changes =
    await $`git -C ${path} status --porcelain --untracked-files=no`.text();

  if (changes.trim()) {
    throw new Error(`${defaultBranch} has uncommitted changes`);
  }

  await $`git -C ${path} merge --ff-only --quiet origin/${defaultBranch}`.quiet();
};

export default syncCheckout;
