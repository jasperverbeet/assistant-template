/**
 * Forbids `//` comments. A triple-slash directive is permitted.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const noLineComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Use /** */ comments only.' },
    schema: [],
    messages: {
      lineComment:
        'Use a /** */ comment on the function, or remove the comment. Do not use // comments.'
    }
  },
  create: (context) => ({
    Program: () => {
      for (const comment of context.sourceCode.getAllComments()) {
        if (comment.type !== 'Line' || comment.value.startsWith('/')) {
          continue;
        }

        context.report({ loc: comment.loc, messageId: 'lineComment' });
      }
    }
  })
};

export default noLineComments;
