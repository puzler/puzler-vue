<script setup lang="ts">
import { useSolverStore, type TechniqueToggles } from '@/stores/solver'

const solver = useSolverStore()
defineEmits<{ close: [] }>()

interface ToggleRow {
  label: string
  hint: string
  get: () => boolean
  set: (value: boolean) => void
}

const TECHNIQUES: Array<{ key: keyof TechniqueToggles; label: string; hint: string }> = [
  { key: 'subsets', label: 'Naked & hidden subsets', hint: 'Pairs, triples and quads locked to a set of cells.' },
  { key: 'lockedCandidates', label: 'Locked candidates', hint: 'Pointing and claiming, including knight/king sight-lines.' },
  {
    key: 'weakLinkForcing',
    label: 'Forced eliminations',
    hint: "Rules out a digit when placing it would leave a cell it sees with no options, or force two cells that can't match into the same digit. Counts cells seen through the puzzle's special rules, not just rows, columns and boxes.",
  },
  { key: 'parity', label: 'Parity counting', hint: 'Odd/even balance from houses, arrows and cages.' },
  {
    key: 'fish',
    label: 'X-Wings & Fishes',
    hint: "When a digit can only go in the same few columns across several rows, it's cleared from those columns everywhere else (and the same with rows and columns swapped). The X-Wing and Swordfish patterns.",
  },
  {
    key: 'wings',
    label: 'XY-Wings',
    hint: "A pivot cell and two 'pincer' cells whose options together force a digit out of any cell both pincers see. The XY-Wing pattern.",
  },
  {
    key: 'contradictionCheck',
    label: 'Contradiction check',
    hint: 'Last-resort lookahead: trial each candidate and rule out any that force a contradiction. Catches interactions no other technique sees, but is slower.',
  },
]

const GROUPS: Array<{ title: string; rows: ToggleRow[] }> = [
  {
    title: 'Display',
    rows: [
      {
        label: 'Show candidate counts',
        hint: 'Colour each true candidate by how many solutions remain if placed.',
        get: () => solver.showCandidateCounts,
        set: (v) => solver.setShowCandidateCounts(v),
      },
      {
        label: 'Show logical candidates',
        hint: "Show candidates the enabled techniques can't eliminate. Ones that actually break the puzzle are shown in red.",
        get: () => solver.showLogicalCandidates,
        set: (v) => solver.setShowLogicalCandidates(v),
      },
    ],
  },
  {
    title: 'Techniques',
    rows: TECHNIQUES.map((t) => ({
      label: t.label,
      hint: t.hint,
      get: () => solver.techniques[t.key],
      set: (v: boolean) => solver.setTechnique(t.key, v),
    })),
  },
]

const CHECK = 'flex items-center gap-2.5 text-sm text-ink-text select-none cursor-pointer'
const INFO =
  'w-[15px] h-[15px] shrink-0 rounded-full border border-line text-faint text-[10px] leading-none flex items-center justify-center hover:border-action hover:text-action transition-colors'
const TOOLTIP =
  'hidden group-hover:block group-focus-within:block absolute right-0 top-full mt-1.5 w-56 max-w-[calc(100vw-3rem)] bg-surface border border-line rounded-lg shadow-lg p-2.5 text-[11px] text-soft leading-snug z-20'
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="$emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-[32rem] max-w-[calc(100vw-2rem)] p-5">
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

        <div class="flex flex-col gap-5">
          <section
            v-for="group in GROUPS"
            :key="group.title"
            class="flex flex-col gap-2.5"
          >
            <span class="text-sm text-ink-text">{{ group.title }}</span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <div
                v-for="row in group.rows"
                :key="row.label"
                class="flex items-center justify-between gap-2"
              >
                <label :class="CHECK">
                  <input
                    type="checkbox"
                    class="accent-action"
                    :checked="row.get()"
                    @change="row.set(($event.target as HTMLInputElement).checked)"
                  >
                  {{ row.label }}
                </label>
                <span class="relative group inline-flex">
                  <button
                    type="button"
                    :class="INFO"
                    :aria-label="`About ${row.label}`"
                  >
                    ?
                  </button>
                  <span :class="TOOLTIP">{{ row.hint }}</span>
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
