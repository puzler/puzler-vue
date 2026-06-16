<script setup lang="ts">
import { computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiRhombus, mdiRhombusOutline } from '@mdi/js'

// 1-5 difficulty shown as filled diamonds (distinct from the quality star
// rating). Readonly for display (rounds a float like effective difficulty);
// interactive as a v-model picker for the editor and the solver's vote.
const props = withDefaults(defineProps<{
  readonly?: boolean
  size?: number
}>(), { readonly: false, size: 14 })

const model = defineModel<number | null>({ default: null })

const LEVELS = [1, 2, 3, 4, 5]
const current = computed(() => (model.value == null ? 0 : Math.min(5, Math.max(0, Math.round(model.value)))))

function pick(level: number) {
  if (props.readonly) return
  // Click the current single value to clear it.
  model.value = model.value === level ? null : level
}
</script>

<template>
  <span class="inline-flex items-center gap-0.5">
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="level in LEVELS"
      :key="level"
      :type="readonly ? undefined : 'button'"
      :title="readonly ? undefined : `Difficulty ${level}`"
      :class="[
        level <= current ? 'text-action' : 'text-faint',
        readonly ? '' : 'hover:scale-110 transition-transform',
      ]"
      @click="pick(level)"
    >
      <MdiIcon
        :path="level <= current ? mdiRhombus : mdiRhombusOutline"
        :size="size"
      />
    </component>
  </span>
</template>
