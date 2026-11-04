import topLevelFunctions from './topLevelFunctions.mjs';

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
const CLI_SCRIPT = /\/src\/scripts\//;

/**
 * Allows at most one function at module scope. A closure inside that function
 * is permitted. An entry script has zero functions and only top-level wiring. A
 * test file has zero top-level functions. Its helpers are closures inside the
 * `describe` callback. A CLI script in `src/scripts/` has zero functions.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const oneFunctionPerFile = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Allow at most one top-level function in each file.'
    },
    schema: [],
    messages: {
      testHelper:
        'Do not put a function at the top level of a test file. Move "{{name}}" inside the describe callback.',
      scriptFunction:
        'Do not put a function in a CLI script. Move "{{name}}" to its own file in a feature folder.',
      tooMany:
        'Keep one top-level function in each file. Found {{count}}. Move "{{name}}" to its own file, or make it a closure inside the main function.'
    }
  },
  create: (context) => ({
    'Program:exit': (program) => {
      const functions = topLevelFunctions(program);
      const zeroMessageId = TEST_FILE.test(context.filename)
        ? 'testHelper'
        : CLI_SCRIPT.test(context.filename)
          ? 'scriptFunction'
          : undefined;

      for (const fn of zeroMessageId ? functions : functions.slice(1)) {
        context.report({
          node: fn.node,
          messageId: zeroMessageId ?? 'tooMany',
          data: {
            count: String(functions.length),
            name: fn.name ?? 'anonymous'
          }
        });
      }
    }
  })
};

export default oneFunctionPerFile;
