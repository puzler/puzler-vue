<script setup lang="ts">
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiLockOutline } from '@mdi/js'

// Table of contents for a collection's titled story pages. Unlocked chapters
// jump to their anchor; locked ones show but don't link (no spoiler text, the
// title itself is the author's choice to reveal).
defineProps<{ items: { id: string; title: string; unlocked: boolean }[] }>()
</script>

<template>
  <nav class="mt-4 rounded-xl border border-line bg-surface p-4">
    <h2 class="text-[11px] font-semibold uppercase tracking-widest text-soft mb-2">
      Contents
    </h2>
    <ol class="flex flex-col gap-1">
      <li
        v-for="item in items"
        :key="item.id"
      >
        <a
          v-if="item.unlocked"
          :href="`#story-${item.id}`"
          class="text-sm text-action hover:underline"
        >{{ item.title }}</a>
        <span
          v-else
          class="inline-flex items-center gap-1.5 text-sm text-faint"
        >
          <MdiIcon
            :path="mdiLockOutline"
            :size="13"
          />
          {{ item.title }}
        </span>
      </li>
    </ol>
  </nav>
</template>
