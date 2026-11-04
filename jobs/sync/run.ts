import { $ } from 'bun';

const MEMORY_PATHS = ['log', 'memory', 'research'];

await $`git add -A -- ${MEMORY_PATHS}`.quiet();

const staged = (
  await $`git diff --cached --name-only -- ${MEMORY_PATHS}`.text()
).trim();

if (staged) {
  await $`git commit -m ${'chore: sync assistant memory and logs'} -- ${MEMORY_PATHS}`.quiet();
}

await $`git pull --rebase --autostash`.quiet();
await $`git push`.quiet();

console.log(
  staged
    ? `Synced ${staged.split('\n').length} changed files in log/, memory/, and research/.`
    : 'Nothing to commit in log/, memory/, and research/. Pushed and pulled.'
);
