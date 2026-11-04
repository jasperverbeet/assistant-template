import tsParser from '@typescript-eslint/parser';
import turboConfig from 'eslint-config-turbo/flat';
import jsdoc from 'eslint-plugin-jsdoc';

import assistantPlugin from './plugin.mjs';

const sharedRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_'
    }
  ],
  '@typescript-eslint/no-empty-interface': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  '@typescript-eslint/no-floating-promises': 'error',
  'sort-imports': [
    'error',
    {
      ignoreCase: false,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
      allowSeparatedGroups: true
    }
  ],
  'assistant/one-function-per-file': 'error',
  'assistant/default-export-name': 'error',
  'assistant/no-line-comments': 'error',
  'assistant/file-placement': 'error',
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['**/scripts/*'],
          message:
            'Do not import from a scripts/ folder. A script is an entry, not a library.'
        }
      ]
    }
  ],
  'func-style': ['error', 'expression'],
  'prefer-arrow-callback': 'error',
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always'],
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  'no-restricted-syntax': [
    'error',
    {
      selector: 'ExportAllDeclaration, ExportNamedDeclaration[source]',
      message:
        'Do not re-export. Import from the file that defines the value. Barrel files are not permitted.'
    },
    {
      selector: 'ClassDeclaration, ClassExpression',
      message: 'Do not use classes. Use functions and plain objects.'
    },
    {
      selector:
        'ArrowFunctionExpression > TSTypeAnnotation.returnType:not([typeAnnotation.type="TSTypePredicate"])',
      message: 'Do not annotate the return type. Let TypeScript infer it.'
    },
    {
      selector: 'MemberExpression[object.name="process"][property.name="env"]',
      message: 'Read configuration from the Zod-validated env module only.'
    }
  ],
  'jsdoc/require-jsdoc': [
    'error',
    {
      publicOnly: true,
      require: {
        ArrowFunctionExpression: true,
        FunctionDeclaration: true,
        FunctionExpression: true
      }
    }
  ],
  'jsdoc/require-param': ['error', { checkDestructured: false }],
  'jsdoc/require-returns': 'error',
  'jsdoc/check-param-names': ['error', { checkDestructured: false }],
  'import/no-unresolved': 'off',
  'import/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        ['sibling', 'parent'],
        'index',
        'unknown'
      ],
      'newlines-between': 'always',
      pathGroups: [
        {
          pattern: '@/**',
          group: 'internal'
        }
      ],
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }
  ]
};

/**
 * Creates the shared ESLint config for TypeScript workspaces. Each workspace
 * registers the plugins that its framework requires.
 *
 * @param {{ tsconfigPath?: string }} options
 * @returns {import('eslint').Linter.Config[]}
 */
const createBaseConfig = ({ tsconfigPath = './tsconfig.json' } = {}) => [
  ...turboConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { assistant: assistantPlugin, jsdoc },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: tsconfigPath,
        sourceType: 'module'
      }
    },
    rules: sharedRules
  },
  {
    files: ['**/env.ts'],
    rules: { 'no-restricted-syntax': 'off' }
  }
];

export { sharedRules };
export default createBaseConfig;
