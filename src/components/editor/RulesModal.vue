<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const props = defineProps<{
  rules: string
  solveMessage: string
}>()

const emit = defineEmits<{
  'update:rules': [value: string]
  'update:solveMessage': [value: string]
  close: []
}>()

const tab = ref<'rules' | 'solve'>('rules')
// Edit buffers so Cancel discards changes; both stay mounted via v-show.
const rulesDraft = ref(props.rules)
const solveDraft = ref(props.solveMessage)

const TAB = 'px-3 py-1.5 text-sm rounded-lg transition-colors'

function save() {
  emit('update:rules', rulesDraft.value.trim())
  emit('update:solveMessage', solveDraft.value.trim())
  emit('close')
}
</script>

<template>
  <BaseModal
    size="xl"
    card-class="p-6 gap-4"
    @close="emit('close')"
  >
    <div class="flex gap-1">
      <button
        :class="[TAB, tab === 'rules' ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text']"
        @click="tab = 'rules'"
      >
        Rules
      </button>
      <button
        :class="[TAB, tab === 'solve' ? 'bg-action-tint text-action font-medium' : 'text-soft hover:text-ink-text']"
        @click="tab = 'solve'"
      >
        Solve Message
      </button>
    </div>
    <textarea
      v-show="tab === 'rules'"
      v-model="rulesDraft"
      rows="13"
      placeholder="Describe how this puzzle is solved — normal sudoku rules plus any variant constraints…"
      class="w-full text-sm px-3 py-2 rounded-lg border border-line bg-surface text-ink-text leading-relaxed focus:outline-none focus:border-action resize-y"
    />
    <textarea
      v-show="tab === 'solve'"
      v-model="solveDraft"
      rows="13"
      placeholder="Shown when the puzzle is solved (leave blank for the default). Handy for puzzle-hunt clues — it stays hidden until a correct solve."
      class="w-full text-sm px-3 py-2 rounded-lg border border-line bg-surface text-ink-text leading-relaxed focus:outline-none focus:border-action resize-y"
    />
    <div class="flex gap-2 justify-end">
      <button
        class="px-4 py-1.5 rounded-lg text-sm text-soft hover:bg-paper transition-colors"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 rounded-lg text-sm bg-action text-white hover:bg-action-deep transition-colors"
        @click="save"
      >
        Save
      </button>
    </div>
  </BaseModal>
</template>
