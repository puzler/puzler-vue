<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { GLOBAL_VARIANTS } from '@/types/constraints'
import { LOCAL_TOOL_TYPES, pickerOptionsFor } from '@/constraints/registry'
import LocalConstraintPickerModal from './LocalConstraintPickerModal.vue'
import ConstraintPickerModal from './ConstraintPickerModal.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'
import PuzzleMetaFields from './PuzzleMetaFields.vue'
import ConstraintCategorySection from './ConstraintCategorySection.vue'
import SolverPanel from './SolverPanel.vue'
import { useSolverStore } from '@/stores/solver'

// Multiple root nodes (aside + teleported modals) prevent automatic attr
// inheritance, so forward attrs to the aside explicitly
defineOptions({ inheritAttrs: false })

// Mobile gives the solver its own bottom-sheet, so the embedded panel is hidden
// there to avoid duplicating it inside the Tools sheet.
const props = withDefaults(defineProps<{ showSolver?: boolean; showMeta?: boolean }>(), { showSolver: true, showMeta: true })

const editor = useEditorStore()
const solver = useSolverStore()

interface ConstraintOption {
  type: string
  label: string
}

interface Category {
  key: string
  label: string
  options: ConstraintOption[]
  mode: 'global' | 'list' | 'cosmetic' | 'tool'
}

const globalCategory: Category = {
  key: 'global',
  label: 'Global Constraints',
  mode: 'global',
  options: pickerOptionsFor('global'),
}

const localCategory: Category = {
  key: 'local',
  label: 'Local Constraints',
  mode: 'list',
  options: [],
}

const cosmeticCategory: Category = {
  key: 'cosmetic',
  label: 'Cosmetics',
  mode: 'cosmetic',
  options: pickerOptionsFor('cosmetic'),
}

const showLocalPicker = ref(false)
const pickerCategory = ref<Category | null>(null)
const confirmId = ref<string | null>(null)

const confirmTarget = computed(() =>
  editor.activeConstraints.find((c) => c.id === confirmId.value) ?? null,
)

const localConstraints = computed(() =>
  // fog_lights is managed through the Fog of War panel, not as its own chip.
  editor.activeConstraints.filter(c => c.category !== 'global' && c.category !== 'cosmetic' && c.type !== 'fog_lights'),
)

function constraintsFor(key: string) {
  return editor.activeConstraints.filter((c) => c.category === key)
}

function handleLocalPick(type: string) {
  editor.addConstraint(type)
  if (LOCAL_TOOL_TYPES.has(type)) editor.setActiveTool(type)
}

function handlePick(type: string) {
  if (!pickerCategory.value) return
  editor.addConstraint(type)
  if (pickerCategory.value.mode !== 'list') editor.setActiveTool(type)
}

// Removal routes by the chip's registry category to the action that also
// clears that category's placed state.
function handleRemoveConfirm() {
  if (!confirmTarget.value) return
  const { type, category } = confirmTarget.value
  if (editor.activeTool === type) editor.setActiveTool('digit')
  if (type === 'fog') {
    // Fog also owns the lights tool and its placed marks.
    if (editor.activeTool === 'fog_lights') editor.setActiveTool('digit')
    editor.removeFogConstraint()
  } else if (type === 'sudoku_rules') {
    // Default-ON global: dropping the chip restores enabled, so the generic
    // variant-clearing removal (absent = off) doesn't fit.
    editor.removeSudokuRulesConstraint()
  } else if (category === 'global') {
    // The type itself is included for self-toggle groups (disjoint sets),
    // whose own type doubles as the rule's variant string; harmless for the
    // others, whose type never appears in activeGlobalVariants.
    const variantTypes = [type, ...(GLOBAL_VARIANTS[type] ?? []).map(v => v.type)]
    editor.removeGlobalConstraint(type, variantTypes)
  } else if (category === 'cosmetic') {
    editor.removeCosmeticType(type)
  } else if (category === 'line') {
    editor.removeConstraintLine(type)
  } else if (category === 'single_cell') {
    editor.removeSingleCellConstraint(type)
  } else if (category === 'connector') {
    editor.removeConnectorConstraint(type)
  } else if (category === 'region') {
    editor.removeRegionConstraint(type)
  } else if (category === 'outer') {
    editor.removeOuterClueConstraint(type)
  } else {
    editor.removeConstraint(type)
  }
  confirmId.value = null
}
</script>

<template>
  <aside
    class="flex flex-col flex-1 min-h-0 bg-paper border-r border-line"
    :class="solver.panelExpanded ? 'overflow-hidden' : 'overflow-y-auto'"
    v-bind="$attrs"
  >
    <PuzzleMetaFields v-show="props.showMeta && !solver.panelExpanded" />

    <SolverPanel v-if="props.showSolver" />

    <div
      v-show="!solver.panelExpanded"
      class="px-2 py-3 border-b border-line"
    >
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft px-2 mb-1">
        Tools
      </p>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'digit' ? 'bg-action-tint text-action font-medium' : 'text-ink-text hover:bg-line/60'"
        @click="editor.setActiveTool('digit')"
      >
        Given Digits
      </button>
      <button
        class="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors"
        :class="editor.activeTool === 'grid' ? 'bg-action-tint text-action font-medium' : 'text-ink-text hover:bg-line/60'"
        @click="editor.setActiveTool('grid')"
      >
        Grid
      </button>
    </div>

    <ConstraintCategorySection
      v-show="!solver.panelExpanded"
      :cat="globalCategory"
      :constraints="constraintsFor('global')"
      @open-picker="pickerCategory = globalCategory"
      @confirm-remove="confirmId = $event"
    />

    <ConstraintCategorySection
      v-show="!solver.panelExpanded"
      :cat="localCategory"
      :constraints="localConstraints"
      :tool-types="LOCAL_TOOL_TYPES"
      @open-picker="showLocalPicker = true"
      @confirm-remove="confirmId = $event"
    />

    <ConstraintCategorySection
      v-show="!solver.panelExpanded"
      :cat="cosmeticCategory"
      :constraints="constraintsFor('cosmetic')"
      @open-picker="pickerCategory = cosmeticCategory"
      @confirm-remove="confirmId = $event"
    />
  </aside>

  <LocalConstraintPickerModal
    v-if="showLocalPicker"
    :disabled-types="localConstraints.map(c => c.type)"
    @pick="handleLocalPick"
    @close="showLocalPicker = false"
  />

  <ConstraintPickerModal
    v-if="pickerCategory"
    :title="pickerCategory.label"
    :options="pickerCategory.options"
    :disabled-types="constraintsFor(pickerCategory.key).map(c => c.type)"
    @pick="handlePick"
    @close="pickerCategory = null"
  />

  <ConfirmModal
    v-if="confirmTarget"
    :message="`Remove '${confirmTarget.label}'?`"
    @confirm="handleRemoveConfirm"
    @cancel="confirmId = null"
  />
</template>
