<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiMagnify, mdiChevronDown } from '@mdi/js'

// Search box + sort dropdown for the constraint picker, sharing one toolbar row.
const search = defineModel<string>('search', { required: true })
const sort = defineModel<'alphabetical' | 'category'>('sort', { required: true })
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 shrink-0">
    <div class="relative flex-1 min-w-0">
      <MdiIcon
        :path="mdiMagnify"
        :size="16"
        class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        v-model="search"
        type="text"
        placeholder="Search constraints"
        class="w-full h-9 rounded-lg border border-line bg-surface text-sm pl-9 pr-2 text-ink-text outline-none focus:border-action"
      >
    </div>
    <div class="relative inline-flex items-center text-soft shrink-0">
      <select
        v-model="sort"
        class="appearance-none bg-transparent border-0 border-b border-line pl-1 pr-5 py-0.5 text-sm focus:outline-none cursor-pointer hover:text-action"
      >
        <option value="alphabetical">
          Alphabetical
        </option>
        <option value="category">
          By Category
        </option>
      </select>
      <MdiIcon
        :path="mdiChevronDown"
        :size="14"
        class="pointer-events-none absolute right-0"
      />
    </div>
  </div>
</template>
