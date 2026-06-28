<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePuzzleStore } from '@/stores/puzzle'
import { PuzzleStatusEnum, PuzzleVisibilityEnum } from '@/graphql/generated/types'
import VisibilityField from '@/components/editor/VisibilityField.vue'
import AccessManager from '@/components/editor/AccessManager.vue'
import PageDescriptionEditor from '@/components/editor/PageDescriptionEditor.vue'
import CommentPolicyField from '@/components/editor/CommentPolicyField.vue'

// The tab panels shared by the Manage and Publish & Share modals. Split out so
// each modal shell stays under the template line cap. Visibility + comment gate
// flow back via v-model; Unpublish is emitted so the shell's error handling
// stays central; the rich description autosaves itself and the share field is
// self-contained.
const props = defineProps<{ activeTab: string; puzzleId: string; busy: boolean }>()
defineEmits<{ unpublish: [] }>()
const puzzle = usePuzzleStore()
const mode = defineModel<PuzzleVisibilityEnum>('mode', { required: true })
const commentGate = defineModel<'inherit' | 'required' | 'open'>('commentGate', { required: true })

const isPublished = computed(() => puzzle.status === PuzzleStatusEnum.Published)
const shareUrl = computed(() =>
  puzzle.shareToken && props.puzzleId ? `${window.location.origin}/puzzles/${props.puzzleId}?t=${puzzle.shareToken}` : '',
)
const copied = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col">
    <div
      v-show="activeTab === 'visibility'"
      role="tabpanel"
      class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4"
    >
      <VisibilityField v-model="mode" />
      <AccessManager v-if="mode === PuzzleVisibilityEnum.Private" />
      <button
        v-if="isPublished"
        class="self-start px-3 py-2 rounded-xl border border-line text-sm hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        :disabled="busy"
        @click="$emit('unpublish')"
      >
        Unpublish puzzle
      </button>
    </div>

    <div
      v-show="activeTab === 'description'"
      role="tabpanel"
      class="flex-1 min-h-0 flex flex-col gap-2 p-4 sm:p-5"
    >
      <p class="text-xs text-faint">
        Shown on the puzzle's public page. Supports headings, styles, links, and images.
      </p>
      <PageDescriptionEditor tall />
    </div>

    <div
      v-show="activeTab === 'comments'"
      role="tabpanel"
      class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5"
    >
      <CommentPolicyField v-model="commentGate" />
    </div>

    <div
      v-show="activeTab === 'share'"
      role="tabpanel"
      class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2"
    >
      <p class="text-xs text-faint">
        {{ shareUrl ? "Anyone with this link can open the puzzle, even when it isn't public." : 'A shareable link appears here once the puzzle is saved.' }}
      </p>
      <div
        v-if="shareUrl"
        class="flex gap-2"
      >
        <input
          :value="shareUrl"
          readonly
          class="flex-1 px-2 py-1.5 text-xs rounded-lg border border-line bg-paper text-soft"
        >
        <button
          class="px-3 py-1.5 text-sm rounded-lg border border-line hover:border-action"
          @click="copyLink"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
  </div>
</template>
