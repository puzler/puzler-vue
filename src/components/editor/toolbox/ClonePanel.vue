<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

const editor = useEditorStore()

const MODES = [
  { key: 'paint', label: 'Paint' },
  { key: 'clone', label: 'Clone' },
]
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Clones
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveCloneMode"
        @select="editor.setCloneMode($event as 'paint' | 'clone')"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        Linked groups must contain identical digits in the same layout
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Paint: drag to paint a group · click a group to remove it
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Clone: drag from a group to place a copy · drag a copy to move it · originals show darker · holding Shift switches to Clone
      </p>
    </div>
  </div>
</template>
