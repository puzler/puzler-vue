<script setup lang="ts">
import { ref } from 'vue'
import { usePuzzleStore } from '@/stores/puzzle'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiTrayArrowUp, mdiTrayArrowDown, mdiHistory, mdiShareVariantOutline } from '@mdi/js'
import ExportModal from './ExportModal.vue'
import ImportModal from './ImportModal.vue'
import VersionHistoryModal from './VersionHistoryModal.vue'
import PublishModal from './PublishModal.vue'
import SaveButton from './SaveButton.vue'

const puzzle = usePuzzleStore()

const showExport = ref(false)
const showImport = ref(false)
const showVersions = ref(false)
const showPublish = ref(false)

const ICON_BTN = 'w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-line text-soft hover:text-action hover:border-action transition-colors'
</script>

<template>
  <div class="flex items-center justify-end gap-1.5">
    <button
      title="Version history"
      aria-label="Version history"
      :class="ICON_BTN"
      @click="showVersions = true"
    >
      <MdiIcon
        :path="mdiHistory"
        :size="18"
      />
    </button>
    <button
      title="Import puzzle JSON"
      aria-label="Import puzzle JSON"
      :class="ICON_BTN"
      @click="showImport = true"
    >
      <MdiIcon
        :path="mdiTrayArrowDown"
        :size="18"
      />
    </button>
    <button
      title="Export"
      aria-label="Export"
      :class="ICON_BTN"
      @click="showExport = true"
    >
      <MdiIcon
        :path="mdiTrayArrowUp"
        :size="18"
      />
    </button>
    <button
      v-if="puzzle.serverPuzzleId"
      title="Publish & share"
      aria-label="Publish and share"
      :class="ICON_BTN"
      @click="showPublish = true"
    >
      <MdiIcon
        :path="mdiShareVariantOutline"
        :size="18"
      />
    </button>
    <SaveButton />

    <ExportModal
      v-if="showExport"
      @close="showExport = false"
    />
    <ImportModal
      v-if="showImport"
      @close="showImport = false"
    />
    <VersionHistoryModal
      v-if="showVersions"
      @close="showVersions = false"
    />
    <PublishModal
      v-if="showPublish"
      @close="showPublish = false"
    />
  </div>
</template>
