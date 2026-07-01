<script setup lang="ts">
import { ref } from 'vue'
import { mdiSync, mdiCog } from '@mdi/js'
import { useSolverStore, type SolverCommand } from '@/stores/solver'
import SolverSettingsModal from './SolverSettingsModal.vue'

const solver = useSolverStore()
const showSettings = ref(false)

const PRIMARY: Array<{ cmd: SolverCommand; label: string }> = [
  { cmd: 'solve', label: 'Solve' },
  { cmd: 'logical-solve', label: 'Logical Solve' },
  { cmd: 'count', label: 'Count Solutions' },
  { cmd: 'logical-step', label: 'Logical Step' },
]

const BTN =
  'relative flex items-center justify-center gap-1 h-8 px-1.5 rounded-md bg-surface border border-line text-ink-text text-xs font-medium shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors disabled:opacity-40 disabled:pointer-events-none'
const SPINNER = 'inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin'

function isRunning(cmd: SolverCommand): boolean {
  return solver.currentCommand === cmd
}

function run(cmd: SolverCommand): void {
  if (cmd === 'solve') solver.runSolve()
  else if (cmd === 'logical-solve') solver.runLogicalSolve()
  else if (cmd === 'count') solver.runCount()
  else if (cmd === 'logical-step') solver.runLogicalStep()
  else if (cmd === 'true-candidates') solver.runTrueCandidates()
  else if (cmd === 'check') solver.runCheck()
}

function toggle(cmd: SolverCommand): void {
  if (isRunning(cmd)) solver.cancel()
  else run(cmd)
}
</script>

<template>
  <div
    class="flex flex-col min-h-0 px-3 pb-3 gap-2"
    :class="solver.panelExpanded ? 'flex-1' : ''"
  >
    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="b in PRIMARY"
        :key="b.cmd"
        :class="BTN"
        @click="toggle(b.cmd)"
      >
        <span
          v-if="isRunning(b.cmd)"
          :class="SPINNER"
        />
        {{ isRunning(b.cmd) ? 'Cancel' : b.label }}
      </button>
    </div>

    <div class="flex items-center gap-1.5">
      <button
        :class="[BTN, solver.autoTrueCandidates ? 'bg-action border-action text-on-action hover:bg-action' : '']"
        class="shrink-0 w-8 px-0"
        title="Auto true candidates"
        @click="solver.toggleAutoTrueCandidates()"
      >
        <svg
          viewBox="0 0 24 24"
          class="w-4 h-4"
          :class="solver.autoTrueCandidates ? 'animate-spin' : ''"
        ><path
          :d="mdiSync"
          fill="currentColor"
        /></svg>
      </button>
      <button
        :class="BTN"
        class="flex-1"
        :disabled="solver.autoTrueCandidates"
        @click="toggle('true-candidates')"
      >
        <span
          v-if="isRunning('true-candidates')"
          :class="SPINNER"
        />
        {{ isRunning('true-candidates') ? 'Cancel' : 'Candidates' }}
      </button>
    </div>

    <button
      :class="BTN"
      class="w-full"
      @click="toggle('check')"
    >
      {{ isRunning('check') ? 'Cancel' : 'Check' }}
    </button>

    <button
      class="flex items-center gap-1.5 self-start text-xs text-soft hover:text-action transition-colors"
      @click="showSettings = true"
    >
      <svg
        viewBox="0 0 24 24"
        class="w-3.5 h-3.5"
      ><path
        :d="mdiCog"
        fill="currentColor"
      /></svg>
      Settings
    </button>

    <div
      class="overflow-y-auto rounded-md bg-surface border border-line p-2 text-xs text-ink-text whitespace-pre-wrap"
      :class="solver.panelExpanded ? 'flex-1 min-h-0' : 'h-40'"
    >
      <div
        v-for="(line, i) in solver.display"
        :key="i"
        class="py-0.5 leading-snug"
      >
        {{ line }}
      </div>
    </div>

    <SolverSettingsModal
      v-if="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>
