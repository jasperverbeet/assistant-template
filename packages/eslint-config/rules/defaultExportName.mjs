import { basename } from 'node:path';

import topLevelFunctions from './topLevelFunctions.mjs';

/**
 * Makes the default export the primary function of the file, named after the
 * file: `readInboxState.ts` default-exports `readInboxState`. A function is
 * never a named export. A file without a function, such as a schema file, uses
 * named exports. It may default-export a value named after the file, such as
 * `env`. A test file is skipped.
 *
 * @type {import('eslint').Rule.RuleModule}
 */
const defaultExportName = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Default-export the primary function under the name of the file.'
    },
    schema: [],
    messages: {
      missing:
        'Default-export "{{name}}" as "export default {{expected}};" and rename it to match the file name.',
      mismatch:
        'The default export "{{name}}" must match the file name "{{expected}}". Rename the export or the file.',
      anonymous:
        'Assign the default export to "const {{expected}}" and export that name.',
      namedFunction:
        'Do not export the function "{{name}}" by name. Export it as the default export of its own file.'
    }
  },
  create: (context) => {
    const expected = basename(context.filename).replace(/\..*$/, '');

    if (/\.test\.[cm]?[jt]sx?$/.test(context.filename)) {
      return {};
    }

    return {
      'Program:exit': (program) => {
        const functions = topLevelFunctions(program);
        const functionNames = new Set(functions.map((fn) => fn.name));
        const defaultExport = program.body.find(
          (statement) => statement.type === 'ExportDefaultDeclaration'
        );

        for (const fn of functions.filter((fn) => fn.exportKind === 'named')) {
          context.report({
            node: fn.node,
            messageId: 'namedFunction',
            data: { name: fn.name }
          });
        }

        for (const statement of program.body) {
          if (statement.type !== 'ExportNamedDeclaration' || statement.source) {
            continue;
          }

          for (const specifier of statement.specifiers) {
            if (!functionNames.has(specifier.local.name)) {
              continue;
            }

            context.report({
              node: specifier,
              messageId: 'namedFunction',
              data: { name: specifier.local.name }
            });
          }
        }

        if (!defaultExport) {
          if (functions.length > 0) {
            context.report({
              node: functions[0].node,
              messageId: 'missing',
              data: { name: functions[0].name ?? 'anonymous', expected }
            });
          }

          return;
        }

        const name =
          defaultExport.declaration.type === 'Identifier'
            ? defaultExport.declaration.name
            : defaultExport.declaration.id?.name;

        if (!name) {
          context.report({
            node: defaultExport,
            messageId: 'anonymous',
            data: { expected }
          });
          return;
        }

        if (name !== expected) {
          context.report({
            node: defaultExport,
            messageId: 'mismatch',
            data: { name, expected }
          });
          return;
        }

        if (functions.length > 0 && !functionNames.has(name)) {
          context.report({
            node: functions[0].node,
            messageId: 'missing',
            data: { name: functions[0].name ?? 'anonymous', expected }
          });
        }
      }
    };
  }
};

export default defaultExportName;
