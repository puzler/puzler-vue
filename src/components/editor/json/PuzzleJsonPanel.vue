<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { pushModal } from '@/components/ui/modalStack'

// Lazy: keeps CodeMirror and the JSON schema out of the main chunk until the
// panel is first opened.
const PuzzleJsonEditor = defineAsyncComponent(() => import('./PuzzleJsonEditor.vue'))

const editor = useEditorStore()
const fullscreen = ref(false)

// While fullscreen the panel behaves like a modal: Escape exits (capture-phase,
// so the grid never sees it) and isModalOpen() makes the hidden grid inert.
let unregisterModal: (() => void) | null = null
watch(fullscreen, (on) => {
  if (on) {
    unregisterModal = pushModal(() => {
      fullscreen.value = false
    })
  } else {
    unregisterModal?.()
    unregisterModal = null
  }
})
onBeforeUnmount(() => {
  unregisterModal?.()
})

function close() {
  fullscreen.value = false
  editor.jsonPanelOpen = false
}
</script>

<template>
  <!-- :disabled keeps the same editor instance (buffer, CM history) alive when
       toggling between docked and fullscreen; Teleport just moves the DOM. -->
  <Teleport
    to="body"
    :disabled="!fullscreen"
  >
    <div :class="fullscreen ? 'fixed inset-0 z-50 bg-surface flex flex-col' : 'contents'">
      <PuzzleJsonEditor
        :fullscreen="fullscreen"
        class="flex-1 min-h-0"
        @close="close"
        @toggle-fullscreen="fullscreen = !fullscreen"
      />
    </div>
  </Teleport>
</template>
