<script setup lang="ts">
import { CONSTRAINT_STYLE_REGISTRY, type ConstraintStyleKey, type ConstraintStyleCategory } from '@/utils/theme'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import MdiIcon from '@/components/MdiIcon.vue'

// Left-hand "what to edit" list for the theme editor: Appearance (chrome / grid) then every
// constraint grouped by category. Selection is a focus value used by the preview + controls.
type Focus = 'chrome' | 'grid' | ConstraintStyleKey

defineProps<{ selected: Focus }>()
const emit = defineEmits<{ select: [focus: Focus] }>()

const cs = useConstraintStyles()

const CATEGORIES: { cat: ConstraintStyleCategory; label: string }[] = [
  { cat: 'lines', label: 'Lines' },
  { cat: 'connectors', label: 'Connectors' },
  { cat: 'cells', label: 'Cell marks' },
  { cat: 'regions', label: 'Regions' },
  { cat: 'outer', label: 'Outer clues' },
  { cat: 'global', label: 'Global' },
]
const keys = Object.keys(CONSTRAINT_STYLE_REGISTRY) as ConstraintStyleKey[]
const groups = CATEGORIES.map(c => ({ ...c, keys: keys.filter(k => CONSTRAINT_STYLE_REGISTRY[k].category === c.cat) }))

const rowClass = (active: boolean) =>
  active ? 'bg-action-tint text-action font-medium' : 'text-ink-text hover:bg-line/50'
</script>

<template>
  <div class="py-2 text-sm">
    <p class="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-soft">
      Appearance
    </p>
    <button
      type="button"
      class="w-full text-left px-3 py-1.5 rounded-md transition-colors"
      :class="rowClass(selected === 'chrome')"
      @click="emit('select', 'chrome')"
    >
      App chrome
    </button>
    <button
      type="button"
      class="w-full text-left px-3 py-1.5 rounded-md transition-colors"
      :class="rowClass(selected === 'grid')"
      @click="emit('select', 'grid')"
    >
      Grid
    </button>

    <template
      v-for="group in groups"
      :key="group.cat"
    >
      <p class="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ group.label }}
      </p>
      <button
        v-for="k in group.keys"
        :key="k"
        type="button"
        class="w-full text-left px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors"
        :class="rowClass(selected === k)"
        @click="emit('select', k)"
      >
        <MdiIcon
          v-if="CONSTRAINT_ICONS[k]"
          :path="CONSTRAINT_ICONS[k].path"
          :color="cs.iconColor(k)"
          :rotate="CONSTRAINT_ICONS[k].rotate"
          :size="14"
          class="shrink-0"
        />
        {{ CONSTRAINT_STYLE_REGISTRY[k].label }}
      </button>
    </template>
  </div>
</template>
