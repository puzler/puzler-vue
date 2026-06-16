<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiCheck } from '@mdi/js'

// A compact icon button that opens a single-select popover menu. Powers the
// inline visibility and folder controls on list rows so they stay a tidy strip
// of icons instead of full-width selects.
const props = defineProps<{
  options: ReadonlyArray<{ value: string; label: string; icon?: string }>
  selected: string
  triggerIcon: string
  title: string
  active?: boolean
}>()
const emit = defineEmits<{ select: [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => { open.value = false })

function choose(value: string) {
  emit('select', value)
  open.value = false
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
      :class="props.active ? 'text-action' : 'text-soft hover:text-action'"
      :title="props.title"
      @click="open = !open"
    >
      <MdiIcon
        :path="props.triggerIcon"
        :size="16"
      />
    </button>
    <div
      v-if="open"
      class="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface shadow-xl p-1"
    >
      <button
        v-for="opt in props.options"
        :key="opt.value"
        type="button"
        class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg text-left"
        :class="opt.value === props.selected ? 'bg-action-tint text-action' : 'text-ink-text hover:bg-paper'"
        @click="choose(opt.value)"
      >
        <MdiIcon
          v-if="opt.icon"
          :path="opt.icon"
          :size="15"
        />
        <span class="flex-1 truncate">{{ opt.label }}</span>
        <MdiIcon
          v-if="opt.value === props.selected"
          :path="mdiCheck"
          :size="14"
        />
      </button>
    </div>
  </div>
</template>
