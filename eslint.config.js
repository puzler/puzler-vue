import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

const templateMaxLines = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce a maximum number of lines in Vue <template> blocks' },
    schema: [{ type: 'integer', minimum: 1 }],
    messages: {
      tooLong: 'Vue template is {{lineCount}} lines (max: {{max}}). Extract subcomponents to reduce length.',
    },
  },
  create(context) {
    const max = context.options[0] ?? 100
    return {
      Program(node) {
        const tb = node.templateBody
        if (!tb) return
        const lineCount = tb.loc.end.line - tb.loc.start.line + 1
        if (lineCount > max) {
          context.report({
            node: tb,
            messageId: 'tooLong',
            data: { lineCount, max },
          })
        }
      },
    }
  },
}

// Allow intentionally-unused identifiers when prefixed with `_` (e.g. no-op
// default methods on base classes, ignored callback params).
const noUnusedVars = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
}

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**'] },

  // TypeScript source and config files
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: { ...noUnusedVars },
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
    plugins: {
      local: { rules: { 'template-max-lines': templateMaxLines } },
    },
    rules: {
      ...noUnusedVars,
      'local/template-max-lines': ['error', 100],
    },
  },
)
