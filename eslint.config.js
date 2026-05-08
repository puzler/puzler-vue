import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },

  // TypeScript source and config files
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
  },

  // Vue SFCs — vue parser wraps the TS parser for <script lang="ts">
  {
    files: ['**/*.vue'],
    extends: [tseslint.configs.recommended, pluginVue.configs['flat/recommended']],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },
)
