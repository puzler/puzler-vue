<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

// The constraint rule for the active line type, passed from its registry def
// (panel.props.ruleText). Interaction is described by the Draw/Branch mode hints;
// branchable: false hides Branch for two-endpoint shapes (lockout lines).
const props = withDefaults(
  defineProps<{ ruleText?: string; branchable?: boolean }>(),
  { ruleText: '', branchable: true },
)

const editor = useEditorStore()

const MODES = [
  { key: 'draw', label: 'Draw' },
  { key: 'branch', label: 'Branch' },
]

const label = computed(() =>
  editor.activeConstraints.find(c => c.type === editor.activeTool)?.label ?? '',
)

const description = computed(() => props.ruleText)
</script>

<template>
  <div class="flex flex-col p-3 gap-3">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      {{ label }}
    </p>

    <ModeSwitcher
      v-if="props.branchable"
      :modes="MODES"
      :active="editor.effectiveLineDrawMode"
      @select="editor.setLineDrawMode($event as 'draw' | 'branch')"
    />

    <p class="text-[11px] text-faint leading-snug">
      {{ description }}
    </p>
    <p class="text-[11px] text-faint leading-snug">
      Draw: drag to add a line · tap one to delete it
    </p>
    <p
      v-if="props.branchable"
      class="text-[11px] text-faint leading-snug"
    >
      Branch: drag from an existing line's cell to branch off it · holding Shift switches to Branch
    </p>
  </div>
</template>
