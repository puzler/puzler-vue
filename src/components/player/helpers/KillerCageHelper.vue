<script setup lang="ts">
// Combos for the killer cage containing the whole selection. Combos ruled out
// by placed digits vanish automatically; manual strikes persist with the solve
// session (per cage) via the editor store.
import { computed } from 'vue'
import { useKillerCageHelper } from '@/composables/useMathHelpers'
import ComboList from './ComboList.vue'
import ComboStats from './ComboStats.vue'

const helper = useKillerCageHelper()

const header = computed(() => {
  const cage = helper.cage.value
  if (!cage) return ''
  const cells = `${cage.cells.length} cells`
  return cage.sum === null ? `${cells}, no total` : `${cells}, sum ${cage.sum}`
})

const hasStrikes = computed(() => helper.struckKeys.value.size > 0)
const contextKey = computed(
  () => `${helper.cage.value?.strikeKey ?? ''}:${helper.combos.value.length}`,
)
</script>

<template>
  <section class="px-2">
    <h3 class="text-[11px] uppercase tracking-wide text-soft font-semibold mb-1">
      Killer cage
    </h3>
    <p
      v-if="helper.cage.value === null"
      class="text-xs text-soft"
    >
      Select cells inside a single killer cage to list its combinations.
    </p>
    <template v-else>
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-ink-text font-medium">{{ header }}</span>
        <button
          v-if="hasStrikes"
          type="button"
          class="ml-auto text-xs text-action hover:underline"
          @click="helper.clearStrikes()"
        >
          Restore all
        </button>
      </div>
      <p
        v-if="helper.autoRemovedCount.value > 0"
        class="text-[11px] text-soft mb-1"
      >
        {{ helper.autoRemovedCount.value }} ruled out by placed digits.
      </p>
      <p
        v-if="helper.combos.value.length === 0"
        class="text-xs text-soft"
      >
        No combination fits this cage.
      </p>
      <template v-else>
        <ComboList
          class="-mx-2 max-h-56 overflow-y-auto"
          :combos="helper.combos.value"
          :struck="helper.struckKeys.value"
          :show-totals="helper.cage.value.sum === null"
          :truncated="helper.truncated.value"
          @toggle="helper.toggleStrike"
        />
        <ComboStats
          class="-mx-2 mt-1"
          :stats="helper.stats.value"
          :context-key="contextKey"
        />
      </template>
    </template>
  </section>
</template>
