<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePuzzleStore } from '@/stores/puzzle'
import BaseModal from '@/components/ui/BaseModal.vue'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiRestore, mdiPencilOutline, mdiTrashCanOutline, mdiCheckCircle, mdiStarCircle } from '@mdi/js'

const emit = defineEmits<{ close: [] }>()

const puzzle = usePuzzleStore()
const busy = ref(false)
const error = ref<string | null>(null)

// Newest first for browsing.
const ordered = computed(() => [...puzzle.versions].reverse())

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

async function run(action: () => Promise<unknown>) {
  busy.value = true
  error.value = null
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}

function restore(id: string) {
  run(() => puzzle.restoreVersion(id))
}

function remove(id: string) {
  run(() => puzzle.deleteVersion(id))
}

function rename(id: string, current: string | null) {
  const next = window.prompt('Version name (leave blank to reset to default)', current ?? '')
  if (next === null) return
  run(() => puzzle.renameVersion(id, next.trim() || null))
}
</script>

<template>
  <BaseModal
    size="sm"
    card-class="p-6 gap-4"
    @close="emit('close')"
  >
    <span class="text-sm font-semibold text-ink-text">Version history</span>

    <p
      v-if="error"
      class="text-xs text-red-600"
    >
      {{ error }}
    </p>

    <p
      v-if="!ordered.length"
      class="text-sm text-faint"
    >
      No saved versions yet. Hit Save to create v1.
    </p>

    <ul
      v-else
      class="flex flex-col gap-2 overflow-y-auto"
    >
      <li
        v-for="version in ordered"
        :key="version.id"
        class="flex items-center gap-2 px-3 py-2 rounded-xl border"
        :class="version.id === puzzle.currentVersionId
          ? 'border-action bg-action-tint'
          : 'border-line'"
      >
        <div class="flex flex-col min-w-0 flex-1">
          <span class="text-sm font-medium text-ink-text truncate flex items-center gap-1">
            {{ version.displayName }}
            <MdiIcon
              v-if="version.isPublished"
              :path="mdiStarCircle"
              :size="14"
              class="text-action shrink-0"
              title="Published version"
            />
            <MdiIcon
              v-else-if="version.id === puzzle.currentVersionId"
              :path="mdiCheckCircle"
              :size="14"
              class="text-action shrink-0"
              title="Currently loaded"
            />
          </span>
          <span class="text-xs text-faint">{{ formatDate(version.createdAt) }}</span>
        </div>

        <button
          title="Restore into editor"
          aria-label="Restore"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-soft hover:text-action hover:bg-action-tint transition-colors disabled:opacity-40"
          :disabled="busy"
          @click="restore(version.id)"
        >
          <MdiIcon
            :path="mdiRestore"
            :size="16"
          />
        </button>
        <button
          title="Rename"
          aria-label="Rename"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-soft hover:text-action hover:bg-action-tint transition-colors disabled:opacity-40"
          :disabled="busy"
          @click="rename(version.id, version.label ?? null)"
        >
          <MdiIcon
            :path="mdiPencilOutline"
            :size="16"
          />
        </button>
        <button
          title="Delete"
          aria-label="Delete"
          class="w-7 h-7 flex items-center justify-center rounded-lg text-soft hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30"
          :disabled="busy || version.isPublished"
          @click="remove(version.id)"
        >
          <MdiIcon
            :path="mdiTrashCanOutline"
            :size="16"
          />
        </button>
      </li>
    </ul>
  </BaseModal>
</template>
