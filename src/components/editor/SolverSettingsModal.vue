<script setup lang="ts">
import { useSolverStore, type SolverTechniqueLevel } from '@/stores/solver'

const solver = useSolverStore()
defineEmits<{ close: [] }>()

const LEVELS: Array<{ value: SolverTechniqueLevel; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'tough', label: 'Tough' },
  { value: 'advanced', label: 'Advanced' },
]

const CHECK = 'flex items-start gap-2.5 text-sm text-ink-text select-none cursor-pointer'
const HINT = 'text-[11px] text-faint leading-snug pl-6'
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="$emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-80 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-semibold text-ink-text text-sm">
            Solver Settings
          </h3>
          <button
            class="text-faint hover:text-soft text-xl leading-none"
            aria-label="Close"
            @click="$emit('close')"
          >
            ×
          </button>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1">
            <label :class="CHECK">
              <input
                type="checkbox"
                class="accent-action mt-0.5"
                :checked="solver.showCandidateCounts"
                @change="solver.setShowCandidateCounts(($event.target as HTMLInputElement).checked)"
              >
              Show candidate counts
            </label>
            <p :class="HINT">
              Colour each true candidate by how many solutions remain if placed.
            </p>
          </div>

          <div class="flex flex-col gap-1">
            <label :class="CHECK">
              <input
                type="checkbox"
                class="accent-action mt-0.5"
                :checked="solver.showLogicalCandidates"
                @change="solver.setShowLogicalCandidates(($event.target as HTMLInputElement).checked)"
              >
              Show logical candidates
            </label>
            <p :class="HINT">
              Show candidates the chosen technique level can't eliminate. Ones that actually break the
              puzzle are shown in red.
            </p>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-sm text-ink-text">Technique level</span>
            <div class="grid grid-cols-3 gap-1">
              <button
                v-for="lvl in LEVELS"
                :key="lvl.value"
                class="h-8 rounded-md border text-xs font-medium transition-colors"
                :class="solver.techniqueLevel === lvl.value
                  ? 'bg-action border-action text-white'
                  : 'bg-surface border-line text-soft hover:border-action hover:text-action'"
                @click="solver.setTechniqueLevel(lvl.value)"
              >
                {{ lvl.label }}
              </button>
            </div>
            <p :class="HINT">
              How far the logical solver's standard techniques go (subsets &amp; locked candidates →
              fish → wings).
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
