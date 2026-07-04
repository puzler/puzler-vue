<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

// Mobile presentation of the raw JSON editor: a full-screen sheet. BaseModal
// registers with the modal stack, so grid keys are dead while it's open and
// Escape closes it. No fullscreen toggle — the sheet already is one.
const PuzzleJsonEditor = defineAsyncComponent(() => import('./PuzzleJsonEditor.vue'))

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal
    variant="sheet"
    size="3xl"
    @close="emit('close')"
  >
    <!-- Full height on mobile; a fixed tall card on the sm–md band where the
         sheet renders as a centered card (h-auto would collapse the editor). -->
    <div class="h-full sm:h-[80vh] flex flex-col min-h-0">
      <PuzzleJsonEditor
        :show-fullscreen-toggle="false"
        @close="emit('close')"
      />
    </div>
  </BaseModal>
</template>
