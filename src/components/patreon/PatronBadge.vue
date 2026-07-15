<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiHeartOutline, mdiLockOutline } from '@mdi/js'

// Tiny pill marking patron-only content on cards and rows. `locked` renders
// the muted lock treatment (viewer can't open it yet); the default accent
// variant marks patron content the viewer has access to.
defineProps<{ locked?: boolean }>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
    :class="locked ? 'bg-line/60 text-faint' : 'bg-action-tint text-action'"
  >
    <MdiIcon
      :path="locked ? mdiLockOutline : mdiHeartOutline"
      :size="11"
    />
    Patrons
  </span>
</template>
