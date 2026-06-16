<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiEyeOutline } from '@mdi/js'

// Eye icon opening a multi-select visibility filter. Selections combine with
// ANY semantics (the server returns records matching any chosen bucket).
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
    class="relative shrink-0"
  >
    <button
      type="button"
      class="p-1.5 rounded-lg hover:bg-paper"
      :class="model.length ? 'text-action' : 'text-soft hover:text-action'"
      title="Filter by visibility"
      @click="open = !open"
    >
      <MdiIcon
        :path="mdiEyeOutline"
        :size="18"
      />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface shadow-xl p-1"
    >
      <label
        v-for="opt in props.options"
        :key="opt.value"
        class="flex items-center gap-2 px-2 py-1.5 text-sm text-ink-text rounded-lg hover:bg-paper cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="model.includes(opt.value)"
          @change="toggle(opt.value)"
        >
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>
