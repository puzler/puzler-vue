<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useAuthStore } from '@/stores/auth'
import { apolloClient } from '@/utils/apolloClient'
import { serializePlayDefinition } from '@/utils/puzzleExport'
import ExportSudokupadLinkDocument from '@/graphql/gql/puzzles/mutations/ExportSudokupadLink.graphql'
import type { ExportSudokupadLinkMutation, ExportSudokupadLinkMutationVariables } from '@/graphql/generated/types'

const editor = useEditorStore()
const grid = useGridStore()
const auth = useAuthStore()

// The backend converts the live editor state to a SudokuPad short link (convert
// → compress → shorten, with its own long-URL fallback). The main button copies
// the link and opens it so the setter can preview; the side button just copies.
// Warnings list anything that couldn't be represented (and so needs re-creating
// by hand).
const copiedKind = ref<'open' | 'copy' | null>(null)
const error = ref<string | null>(null)
const warnings = ref<string[]>([])
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// Request a SudokuPad link for the current puzzle. Records any fidelity
// warnings; returns null (and sets error) on failure, e.g. a non-square grid.
// The solution is embedded per the author's account setting (defaults on).
async function requestLink(): Promise<string | null> {
  error.value = null
  warnings.value = []
  try {
    const { data } = await apolloClient.mutate<ExportSudokupadLinkMutation, ExportSudokupadLinkMutationVariables>({
      mutation: ExportSudokupadLinkDocument,
      variables: {
        definition: serializePlayDefinition(editor, grid),
        solution: editor.solution,
        includeSolution: auth.user?.puzzlePreferences?.includeSolutionInSudokupadExport ?? true,
      },
    })
    const result = data?.exportSudokupadLink
    warnings.value = result?.warnings ?? []
    if (!result?.url) {
      error.value = result?.errors?.[0] ?? 'Could not export to SudokuPad.'
      return null
    }
    return result.url
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not export to SudokuPad.'
    return null
  }
}

function flagCopied(kind: 'open' | 'copy') {
  copiedKind.value = kind
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copiedKind.value = null }, 2000)
}

async function exportAndOpen() {
  // Open synchronously to keep the user gesture (avoids popup blocking), then
  // navigate it to the link once the backend responds.
  const win = window.open('about:blank', '_blank')
  const link = await requestLink()
  if (!link) {
    win?.close()
    return
  }
  if (win) {
    win.opener = null
    win.location.href = link
  }
  await navigator.clipboard.writeText(link)
  flagCopied('open')
}

async function copyLink() {
  const link = await requestLink()
  if (!link) return
  await navigator.clipboard.writeText(link)
  flagCopied('copy')
}

const CHECK = 'M4.5 12.75l6 6 9-13.5'
const EXTERNAL = 'M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
const LINK = 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244'
</script>

<template>
  <div class="flex flex-col gap-2 pt-3 border-t border-line">
    <div class="flex gap-1.5">
      <button
        title="Copy a SudokuPad link and open it in a new tab"
        class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-colors"
        :class="copiedKind === 'open'
          ? 'border-green-400 bg-green-50 text-green-700'
          : 'border-line hover:border-action hover:bg-action-tint text-ink-text'"
        @click="exportAndOpen"
      >
        <svg
          class="w-5 h-5"
          :class="copiedKind === 'open' ? 'text-green-500' : 'text-faint'"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="copiedKind === 'open' ? CHECK : EXTERNAL"
          />
        </svg>
        <span class="text-sm font-medium">{{ copiedKind === 'open' ? 'Link copied & opened!' : 'Export to SudokuPad' }}</span>
      </button>

      <button
        title="Copy SudokuPad link"
        aria-label="Copy SudokuPad link"
        class="w-11 flex items-center justify-center rounded-xl border transition-colors"
        :class="copiedKind === 'copy'
          ? 'border-green-400 bg-green-50 text-green-500'
          : 'border-line hover:border-action hover:bg-action-tint text-faint'"
        @click="copyLink"
      >
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="copiedKind === 'copy' ? CHECK : LINK"
          />
        </svg>
      </button>
    </div>

    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>
    <div
      v-else-if="warnings.length"
      class="flex flex-col gap-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"
    >
      <span class="text-xs font-medium text-amber-800">Some details couldn't be converted:</span>
      <ul class="list-disc list-inside text-xs text-amber-700">
        <li
          v-for="(warning, i) in warnings"
          :key="i"
        >
          {{ warning }}
        </li>
      </ul>
    </div>
  </div>
</template>
