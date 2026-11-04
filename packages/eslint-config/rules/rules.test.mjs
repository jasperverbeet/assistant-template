import { describe, it } from 'bun:test';
import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

import defaultExportName from './defaultExportName.mjs';
import filePlacement from './filePlacement.mjs';
import noLineComments from './noLineComments.mjs';
import oneFunctionPerFile from './oneFunctionPerFile.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({ languageOptions: { parser: tsParser } });

ruleTester.run('one-function-per-file', oneFunctionPerFile, {
  valid: [
    {
      filename: 'readState.ts',
      code: 'const readState = () => { const inner = () => 1; return inner(); };\nexport default readState;'
    },
    {
      filename: 'index.ts',
      code: 'await Bun.serve({ fetch: () => new Response() });'
    },
    {
      filename: 'readState.test.ts',
      code: "describe('x', () => { const make = () => 1; });"
    }
  ],
  invalid: [
    {
      filename: 'readState.ts',
      code: 'const helper = () => 1;\nconst readState = () => helper();\nexport default readState;',
      errors: [{ messageId: 'tooMany' }]
    },
    {
      filename: 'readState.ts',
      code: 'function a() {}\nexport default function readState() {}',
      errors: [{ messageId: 'tooMany' }]
    },
    {
      filename: 'readState.test.ts',
      code: 'const make = () => 1;',
      errors: [{ messageId: 'testHelper' }]
    },
    {
      filename: '/app/src/scripts/addContact.ts',
      code: 'const parse = () => 1;\nconsole.log(parse());',
      errors: [{ messageId: 'scriptFunction' }]
    }
  ]
});

ruleTester.run('file-placement', filePlacement, {
  valid: [
    { filename: '/app/src/index.ts', code: 'console.log(1);' },
    { filename: '/app/src/env.ts', code: 'export default {};' },
    { filename: '/app/src/inbox/readState.ts', code: 'export {};' },
    {
      filename: '/app/src/content.ts',
      code: 'console.log(1);',
      options: [['content.ts']]
    }
  ],
  invalid: [
    {
      filename: '/app/src/readState.ts',
      code: 'export {};',
      errors: [{ messageId: 'misplaced' }]
    },
    {
      filename: '/app/src/index.ts',
      code: 'console.log(1);',
      options: [['content.ts']],
      errors: [{ messageId: 'misplaced' }]
    }
  ]
});

ruleTester.run('default-export-name', defaultExportName, {
  valid: [
    {
      filename: '/src/readState.ts',
      code: 'const readState = () => 1;\nexport default readState;'
    },
    {
      filename: '/src/env.ts',
      code: 'const env = { port: 1 };\nexport default env;'
    },
    {
      filename: '/src/stateSchema.ts',
      code: 'export const stateSchema = {};\nexport type State = string;'
    },
    {
      filename: '/src/readState.ts',
      code: 'export interface Options { a: string }\nexport const LIMIT = 3;\nconst readState = () => 1;\nexport default readState;'
    },
    { filename: '/src/index.ts', code: 'console.log(1);' }
  ],
  invalid: [
    {
      filename: '/src/readState.ts',
      code: 'const readState = () => 1;',
      errors: [{ messageId: 'missing' }]
    },
    {
      filename: '/src/readState.ts',
      code: 'const readInbox = () => 1;\nexport default readInbox;',
      errors: [{ messageId: 'mismatch' }]
    },
    {
      filename: '/src/readState.ts',
      code: 'export default () => 1;',
      errors: [{ messageId: 'anonymous' }]
    },
    {
      filename: '/src/readState.ts',
      code: 'export const readState = () => 1;\nexport default readState;',
      errors: [{ messageId: 'namedFunction' }]
    },
    {
      filename: '/src/readState.ts',
      code: 'const readState = () => 1;\nexport { readState };\nexport default readState;',
      errors: [{ messageId: 'namedFunction' }]
    },
    {
      filename: '/src/env.ts',
      code: 'const config = {};\nexport default config;',
      errors: [{ messageId: 'mismatch' }]
    }
  ]
});

ruleTester.run('no-line-comments', noLineComments, {
  valid: [
    { code: '/** Reads the state. */\nconst a = 1;' },
    { code: '/// <reference types="bun" />\nconst a = 1;' }
  ],
  invalid: [
    { code: 'const a = 1; // note', errors: [{ messageId: 'lineComment' }] }
  ]
});
