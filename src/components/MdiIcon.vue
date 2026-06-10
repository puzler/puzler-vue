<script setup lang="ts">
defineProps<{
  path: string
  color?: string
  rotate?: number
  size?: number
}>()
</script>

<template>
  <svg
    :width="size ?? 16"
    :height="size ?? 16"
    viewBox="0 0 24 24"
    :style="{
      fill: color ?? 'currentColor',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      flexShrink: 0,
    }"
  >
    <path :d="path" />
  </svg>
</template>
