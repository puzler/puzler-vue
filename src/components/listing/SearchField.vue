<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiMagnify } from '@mdi/js'

// A search affordance that stays a plain magnifying-glass icon until used.
// The input animates open as an absolutely-positioned overlay, so the field's
// layout footprint stays a fixed icon-sized slot and nothing beside it ever
// shifts. The expanded width is kept short enough to sit clear of the controls
// floated to its right. Blurring an empty input animates it back to the icon.
const model = defineModel<string>({ required: true })

const open = ref(false)
const input = ref<HTMLInputElement | null>(null)
const expanded = computed(() => open.value || !!model.value)

async function activate() {
  open.value = true
  await nextTick()
  input.value?.focus()
}

function onBlur() {
  if (!model.value) open.value = false
}
</script>

<template>
  <div class="relative w-9 h-9 shrink-0">
    <button
      type="button"
      class="relative z-10 w-9 h-9 flex items-center justify-center"
      :class="expanded ? 'text-faint pointer-events-none' : 'text-soft hover:text-action'"
      title="Search"
      @click="activate"
    >
      <MdiIcon
        :path="mdiMagnify"
        :size="18"
      />
    </button>
    <input
      ref="input"
      v-model="model"
      type="text"
      placeholder="Search"
      class="absolute left-0 top-0 h-9 rounded-lg border bg-surface text-sm pl-9 pr-2 text-ink-text outline-none transition-all duration-200 ease-out"
      :class="expanded ? 'w-44 opacity-100 border-line' : 'w-9 opacity-0 pointer-events-none border-transparent'"
      @blur="onBlur"
    >
  </div>
</template>
