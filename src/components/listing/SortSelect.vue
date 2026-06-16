<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiChevronDown } from '@mdi/js'
import type { ListingSortEnum } from '@/graphql/generated/types'
import { ListingSortEnum as Sort } from '@/graphql/generated/types'

// A native select styled to read as plain underlined text with a caret, rather
// than a boxed dropdown, to keep the toolbar light.
const model = defineModel<ListingSortEnum>({ required: true })

const OPTIONS = [
  { value: Sort.Recent, label: 'Most recent' },
  { value: Sort.Alphabetical, label: 'Alphabetical' },
  { value: Sort.Rating, label: 'Highest rated' },
  { value: Sort.Solves, label: 'Most solves' },
]
</script>

<template>
  <div class="relative inline-flex items-center text-soft">
    <select
      v-model="model"
      class="appearance-none bg-transparent border-0 border-b border-line pl-1 pr-5 py-0.5 text-sm focus:outline-none cursor-pointer hover:text-action"
    >
      <option
        v-for="o in OPTIONS"
        :key="o.value"
        :value="o.value"
      >
        {{ o.label }}
      </option>
    </select>
    <MdiIcon
      :path="mdiChevronDown"
      :size="14"
      class="pointer-events-none absolute right-0"
    />
  </div>
</template>
