<script setup lang="ts">
import { ref } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'

interface ConstraintOption {
  type: string
  label: string
}

interface ConstraintGroup {
  key: string
  label: string
  options: ConstraintOption[]
}

const GROUPS: ConstraintGroup[] = [
  {
    key: 'lines',
    label: 'Lines',
    options: [
      { type: 'renban', label: 'Renban Lines' },
      { type: 'german_whispers', label: 'German Whispers' },
      { type: 'region_sum', label: 'Region Sum Lines' },
      { type: 'palindrome', label: 'Palindrome Lines' },
      { type: 'dutch_whispers', label: 'Dutch Whispers' },
      { type: 'between_lines', label: 'Between Lines' },
    ],
  },
  {
    key: 'single_cell',
    label: 'Single Cell Constraints',
    options: [
      { type: 'odd_cells', label: 'Odd Cells' },
      { type: 'even_cells', label: 'Even Cells' },
      { type: 'minimums', label: 'Minimums' },
      { type: 'maximums', label: 'Maximums' },
      { type: 'row_index_cells', label: 'Row Index Cells' },
      { type: 'col_index_cells', label: 'Column Index Cells' },
    ],
  },
  {
    key: 'cell_connectors',
    label: 'Cell Connectors',
    options: [
      { type: 'difference_dots', label: 'Difference Dots' },
      { type: 'ratio_dots', label: 'Ratio Dots' },
      { type: 'xv', label: 'XV' },
      { type: 'quadruples', label: 'Quadruples' },
    ],
  },
  {
    key: 'multi_cell',
    label: 'Multi-Cell Constraints',
    options: [
      { type: 'thermometer', label: 'Thermometers' },
      { type: 'arrow', label: 'Arrows' },
      { type: 'killer_cage', label: 'Killer Cages' },
      { type: 'clone', label: 'Clones' },
      { type: 'extra_regions', label: 'Extra Regions' },
    ],
  },
  {
    key: 'outer_clues',
    label: 'Outer Clues',
    options: [
      { type: 'x_sums', label: 'X-Sums' },
      { type: 'sandwich_sums', label: 'Sandwich Sums' },
      { type: 'skyscrapers', label: 'Skyscrapers' },
      { type: 'little_killers', label: 'Little Killers' },
    ],
  },
]

const props = defineProps<{
  disabledTypes?: string[]
}>()

const emit = defineEmits<{
  pick: [type: string, label: string]
  close: []
}>()

const expandedGroup = ref<string>(GROUPS[0].key)

function selectGroup(key: string) {
  expandedGroup.value = key
}

function pick(type: string, label: string) {
  if (props.disabledTypes?.includes(type)) return
  emit('pick', type, label)
  emit('close')
}

function onEnter(el: Element) {
  const div = el as HTMLElement
  div.style.overflow = 'hidden'
  div.style.height = '0'
  div.style.transition = 'height 0.2s ease-out'
  void div.offsetHeight
  div.style.height = div.scrollHeight + 'px'
}

function onAfterEnter(el: Element) {
  const div = el as HTMLElement
  div.style.height = ''
  div.style.overflow = ''
  div.style.transition = ''
}

function onLeave(el: Element) {
  const div = el as HTMLElement
  div.style.overflow = 'hidden'
  div.style.height = div.scrollHeight + 'px'
  div.style.transition = 'height 0.2s ease-in'
  void div.offsetHeight
  div.style.height = '0'
}

function onAfterLeave(el: Element) {
  const div = el as HTMLElement
  div.style.height = ''
  div.style.overflow = ''
  div.style.transition = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-surface rounded-xl shadow-xl w-80 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 class="font-display font-semibold text-ink-text text-sm">
            Add Local Constraint
          </h3>
          <button
            class="text-faint hover:text-soft text-lg leading-none"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="overflow-y-auto flex-1 py-2">
          <div
            v-for="group in GROUPS"
            :key="group.key"
          >
            <button
              class="w-full flex items-center justify-between px-5 py-2 text-left hover:bg-line/40 transition-colors"
              @click="selectGroup(group.key)"
            >
              <span class="text-[10px] font-semibold uppercase tracking-widest text-faint">
                {{ group.label }}
              </span>
              <span class="text-faint text-xs leading-none">
                {{ expandedGroup === group.key ? '−' : '+' }}
              </span>
            </button>

            <Transition
              @enter="onEnter"
              @after-enter="onAfterEnter"
              @leave="onLeave"
              @after-leave="onAfterLeave"
            >
              <div
                v-if="expandedGroup === group.key"
                class="flex flex-col gap-0.5 px-3 pb-1"
              >
                <button
                  v-for="opt in group.options"
                  :key="opt.type"
                  :disabled="disabledTypes?.includes(opt.type)"
                  class="flex items-center gap-2.5 text-left px-3 py-1.5 rounded-lg text-sm transition-colors"
                  :class="disabledTypes?.includes(opt.type)
                    ? 'text-faint cursor-not-allowed'
                    : 'text-ink-text hover:bg-action-tint hover:text-action'"
                  @click="pick(opt.type, opt.label)"
                >
                  <MdiIcon
                    v-if="CONSTRAINT_ICONS[opt.type]"
                    :path="CONSTRAINT_ICONS[opt.type].path"
                    :color="disabledTypes?.includes(opt.type) ? 'rgb(209 213 219)' : CONSTRAINT_ICONS[opt.type].color"
                    :rotate="CONSTRAINT_ICONS[opt.type].rotate"
                    :size="16"
                  />
                  {{ opt.label }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
