<script setup lang="ts">
import { computed } from 'vue'

// Round avatar: the uploaded/OAuth image when present, else a single-initial
// fallback. Sizable so it works as a nav chip, a comment byline, or a large
// profile header. Extracted from the settings AvatarUploader so every surface
// renders avatars identically.
const props = withDefaults(defineProps<{
  avatarUrl?: string | null
  displayName: string
  size?: number
}>(), { avatarUrl: null, size: 64 })

const dimension = computed(() => `${props.size}px`)
const initial = computed(() => props.displayName.charAt(0).toUpperCase())
// A single initial reads well at roughly 40% of the diameter.
const fontSize = computed(() => `${Math.round(props.size * 0.4)}px`)
</script>

<template>
  <img
    v-if="avatarUrl"
    :src="avatarUrl"
    :alt="displayName"
    class="rounded-full object-cover border border-line bg-surface shrink-0"
    :style="{ width: dimension, height: dimension }"
  >
  <div
    v-else
    class="rounded-full bg-surface border border-line flex items-center justify-center font-display font-semibold text-soft shrink-0 select-none"
    :style="{ width: dimension, height: dimension, fontSize }"
    aria-hidden="true"
  >
    {{ initial }}
  </div>
</template>
