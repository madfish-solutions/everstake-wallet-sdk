import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { 
    languageOptions: { 
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      }
    } 
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.strict,
  eslintPluginPrettierRecommended,
  {
    rules: {
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
    },
  },
  {
    ignores: ["src/temp/**"]
  }
];
