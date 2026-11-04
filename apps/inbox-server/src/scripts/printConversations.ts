import foldConversationStates from '../inbox/foldConversationStates';
import readInboxEntries from '../inbox/readInboxEntries';

const SHOWN_STATUSES = ['waiting_on_me', 'open', 'waiting_on_them'] as const;
const TEXT_PREVIEW_LENGTH = 80;

const states = foldConversationStates({
  entries: await readInboxEntries(),
  now: new Date()
}).sort((left, right) => right.lastAt.localeCompare(left.lastAt));

for (const status of SHOWN_STATUSES) {
  const matching = states.filter((state) => state.status === status);

  console.info(`${status} (${matching.length})`);

  for (const state of matching) {
    const text = state.lastText
      .replace(/\s+/g, ' ')
      .slice(0, TEXT_PREVIEW_LENGTH);

    console.info(
      `  ${state.lastAt}  ${state.conversation.id}  ${state.conversation.title}  ${text}`
    );
  }
}
