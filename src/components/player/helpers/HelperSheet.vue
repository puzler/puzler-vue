<script setup lang="ts">
// Mobile math-helper sheet. Deliberately NON-modal: no Teleport, no backdrop,
// no focus trap, no scroll lock (BaseModal/FilterSheet bring all three) — the
// grid above must stay selectable so the calculator and cage helper update
// live while the sheet is open. Overlays the numpad area only.
import { mdiChevronDown } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import HelperSections from './HelperSections.vue'

defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="absolute inset-x-0 bottom-0 z-30 h-72 flex flex-col rounded-t-2xl border-t border-line bg-paper shadow-[0_-8px_24px_rgba(33,43,66,0.18)]"
    role="region"
    aria-label="Math helpers"
  >
    <div class="shrink-0 flex items-center px-4 py-2 border-b border-line">
      <h2 class="text-sm font-display font-semibold text-ink-text">
        Helpers
      </h2>
      <button
        type="button"
        class="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-soft hover:text-action hover:bg-action-tint transition-colors"
        title="Close helpers"
        aria-label="Close helpers"
        @click="$emit('close')"
      >
        <MdiIcon
          :path="mdiChevronDown"
          :size="20"
        />
      </button>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <HelperSections />
    </div>
  </div>
</template>
