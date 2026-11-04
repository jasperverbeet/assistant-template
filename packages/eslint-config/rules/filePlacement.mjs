import { basename, dirname } from 'node:path';

const DEFAULT_ENTRIES = ['index.ts', 'env.ts'];

/**
 * Keeps the root of `src/` for the entry files only. Any other file goes in a
 * feature folder, such as `src/inbox/`, or in `src/scripts/`. The first option
 * lists the file names that the root of `src/` permits.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const filePlacement = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Permit only the entry files directly in src/.'
    },
    schema: [{ type: 'array', items: { type: 'string' } }],
    messages: {
      misplaced:
        'Move "{{name}}" into a feature folder in src/, or into src/scripts/ for a CLI script. Only {{entries}} can be directly in src/.'
    }
  },
  create: (context) => ({
    Program: (program) => {
      const entries = context.options[0] ?? DEFAULT_ENTRIES;
      const name = basename(context.filename);

      if (
        basename(dirname(context.filename)) !== 'src' ||
        entries.includes(name)
      ) {
        return;
      }

      context.report({
        node: program,
        messageId: 'misplaced',
        data: { name, entries: entries.join(', ') }
      });
    }
  })
};

export default filePlacement;
