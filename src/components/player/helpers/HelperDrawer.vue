<script setup lang="ts">
// Desktop math-helper drawer, flanking the grid on the left (mirror of the
// right-hand PlayerSidePanel). Renders nothing unless at least one helper is
// enabled (competitions can enforce them all off); collapses to a slim rail so
// it never fights the grid for space.
import { computed, ref } from 'vue'
import { mdiCalculatorVariantOutline, mdiChevronLeft } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { useHelpersAvailable } from '@/composables/useMathHelpers'
import HelperSections from './HelperSections.vue'

const player = usePlayerSettingsStore()
const available = useHelpersAvailable()
const open = ref(true)

const enabled = computed(
  () =>
    available.value &&
    (player.effective.enableSelectionCalculator ||
      player.effective.enableKillerHelper ||
      player.effective.enableSumHelper),
)
</script>

<template>
  <aside
    v-if="enabled"
    class="shrink-0 border-r border-line bg-paper flex flex-col min-h-0"
    :class="open ? 'w-72' : 'w-10'"
    aria-label="Math helpers"
  >
    <template v-if="open">
      <div class="shrink-0 flex items-center px-3 py-2 border-b border-line">
        <h2 class="text-sm font-display font-semibold text-ink-text">
          Helpers
        </h2>
        <button
          type="button"
          class="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-soft hover:text-action hover:bg-action-tint transition-colors"
          title="Collapse helpers"
          aria-label="Collapse helpers"
          @click="open = false"
        >
          <MdiIcon
            :path="mdiChevronLeft"
            :size="18"
          />
        </button>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto p-3">
        <HelperSections />
      </div>
    </template>
    <button
      v-else
      type="button"
      class="flex-1 flex flex-col items-center pt-3 text-soft hover:text-action transition-colors"
      title="Expand helpers"
      aria-label="Expand helpers"
      @click="open = true"
    >
      <MdiIcon
        :path="mdiCalculatorVariantOutline"
        :size="20"
      />
    </button>
  </aside>
</template>
