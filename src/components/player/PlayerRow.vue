<script setup lang="ts">
// One roster row: color swatch, name (with inline self-rename), Host badge, and a
// kick affordance the host sees on other players' rows.
import { ref } from 'vue'
import { mdiPencil, mdiClose, mdiCheck } from '@mdi/js'
import MdiIcon from '@/components/MdiIcon.vue'
import type { PresenceMember } from '@/stores/presence'

const props = defineProps<{ member: PresenceMember; isSelf: boolean; color: string; canKick: boolean }>()
const emit = defineEmits<{ rename: [name: string]; kick: [] }>()

const renaming = ref(false)
const draft = ref('')
function start(): void {
  draft.value = props.member.displayName
  renaming.value = true
}
function save(): void {
  emit('rename', draft.value)
  renaming.value = false
}
</script>

<template>
  <li class="flex items-center gap-2 px-1.5 py-1 rounded-lg">
    <span
      class="w-2.5 h-2.5 rounded-full shrink-0"
      :style="{ backgroundColor: color }"
    />
    <template v-if="isSelf && renaming">
      <input
        v-model="draft"
        maxlength="40"
        class="flex-1 min-w-0 text-sm bg-canvas border border-line rounded px-1.5 py-0.5 text-ink-text"
        @keyup.enter="save"
      >
      <button
        type="button"
        aria-label="Save name"
        class="shrink-0 text-soft hover:text-action"
        @click="save"
      >
        <MdiIcon
          :path="mdiCheck"
          :size="15"
        />
      </button>
    </template>
    <template v-else>
      <span class="flex-1 min-w-0 truncate text-sm text-ink-text">
        {{ member.displayName }}<span
          v-if="isSelf"
          class="text-faint"
        > (you)</span>
      </span>
      <span
        v-if="member.isHost"
        class="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-action-tint text-action"
      >Host</span>
      <button
        v-if="isSelf"
        type="button"
        aria-label="Rename yourself"
        class="shrink-0 text-faint hover:text-action"
        @click="start"
      >
        <MdiIcon
          :path="mdiPencil"
          :size="13"
        />
      </button>
      <button
        v-else-if="canKick"
        type="button"
        aria-label="Remove player"
        class="shrink-0 text-faint hover:text-red-500"
        @click="emit('kick')"
      >
        <MdiIcon
          :path="mdiClose"
          :size="14"
        />
      </button>
    </template>
  </li>
</template>
