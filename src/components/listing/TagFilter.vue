<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiTagOutline, mdiChevronDown } from '@mdi/js'

// Multi-select tag filter dropdown, modeled on ConstraintFilter. Options are
// supplied by the parent (fetched once via the Tags query).
const props = defineProps<{ options: ReadonlyArray<{ value: string; label: string }> }>()
const model = defineModel<string[]>({ required: true })

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => { open.value = false })

function toggle(value: string) {
  const set = new Set(model.value)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  model.value = [...set]
}
</script>

<template>
  <div
    ref="root"
    class="relative"
  >
    <button
      type="button"
      class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg border border-line bg-surface"
      :class="model.length ? 'text-action border-action' : 'text-soft'"
      @click="open = !open"
    >
      <MdiIcon
        :path="mdiTagOutline"
        :size="16"
      />
      <span class="flex-1 text-left">{{ model.length ? `${model.length} tag${model.length === 1 ? '' : 's'}` : 'Any tag' }}</span>
      <MdiIcon
        :path="mdiChevronDown"
        :size="14"
      />
    </button>
    <div
      v-if="open"
      class="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-line bg-surface shadow-xl p-2"
    >
      <p
        v-if="!props.options.length"
        class="px-1 py-1 text-xs text-faint"
      >
        No tags yet.
      </p>
      <button
        v-if="model.length"
        type="button"
        class="w-full text-right text-xs text-soft hover:text-action pb-1 mb-1 border-b border-line"
        @click="model = []"
      >
        Clear
      </button>
      <label
        v-for="tag in props.options"
        :key="tag.value"
        class="flex items-center gap-2 px-1 py-1 text-sm text-ink-text rounded hover:bg-paper cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="model.includes(tag.value)"
          @change="toggle(tag.value)"
        >
        {{ tag.label }}
      </label>
    </div>
  </div>
</template>
