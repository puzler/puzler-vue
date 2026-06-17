<script setup lang="ts">
import { useSolverStore, type TechniqueToggles } from '@/stores/solver'

const solver = useSolverStore()
defineEmits<{ close: [] }>()

const TECHNIQUES: Array<{ key: keyof TechniqueToggles; label: string; hint: string }> = [
  { key: 'subsets', label: 'Naked & hidden subsets', hint: 'Pairs, triples and quads locked to a set of cells.' },
  { key: 'lockedCandidates', label: 'Locked candidates', hint: 'Pointing and claiming, including knight/king sight-lines.' },
  { key: 'weakLinkForcing', label: 'Weak-link forcing', hint: 'Linked pairs and single-cell forcing across the weak-link graph.' },
  { key: 'parity', label: 'Parity counting', hint: 'Odd/even balance from houses, arrows and cages.' },
  { key: 'fish', label: 'Fish', hint: 'X-Wing and Swordfish over rows, columns and regions.' },
  { key: 'wings', label: 'Wings', hint: 'XY-Wing.' },
  {
    key: 'contradictionCheck',
    label: 'Contradiction check',
    hint: 'Last-resort lookahead: trial each candidate and rule out any that force a contradiction. Catches interactions no other technique sees, but is slower.',
  },
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
      <div class="bg-surface rounded-xl shadow-xl w-80 p-5 max-h-[85vh] overflow-y-auto">
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
              Show candidates the enabled techniques can't eliminate. Ones that actually break the
              puzzle are shown in red.
            </p>
          </div>

          <div class="flex flex-col gap-2.5">
            <span class="text-sm text-ink-text">Techniques</span>
            <div
              v-for="t in TECHNIQUES"
              :key="t.key"
              class="flex flex-col gap-1"
            >
              <label :class="CHECK">
                <input
                  type="checkbox"
                  class="accent-action mt-0.5"
                  :checked="solver.techniques[t.key]"
                  @change="solver.setTechnique(t.key, ($event.target as HTMLInputElement).checked)"
                >
                {{ t.label }}
              </label>
              <p :class="HINT">
                {{ t.hint }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
