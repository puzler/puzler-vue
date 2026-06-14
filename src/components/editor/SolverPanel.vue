<script setup lang="ts">
import { mdiChevronDown, mdiArrowExpand, mdiArrowCollapse } from '@mdi/js'
import { useSolverStore } from '@/stores/solver'
import SolverControls from './SolverControls.vue'

const solver = useSolverStore()
</script>

<template>
  <section
    class="border-b border-line flex flex-col"
    :class="solver.panelExpanded ? 'flex-1 min-h-0' : ''"
  >
    <div class="flex items-center justify-between pl-2 pr-3 py-3">
      <button
        class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-soft px-2"
        @click="solver.togglePanelCollapsed()"
      >
        <svg
          viewBox="0 0 24 24"
          class="w-3 h-3 transition-transform"
          :class="solver.panelCollapsed ? '-rotate-90' : ''"
        ><path
          :d="mdiChevronDown"
          fill="currentColor"
        /></svg>
        Solver
      </button>
      <button
        v-if="!solver.panelCollapsed"
        class="text-soft hover:text-action p-0.5 transition-colors"
        :title="solver.panelExpanded ? 'Restore panel' : 'Expand panel'"
        @click="solver.togglePanelExpanded()"
      >
        <svg
          viewBox="0 0 24 24"
          class="w-4 h-4"
        ><path
          :d="solver.panelExpanded ? mdiArrowCollapse : mdiArrowExpand"
          fill="currentColor"
        /></svg>
      </button>
    </div>

    <SolverControls v-show="!solver.panelCollapsed" />
  </section>
</template>
