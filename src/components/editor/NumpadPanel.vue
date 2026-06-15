<script setup lang="ts">
const emit = defineEmits<{
  digit: [n: number]
  delete: []
}>()
</script>

<template>
  <!-- 4-wide on mobile (wide/short bottom bar), 3-wide on desktop sidebars.
       Auto-flow places 1-9,0 then Delete spans the last 2 cells in either grid. -->
  <div class="grid grid-cols-4 md:grid-cols-3 gap-1.5 w-full">
    <button
      v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
      :key="n"
      class="aspect-square rounded-lg bg-surface border border-line text-ink-text font-display text-xl font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors"
      @click="emit('digit', n)"
    >
      {{ n }}
    </button>

    <button
      class="aspect-square rounded-lg bg-surface border border-line text-ink-text font-display text-xl font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors"
      @click="emit('digit', 0)"
    >
      0
    </button>

    <button
      class="col-span-2 rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors py-2"
      @click="emit('delete')"
    >
      Delete
    </button>
  </div>
</template>
