<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { mdiClose } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import { pushModal } from './modalStack'

// A slide-up bottom sheet for mobile-only secondary UI (filters, folder tree).
// The list stays full-width behind it. Shares BaseModal's backdrop/`data-modal-open`/
// Escape plumbing but is bottom-anchored rather than centered. Caller mounts it
// with v-if (typically gated on a mobile breakpoint) and slots the panel content.
withDefaults(defineProps<{ title?: string; doneLabel?: string }>(), {
  title: 'Filters',
  doneLabel: 'Show results',
})

const emit = defineEmits<{ close: [] }>()

let unregister: (() => void) | null = null
onMounted(() => { unregister = pushModal(() => emit('close')) })
onUnmounted(() => unregister?.())
</script>

<template>
  <Teleport to="body">
    <div
      data-modal-open
      class="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
      @click.self="emit('close')"
    >
      <Transition
        appear
        enter-active-class="transition-transform duration-200 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
      >
        <div class="bg-surface w-full rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
          <header class="flex items-center justify-between gap-2 px-4 py-3 border-b border-line shrink-0">
            <span class="text-sm font-semibold text-ink-text">{{ title }}</span>
            <button
              class="text-faint hover:text-ink-text"
              aria-label="Close"
              @click="emit('close')"
            >
              <MdiIcon
                :path="mdiClose"
                :size="20"
              />
            </button>
          </header>

          <div class="flex-1 min-h-0 overflow-y-auto p-4">
            <slot />
          </div>

          <footer class="px-4 py-3 border-t border-line shrink-0">
            <button
              class="w-full px-4 py-2 rounded-lg bg-action text-on-action text-sm font-medium hover:bg-action-deep transition-colors"
              @click="emit('close')"
            >
              {{ doneLabel }}
            </button>
          </footer>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
