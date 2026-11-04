import tsPlugin from '@typescript-eslint/eslint-plugin';
import createBaseConfig from '@assistant/eslint-config';
import importPlugin from 'eslint-plugin-import';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const eslintConfig = [
  {
    ignores: ['dist/**']
  },
  ...createBaseConfig(),
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname
      }
    }
  }
];

export default eslintConfig;
