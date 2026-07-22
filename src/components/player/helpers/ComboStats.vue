<script setup lang="ts">
// Possibilities / Required / Missing rows for a combo list. Required and
// Missing are spoilers (they can hand over a deduction), so they hide behind
// per-row eye toggles and re-hide whenever the combo context changes.
import { ref, watch } from 'vue'
import { mdiEyeOutline, mdiEyeOffOutline } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import type { ComboStats } from '@/utils/sumCombinations'

const props = defineProps<{
  stats: ComboStats
  // Any change re-hides the spoiler rows (new cage, new filter, ...).
  contextKey: string
}>()

const showRequired = ref(false)
const showMissing = ref(false)
watch(
  () => props.contextKey,
  () => {
    showRequired.value = false
    showMissing.value = false
  },
)

function digitList(digits: number[]): string {
  return digits.length > 0 ? digits.join(', ') : 'none'
}
</script>

<template>
  <div class="flex flex-col gap-0.5 text-xs text-soft px-2">
    <div class="flex items-center gap-1">
      <span class="w-20 shrink-0">Possibilities</span>
      <span class="text-ink-text font-medium tabular-nums">{{ props.stats.count }}</span>
    </div>
    <div class="flex items-center gap-1">
      <span class="w-20 shrink-0">Required</span>
      <span
        v-if="showRequired"
        class="text-ink-text font-medium tabular-nums"
      >{{ digitList(props.stats.required) }}</span>
      <span
        v-else
        class="tracking-widest select-none"
        aria-hidden="true"
      >•••</span>
      <button
        type="button"
        class="ml-auto w-6 h-6 flex items-center justify-center rounded text-soft hover:text-action hover:bg-action-tint transition-colors"
        :aria-label="showRequired ? 'Hide required digits' : 'Reveal required digits'"
        @click="showRequired = !showRequired"
      >
        <MdiIcon
          :path="showRequired ? mdiEyeOffOutline : mdiEyeOutline"
          :size="14"
        />
      </button>
    </div>
    <div class="flex items-center gap-1">
      <span class="w-20 shrink-0">Missing</span>
      <span
        v-if="showMissing"
        class="text-ink-text font-medium tabular-nums"
      >{{ digitList(props.stats.missing) }}</span>
      <span
        v-else
        class="tracking-widest select-none"
        aria-hidden="true"
      >•••</span>
      <button
        type="button"
        class="ml-auto w-6 h-6 flex items-center justify-center rounded text-soft hover:text-action hover:bg-action-tint transition-colors"
        :aria-label="showMissing ? 'Hide missing digits' : 'Reveal missing digits'"
        @click="showMissing = !showMissing"
      >
        <MdiIcon
          :path="showMissing ? mdiEyeOffOutline : mdiEyeOutline"
          :size="14"
        />
      </button>
    </div>
  </div>
</template>
