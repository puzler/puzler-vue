<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiShapeOutline } from '@mdi/js'
import { CONSTRAINT_TYPES } from '@/constants/constraints'
import type { MatchModeEnum } from '@/graphql/generated/types'
import { MatchModeEnum as Match } from '@/graphql/generated/types'

const matchMode = defineModel<MatchModeEnum>('matchMode', { required: true })
const constraintTypes = defineModel<string[]>('constraintTypes', { required: true })

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => { open.value = false })

function toggle(value: string) {
  const set = new Set(constraintTypes.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  constraintTypes.value = [...set]
}
</script>

<template>
  <div
    ref="root"
    class="relative shrink-0"
  >
    <button
      type="button"
      class="p-1.5 rounded-lg hover:bg-paper"
      :class="constraintTypes.length ? 'text-action' : 'text-soft hover:text-action'"
      title="Filter by constraint"
      @click="open = !open"
    >
      <MdiIcon
        :path="mdiShapeOutline"
        :size="18"
      />
    </button>
    <div
      v-if="open"
      class="absolute z-20 mt-1 w-64 max-h-80 overflow-auto rounded-xl border border-line bg-surface shadow-xl p-2"
    >
      <div class="flex items-center justify-between px-1 pb-2 mb-1 border-b border-line">
        <div class="inline-flex rounded-lg border border-line overflow-hidden text-xs">
          <button
            type="button"
            :class="['px-2 py-1', matchMode === Match.Any ? 'bg-action text-white' : 'text-soft']"
            @click="matchMode = Match.Any"
          >
            Any
          </button>
          <button
            type="button"
            :class="['px-2 py-1', matchMode === Match.All ? 'bg-action text-white' : 'text-soft']"
            @click="matchMode = Match.All"
          >
            All
          </button>
        </div>
        <button
          v-if="constraintTypes.length"
          type="button"
          class="text-xs text-soft hover:text-action"
          @click="constraintTypes = []"
        >
          Clear
        </button>
      </div>
      <label
        v-for="c in CONSTRAINT_TYPES"
        :key="c.value"
        class="flex items-center gap-2 px-1 py-1 text-sm text-ink-text rounded hover:bg-paper cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="constraintTypes.includes(c.value)"
          @change="toggle(c.value)"
        >
        {{ c.label }}
      </label>
    </div>
  </div>
</template>
