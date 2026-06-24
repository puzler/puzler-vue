<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const cs = useConstraintStyles()

// A single constraint in the picker grid: icon above label. Disabled tiles
// (already added to the puzzle) render greyed and are not clickable.
const props = defineProps<{
  type: string
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  pick: [type: string, label: string]
}>()
</script>

<template>
  <button
    :disabled="props.disabled"
    class="flex flex-col items-center justify-center gap-1.5 px-1 py-2.5 rounded-xl text-center transition-colors"
    :class="props.disabled
      ? 'text-faint cursor-not-allowed'
      : 'text-ink-text hover:bg-action-tint hover:text-action'"
    @click="emit('pick', props.type, props.label)"
  >
    <MdiIcon
      v-if="CONSTRAINT_ICONS[props.type]"
      :path="CONSTRAINT_ICONS[props.type].path"
      :color="props.disabled ? 'rgb(209 213 219)' : cs.iconColor(props.type)"
      :rotate="CONSTRAINT_ICONS[props.type].rotate"
      :size="22"
    />
    <span class="text-[11px] leading-tight">{{ props.label }}</span>
  </button>
</template>
