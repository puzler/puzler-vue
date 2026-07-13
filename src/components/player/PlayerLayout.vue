<script setup lang="ts">
import PlayerMobileLayout from '@/components/player/PlayerMobileLayout.vue'
import PlayerDesktopLayout from '@/components/player/PlayerDesktopLayout.vue'

// Thin switcher between the mobile and desktop solver chrome, so the player
// view carries the shared prop/event plumbing once. `rules` is desktop-only
// (mobile opens the rules modal from its action rail instead).
defineProps<{
  isMobile: boolean
  title: string
  author: { username: string; displayName: string } | null
  authorName: string | null
  rules: string
  showTimer: boolean
  elapsedLabel: string
  paused: boolean
  collaborationEnabled: boolean
  checkLabel?: string
}>()

defineEmits<{ 'toggle-pause': []; 'reset': []; 'show-rules': []; 'check': []; 'settings': []; 'collaborate': [] }>()
</script>

<template>
  <PlayerMobileLayout
    v-if="isMobile"
    :title="title"
    :author="author"
    :author-name="authorName"
    :show-timer="showTimer"
    :elapsed-label="elapsedLabel"
    :paused="paused"
    :collaboration-enabled="collaborationEnabled"
    :check-label="checkLabel"
    @toggle-pause="$emit('toggle-pause')"
    @reset="$emit('reset')"
    @show-rules="$emit('show-rules')"
    @check="$emit('check')"
    @settings="$emit('settings')"
    @collaborate="$emit('collaborate')"
  />

  <PlayerDesktopLayout
    v-else
    :title="title"
    :author="author"
    :author-name="authorName"
    :rules="rules"
    :show-timer="showTimer"
    :elapsed-label="elapsedLabel"
    :paused="paused"
    :collaboration-enabled="collaborationEnabled"
    :check-label="checkLabel"
    @toggle-pause="$emit('toggle-pause')"
    @reset="$emit('reset')"
    @show-rules="$emit('show-rules')"
    @check="$emit('check')"
    @settings="$emit('settings')"
    @collaborate="$emit('collaborate')"
  />
</template>
