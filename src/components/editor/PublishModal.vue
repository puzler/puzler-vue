<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePuzzleStore } from '@/stores/puzzle'
import { PuzzleStatusEnum, PuzzleVisibilityEnum } from '@/graphql/generated/types'
import AccessManager from './AccessManager.vue'

const emit = defineEmits<{ close: [] }>()
const puzzle = usePuzzleStore()

const MODES = [
  { value: PuzzleVisibilityEnum.Private, label: 'Private', hint: 'Only you and people you invite' },
  { value: PuzzleVisibilityEnum.Unlisted, label: 'Unlisted', hint: 'Anyone with the link, not in the archive' },
  { value: PuzzleVisibilityEnum.ContainersOnly, label: 'Collections & series only', hint: 'Hidden from the archive; shown inside your collections and series' },
  { value: PuzzleVisibilityEnum.Public, label: 'Public', hint: 'Listed in the archive for everyone' },
] as const

const SELECTABLE = MODES.map((m) => m.value) as readonly PuzzleVisibilityEnum[]
const selectedMode = ref<PuzzleVisibilityEnum>(SELECTABLE.includes(puzzle.visibility) ? puzzle.visibility : PuzzleVisibilityEnum.Private)
const busy = ref(false)
const error = ref<string | null>(null)
const copied = ref(false)

const isPublished = computed(() => puzzle.status === PuzzleStatusEnum.Published)
const versionToPublish = computed(() => puzzle.currentVersionId ?? puzzle.versions.at(-1)?.id ?? null)
const shareUrl = computed(() =>
  puzzle.serverPuzzleId && puzzle.shareToken
    ? `${window.location.origin}/puzzles/${puzzle.serverPuzzleId}?t=${puzzle.shareToken}`
    : '',
)

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}

function publish() {
  if (!versionToPublish.value) {
    error.value = 'Save a version before publishing'
    return
  }
  run(() => puzzle.publishVersion(versionToPublish.value!, selectedMode.value))
}

async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-2xl shadow-xl p-6 w-96 max-h-[85vh] overflow-y-auto flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-ink-text">Publish &amp; Share</span>
          <span
            class="text-xs px-2 py-0.5 rounded-full"
            :class="isPublished ? 'bg-green-100 text-green-700' : 'bg-line text-soft'"
          >{{ isPublished ? `Published · ${puzzle.visibility}` : 'Draft' }}</span>
        </div>

        <p
          v-if="error"
          class="text-xs text-red-600"
        >
          {{ error }}
        </p>

        <div class="flex flex-col gap-1.5">
          <label
            v-for="mode in MODES"
            :key="mode.value"
            class="flex items-start gap-2 px-3 py-2 rounded-xl border cursor-pointer"
            :class="selectedMode === mode.value ? 'border-action bg-action-tint' : 'border-line'"
          >
            <input
              v-model="selectedMode"
              type="radio"
              :value="mode.value"
              class="mt-1"
            >
            <span class="flex flex-col">
              <span class="text-sm font-medium text-ink-text">{{ mode.label }}</span>
              <span class="text-xs text-faint">{{ mode.hint }}</span>
            </span>
          </label>
        </div>

        <AccessManager v-if="selectedMode === PuzzleVisibilityEnum.Private" />

        <div
          v-if="isPublished && shareUrl"
          class="flex gap-2"
        >
          <input
            :value="shareUrl"
            readonly
            class="flex-1 px-2 py-1 text-xs rounded-lg border border-line bg-paper text-soft"
          >
          <button
            class="px-3 py-1 text-sm rounded-lg border border-line hover:border-action"
            @click="copyLink"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-xl bg-action text-white text-sm font-medium hover:bg-action-deep disabled:opacity-50"
            :disabled="busy"
            @click="publish"
          >
            {{ isPublished ? 'Update' : 'Publish' }}
          </button>
          <button
            v-if="isPublished"
            class="px-3 py-2 rounded-xl border border-line text-sm hover:border-red-400 hover:text-red-600 disabled:opacity-50"
            :disabled="busy"
            @click="run(() => puzzle.unpublish())"
          >
            Unpublish
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
