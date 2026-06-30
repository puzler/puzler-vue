<script setup lang="ts">
import { computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiClose } from '@mdi/js'
import SearchField from './SearchField.vue'
import ConstraintFilter from './ConstraintFilter.vue'
import VisibilityFilter from './VisibilityFilter.vue'
import SortSelect from './SortSelect.vue'
import { CONSTRAINT_TYPES } from '@/constants/constraints'
import type { MatchModeEnum, ListingSortEnum } from '@/graphql/generated/types'

const props = defineProps<{
  supportsConstraints?: boolean
  // When provided, a visibility filter is shown using these options.
  visibilityOptions?: ReadonlyArray<{ value: string; label: string }>
}>()

const search = defineModel<string>('search', { required: true })
const sort = defineModel<ListingSortEnum>('sort', { required: true })
const matchMode = defineModel<MatchModeEnum>('matchMode', { required: true })
const constraintTypes = defineModel<string[]>('constraintTypes', { required: true })
// Optional: only bound by lists that show a visibility filter (My Puzzles tabs).
const visibilities = defineModel<string[]>('visibilities', { default: () => [] })

const constraintLabel = (v: string) => CONSTRAINT_TYPES.find((c) => c.value === v)?.label ?? v
const visibilityLabel = (v: string) => props.visibilityOptions?.find((o) => o.value === v)?.label ?? v

// Active filters shown as removable chips beneath the controls.
const chips = computed(() => [
  ...constraintTypes.value.map((v) => ({ key: `c:${v}`, kind: 'constraint' as const, value: v, label: constraintLabel(v) })),
  ...visibilities.value.map((v) => ({ key: `v:${v}`, kind: 'visibility' as const, value: v, label: visibilityLabel(v) })),
])

function removeChip(chip: { kind: 'constraint' | 'visibility'; value: string }) {
  if (chip.kind === 'constraint') constraintTypes.value = constraintTypes.value.filter((v) => v !== chip.value)
  else visibilities.value = visibilities.value.filter((v) => v !== chip.value)
}
</script>

<template>
  <div class="mb-4">
    <!-- Stacks on mobile so the full-width search gets its own row; row 2 puts
         the #lead trigger (mobile Filters/Folders) on the left and floats the
         constraint filter + sort to the right. The controls wrapper is
         display:contents from sm: up, so everything collapses onto one row with
         the controls floated right of the search icon (the trigger is md:hidden
         by then, so the left slot is empty on desktop). -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchField
        v-model="search"
        data-tour="toolbar-search"
      />
      <div class="flex items-center gap-1 sm:contents">
        <slot name="lead" />
        <div class="flex flex-wrap items-center gap-1 ml-auto">
          <ConstraintFilter
            v-if="supportsConstraints"
            v-model:match-mode="matchMode"
            v-model:constraint-types="constraintTypes"
            data-tour="toolbar-constraints"
          />
          <VisibilityFilter
            v-if="visibilityOptions"
            v-model="visibilities"
            :options="visibilityOptions"
            data-tour="toolbar-visibility"
          />
          <SortSelect
            v-model="sort"
            data-tour="toolbar-sort"
          />
          <slot />
        </div>
      </div>
    </div>

    <div
      v-if="chips.length"
      class="flex flex-wrap items-center gap-1.5 mt-2"
    >
      <span
        v-for="chip in chips"
        :key="chip.key"
        class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs rounded-full bg-action-tint text-action"
      >
        {{ chip.label }}
        <button
          type="button"
          class="rounded-full hover:bg-action/20"
          :title="`Remove ${chip.label}`"
          @click="removeChip(chip)"
        >
          <MdiIcon
            :path="mdiClose"
            :size="12"
          />
        </button>
      </span>
    </div>
  </div>
</template>
