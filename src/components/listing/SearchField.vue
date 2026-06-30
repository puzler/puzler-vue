<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiMagnify } from '@mdi/js'

// On desktop (sm+) this stays a magnifying-glass icon until used, then animates
// open as an absolutely-positioned overlay sized to sit clear of the controls
// floated to its right, so the layout never shifts. On mobile the toolbar stacks
// the search onto its own full-width row (see ListToolbar), so here it is simply
// always a full-width input — no collapsing overlay that could end up covering
// the controls below (which is what happens once the field holds a query and
// stays expanded). `expanded` therefore only drives the desktop collapse.
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
  <div class="relative h-9 w-full sm:w-9 shrink-0">
    <!-- Decorative on mobile (and when expanded); the clickable open-trigger only
         on desktop while collapsed. -->
    <button
      type="button"
      class="relative z-20 w-9 h-9 flex items-center justify-center"
      :class="expanded
        ? 'text-faint pointer-events-none'
        : 'text-faint pointer-events-none sm:text-soft sm:hover:text-action sm:pointer-events-auto'"
      title="Search"
      @click="activate"
    >
      <MdiIcon
        :path="mdiMagnify"
        :size="18"
      />
    </button>
    <!-- Full-width and always visible on mobile; the sm: classes restore the
         collapse-to-icon overlay on desktop. -->
    <input
      ref="input"
      v-model="model"
      type="text"
      placeholder="Search"
      class="absolute left-0 top-0 z-10 h-9 w-full rounded-lg border border-line bg-surface text-sm pl-9 pr-2 text-ink-text outline-none transition-all duration-200 ease-out"
      :class="expanded
        ? 'sm:w-44 sm:opacity-100 sm:border-line'
        : 'sm:w-9 sm:opacity-0 sm:pointer-events-none sm:border-transparent'"
      @blur="onBlur"
    >
  </div>
</template>
