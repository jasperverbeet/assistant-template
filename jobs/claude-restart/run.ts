import { $ } from 'bun';

const CLAUDE_PANE = 'assistant:claude';

await $`claude update`.quiet().nothrow();

const version = (await $`claude --version`.text()).trim();

await $`tmux respawn-pane -k -t ${CLAUDE_PANE}`.quiet();

console.log(
  `Restarted the supervised Claude session on Claude Code ${version}. Its loop resumes the same conversation.`
);
