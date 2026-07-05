import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { Ref } from 'vue'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
} from '@codemirror/view'
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
} from '@codemirror/language'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { linter, lintGutter } from '@codemirror/lint'
import { json, jsonLanguage, jsonParseLinter } from '@codemirror/lang-json'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { jsonCompletion, jsonSchemaHover, stateExtensions } from 'codemirror-json-schema'
import { disableErrorLogging } from 'best-effort-json-parser'
import type { JSONSchema7 } from 'json-schema'
import { puzlerJsonTheme } from './cmTheme'
import { colorSwatchExtension } from './colorSwatch'
import puzzleSchema from './puzzle-schema.json'

// codemirror-json-schema runs best-effort-json-parser on every keystroke to
// keep schema pointers usable mid-edit; its console.error chatter about
// incomplete JSON ("parsed json with extra tokens") is expected, not a bug.
disableErrorLogging()

export interface CodeMirrorJsonOptions {
  initialText: string
  onDocChanged: () => void
}

// Lifecycle wrapper around a CodeMirror 6 JSON editor. Schema powers
// autocomplete and hover ONLY — jsonSchemaLinter is deliberately absent, so
// nothing semantic is ever flagged; the sole linter is JSON syntax.
export function useCodeMirrorJson(host: Ref<HTMLElement | null>, opts: CodeMirrorJsonOptions) {
  const view = shallowRef<EditorView | null>(null)
  // Synchronous JSON.parse verdict on the current doc; the debounced lint
  // gutter handles display, this drives the Apply button without lag.
  const syntaxError = ref<string | null>(null)
  const isEmpty = ref(opts.initialText.trim() === '')

  function checkSyntax(text: string) {
    isEmpty.value = text.trim() === ''
    if (isEmpty.value) {
      syntaxError.value = null
      return
    }
    try {
      JSON.parse(text)
      syntaxError.value = null
    } catch (e) {
      syntaxError.value = e instanceof SyntaxError ? e.message : 'Invalid JSON'
    }
  }

  function buildState(text: string): EditorState {
    return EditorState.create({
      doc: text,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        indentUnit.of('  '),
        autocompletion(),
        search({ top: true }),
        highlightSelectionMatches(),
        indentationMarkers(),
        json(),
        jsonLanguage.data.of({ autocomplete: jsonCompletion() }),
        hoverTooltip(jsonSchemaHover()),
        stateExtensions(puzzleSchema as unknown as JSONSchema7),
        linter(jsonParseLinter(), { delay: 300 }),
        lintGutter(),
        EditorView.lineWrapping,
        puzlerJsonTheme(),
        colorSwatchExtension(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            checkSyntax(update.state.doc.toString())
            opts.onDocChanged()
          }
        }),
      ],
    })
  }

  onMounted(() => {
    if (!host.value) return
    view.value = new EditorView({ state: buildState(opts.initialText), parent: host.value })
    checkSyntax(opts.initialText)
  })

  onBeforeUnmount(() => {
    view.value?.destroy()
    view.value = null
  })

  function getText(): string {
    return view.value ? view.value.state.doc.toString() : opts.initialText
  }

  // Replaces the whole document (fresh state, so buffer-local undo resets —
  // correct for "reload from store", which is a new baseline, not an edit).
  function setText(text: string) {
    if (!view.value) return
    view.value.setState(buildState(text))
    checkSyntax(text)
  }

  function focus() {
    view.value?.focus()
  }

  return { getText, setText, focus, syntaxError, isEmpty }
}
